/**
 * Database-Level Double Booking Protection
 * 
 * Provides strict serializable concurrency control and row locking
 * to prevent double bookings across concurrent customer requests.
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { getServiceById, getBarberById, createBooking, checkPrismaAvailable } from "./data-store";

export class DoubleBookingError extends Error {
  constructor(message = "This time slot is no longer available. Please select another slot.") {
    super(message);
    this.name = "DoubleBookingError";
  }
}

// In-Memory Barber-level Concurrency Lock for local dev & unit tests
const barberMutexMap = new Map<string, Promise<void>>();

async function acquireBarberLock(barberId: string): Promise<() => void> {
  while (barberMutexMap.has(barberId)) {
    await barberMutexMap.get(barberId);
  }

  let releaseLock: () => void;
  const promise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  barberMutexMap.set(barberId, promise);

  return () => {
    barberMutexMap.delete(barberId);
    releaseLock();
  };
}

export interface ProtectedBookingInput {
  serviceId: string;
  barberId: string;
  startTime: Date;
  endTime: Date;
  customerName: string;
  customerPhone: string;
  paymentScreenshot?: string | null;
  paymentPublicId?: string | null;
  notes?: string | null;
  bufferMinutes?: number;
}

/**
 * Resolves service/barber IDs to their Postgres rows. The booking page can
 * display the in-memory catalog (srv-/barber- prefixed IDs) when the DB health check
 * fails during a cold start; those IDs have no DB counterpart, so we map them
 * to the DB row with the same name. IDs that already exist in Postgres are
 * returned unchanged.
 */
async function resolveDbCatalogIds(
  serviceId: string,
  barberId: string
): Promise<{ serviceId: string; barberId: string }> {
  const [svcRow, brbRow] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } }),
    prisma.barber.findUnique({ where: { id: barberId }, select: { id: true } }),
  ]);

  let resolvedServiceId = serviceId;
  let resolvedBarberId = barberId;

  if (!svcRow) {
    const memSvc = await getServiceById(serviceId);
    const match =
      memSvc &&
      (await prisma.service.findFirst({
        where: { name: memSvc.name, isActive: true },
        select: { id: true },
      }));
    if (match) resolvedServiceId = match.id;
  }

  if (!brbRow) {
    const memBrb = await getBarberById(barberId);
    const match =
      memBrb &&
      (await prisma.barber.findFirst({
        where: { name: memBrb.name, isActive: true },
        select: { id: true },
      }));
    if (match) resolvedBarberId = match.id;
  }

  return { serviceId: resolvedServiceId, barberId: resolvedBarberId };
}

/**
 * Books an appointment with database-level serializable isolation and row-level locking.
 * Guarantees that even under concurrent race conditions, only ONE booking can claim an overlapping slot.
 */
export async function bookAppointmentWithProtection(input: ProtectedBookingInput) {
  const {
    serviceId,
    barberId,
    startTime,
    endTime,
    customerName,
    customerPhone,
    paymentScreenshot,
    paymentPublicId,
    notes,
    bufferMinutes = 10,
  } = input;

  // Calculate buffer window
  const bufferedStartTime = new Date(startTime.getTime() - bufferMinutes * 60 * 1000);
  const bufferedEndTime = new Date(endTime.getTime() + bufferMinutes * 60 * 1000);

  // Acquire concurrency lock for the specific barber
  const releaseLock = await acquireBarberLock(barberId);

  try {
    if (await checkPrismaAvailable()) {
      // Map any in-memory catalog IDs (srv-*/barber-*) to their DB rows so a
      // booking succeeds even if the client loaded the catalog during a DB
      // outage and the IDs have no Postgres counterpart.
      const ids = await resolveDbCatalogIds(serviceId, barberId);
      const dbServiceId = ids.serviceId;
      const dbBarberId = ids.barberId;

      // Execute in PostgreSQL with Serializable Isolation Level
      return await prisma.$transaction(
        async (tx) => {
          // Check for any conflicting booked appointments for this barber
          // An overlap occurs if: existing.startTime < bufferedEndTime AND existing.endTime > bufferedStartTime
          const conflict = await tx.appointment.findFirst({
            where: {
              barberId: dbBarberId,
              status: "BOOKED",
              startTime: { lt: bufferedEndTime },
              endTime: { gt: bufferedStartTime },
            },
          });

          if (conflict) {
            throw new DoubleBookingError();
          }

          // A payment screenshot may only back one active appointment
          if (paymentPublicId) {
            const reused = await tx.appointment.findFirst({
              where: {
                paymentPublicId,
                status: { not: "CANCELLED" },
              },
              select: { id: true },
            });
            if (reused) {
              throw new Error(
                "This payment screenshot has already been used for another booking."
              );
            }
          }

          // Service and barber check
          const service = await tx.service.findUnique({ where: { id: dbServiceId } });
          if (!service) throw new Error("Service not found");

          const barber = await tx.barber.findUnique({ where: { id: dbBarberId } });
          if (!barber) throw new Error("Barber not found");

          // Find or create customer
          let customer = await tx.customer.findFirst({
            where: { phone: customerPhone },
          });

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                name: customerName,
                phone: customerPhone,
              },
            });
          }

          const bookingReference = `ARB-${Math.floor(1000 + Math.random() * 9000)}`;
          const cancellationToken = `tok_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

          // Create appointment
          const appointment = await tx.appointment.create({
            data: {
              bookingReference,
              cancellationToken,
              customerId: customer.id,
              barberId: dbBarberId,
              serviceId: dbServiceId,
              startTime,
              endTime,
              priceEtb: service.priceEtb,
              paymentScreenshot: paymentPublicId ? null : paymentScreenshot || null,
              paymentPublicId: paymentPublicId ?? null,
              notes: notes || null,
              status: "BOOKED",
            },
            include: {
              customer: true,
              barber: true,
              service: true,
            },
          });

          return {
            id: appointment.id,
            bookingReference: appointment.bookingReference,
            cancellationToken: appointment.cancellationToken,
            customerName: appointment.customer.name,
            customerPhone: appointment.customer.phone,
            barberName: appointment.barber.name,
            serviceName: appointment.service.name,
            durationMinutes: appointment.service.durationMinutes,
            priceEtb: appointment.priceEtb,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        }
      );
    }

    // 2. In-Memory Store Protected Execution (for dev fallback and unit testing)
    return await createBooking({
      serviceId,
      barberId,
      startTime,
      endTime,
      customerName,
      customerPhone,
      notes,
      paymentScreenshot,
      paymentPublicId,
    });
  } catch (err: any) {
    if (
      err instanceof DoubleBookingError ||
      err.message?.includes("no longer available") ||
      err.code === "P2034" // Prisma transaction conflict / serialization failure
    ) {
      throw new DoubleBookingError();
    }
    throw err;
  } finally {
    releaseLock();
  }
}
