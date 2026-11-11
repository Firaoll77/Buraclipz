/**
 * Data Store Layer for Addis Ababa Barbershop
 * 
 * Works with PostgreSQL Prisma Client when connected.
 * Falls back seamlessly to seed dataset in local dev/demo mode
 * so the booking flow can be tested in the browser without database setup.
 */

import fs from "fs";
import path from "path";
import { prisma } from "./prisma";

export interface BarberData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  color?: string | null;
  isActive: boolean;
}

export interface ServiceData {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceEtb: number;
  isActive: boolean;
}

export interface WorkingHoursData {
  id: string;
  barberId: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}

export interface AppointmentData {
  id: string;
  bookingReference: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  telegramChatId?: string | null;
  barberId: string;
  barberName?: string;
  barberColor?: string | null;
  serviceId: string;
  serviceName?: string;
  durationMinutes?: number;
  startTime: Date;
  endTime: Date;
  status: "BOOKED" | "CANCELLED" | "COMPLETED";
  priceEtb: number;
  notes?: string | null;
  cancellationToken: string;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  paymentScreenshot?: string | null;
}

// In-Memory Seed Data Fallback
const MEMORY_BARBERS: BarberData[] = [
  {
    id: "barber-dawit",
    name: "Dawit Tadesse",
    phone: "+251911223344",
    email: "dawit@arada-barber.et",
    bio: "Master Barber with 8+ years specializing in classic scissors cuts, fades, and traditional grooming.",
    avatarUrl: "/images/barbers/dawit.jpg",
    color: "#ff9800",
    isActive: true,
  },
  {
    id: "barber-yohannes",
    name: "Yohannes Bekele",
    phone: "+251922334455",
    email: "yohannes@arada-barber.et",
    bio: "Razor fade expert and precision beard sculpting master.",
    avatarUrl: "/images/barbers/yohannes.jpg",
    color: "#fdd835",
    isActive: true,
  },
  {
    id: "barber-abel",
    name: "Abel Girma",
    phone: "+251933445566",
    email: "abel@arada-barber.et",
    bio: "Modern styling specialist, hot towel treatment and head massage professional.",
    avatarUrl: "/images/barbers/abel.jpg",
    color: "#4fc3f7",
    isActive: true,
  },
];

const MEMORY_SERVICES: ServiceData[] = [
  {
    id: "srv-taper",
    name: "Taper",
    description: "Smooth fade only on the sideburns and back of the neck, keeping length on the sides.",
    durationMinutes: 40,
    priceEtb: 350,
    isActive: true,
  },
  {
    id: "srv-fade",
    name: "Fade",
    description: "Smooth transition from long hair on top down to skin on the sides and back.",
    durationMinutes: 40,
    priceEtb: 350,
    isActive: true,
  },
  {
    id: "srv-clean-cut",
    name: "Clean Cut",
    description: "Simple, neat trim all around with a clean neck line and a tidy finish.",
    durationMinutes: 35,
    priceEtb: 350,
    isActive: true,
  },
  {
    id: "srv-line-up",
    name: "Line Up",
    description: "Sharp razor outline to make your hairline, temples, and neck look straight and neat.",
    durationMinutes: 25,
    priceEtb: 350,
    isActive: true,
  },
];

// Default shop hours: Mon-Sat 09:00 - 20:00 (Break 13:00 - 14:00), Sun 10:00 - 18:00
const MEMORY_WORKING_HOURS: WorkingHoursData[] = [];
for (const b of MEMORY_BARBERS) {
  for (let day = 0; day <= 6; day++) {
    const isDayOff = (b.id === "barber-dawit" && day === 1) || (b.id === "barber-abel" && day === 0);
    MEMORY_WORKING_HOURS.push({
      id: `wh-${b.id}-${day}`,
      barberId: b.id,
      dayOfWeek: day,
      isOpen: !isDayOff,
      startTime: day === 0 ? "10:00" : "09:00",
      endTime: day === 0 ? "18:00" : "20:00",
      breakStartTime: "13:00",
      breakEndTime: "14:00",
    });
  }
}

// Default demo appointments fallback
const DEFAULT_DEMO_APPOINTMENTS: AppointmentData[] = [
  {
    id: "appt-demo-1",
    bookingReference: "ARB-1001",
    customerId: "cust-haile",
    customerName: "Dawit Tadesse",
    customerPhone: "+251911223344",
    customerEmail: null,
    telegramChatId: null,
    barberId: "barber-dawit",
    barberName: "Dawit Tadesse",
    serviceId: "srv-classic-cut",
    serviceName: "Classic Haircut",
    durationMinutes: 40,
    startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000), // 2 days from now
    endTime: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 40 * 60 * 1000),
    status: "BOOKED",
    priceEtb: 350,
    notes: "First time customer",
    cancellationToken: "token-demo-haile-1001",
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentScreenshot: null,
  },
  {
    id: "appt-demo-2",
    bookingReference: "ARB-1002",
    customerId: "cust-test",
    customerName: "Test Customer",
    customerPhone: "+251922334455",
    customerEmail: null,
    telegramChatId: null,
    barberId: "barber-dawit",
    barberName: "Dawit Tadesse",
    serviceId: "srv-fade-cut",
    serviceName: "Skin Fade & Lineup",
    durationMinutes: 45,
    startTime: new Date(Date.now() + 3 * 24 * 3600 * 1000), // 3 days from now
    endTime: new Date(Date.now() + 3 * 24 * 3600 * 1000 + 45 * 60 * 1000),
    status: "BOOKED",
    priceEtb: 400,
    notes: "Demo booking",
    cancellationToken: "token-demo-test-1002",
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentScreenshot: null,
  },
  {
    id: "appt-demo-3",
    bookingReference: "ARB-1003",
    customerId: "cust-demo3",
    customerName: "Bekele Alemu",
    customerPhone: "+251933445566",
    customerEmail: null,
    telegramChatId: null,
    barberId: "barber-dawit",
    barberName: "Dawit Tadesse",
    serviceId: "srv-classic-cut",
    serviceName: "Classic Haircut",
    durationMinutes: 40,
    startTime: new Date(Date.now() + 4 * 24 * 3600 * 1000), // 4 days from now
    endTime: new Date(Date.now() + 4 * 24 * 3600 * 1000 + 40 * 60 * 1000),
    status: "BOOKED",
    priceEtb: 350,
    notes: "Regular customer",
    cancellationToken: "token-demo-bekele-1003",
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentScreenshot: null,
  },
  {
    id: "appt-demo-4",
    bookingReference: "ARB-1004",
    customerId: "cust-demo4",
    customerName: "Abebech Belay",
    customerPhone: "+251944556677",
    customerEmail: null,
    telegramChatId: null,
    barberId: "barber-abel",
    barberName: "Abel Girma",
    serviceId: "srv-fade-cut",
    serviceName: "Skin Fade & Lineup",
    durationMinutes: 45,
    startTime: new Date(Date.now() + 5 * 24 * 3600 * 1000), // 5 days from now
    endTime: new Date(Date.now() + 5 * 24 * 3600 * 1000 + 45 * 60 * 1000),
    status: "BOOKED",
    priceEtb: 400,
    notes: "New customer",
    cancellationToken: "token-demo-abebech-1004",
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentScreenshot: null,
  },
];

const DATA_DIR = path.join(process.cwd(), ".data");
const APPOINTMENTS_FILE = path.join(DATA_DIR, "appointments.json");
const SERVICES_FILE = path.join(DATA_DIR, "services.json");

function loadStoredAppointments(): AppointmentData[] {
  if (process.env.NODE_ENV === "test") return [...DEFAULT_DEMO_APPOINTMENTS];
  try {
    if (fs.existsSync(APPOINTMENTS_FILE)) {
      const content = fs.readFileSync(APPOINTMENTS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((a: any) => ({
          ...a,
          startTime: new Date(a.startTime),
          endTime: new Date(a.endTime),
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt || a.createdAt),
          cancelledAt: a.cancelledAt ? new Date(a.cancelledAt) : null,
        }));
      }
    }
  } catch (err) {
    console.error("Failed to load appointments from disk:", err);
  }
  return [...DEFAULT_DEMO_APPOINTMENTS];
}

function loadStoredServices(): ServiceData[] {
  if (process.env.NODE_ENV === "test") return [...MEMORY_SERVICES];
  try {
    if (fs.existsSync(SERVICES_FILE)) {
      const content = fs.readFileSync(SERVICES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load services from disk:", err);
  }
  return [...MEMORY_SERVICES];
}

// Global store to ensure ALL route handlers and hot-reloads share the same in-memory array
const globalForStore = globalThis as unknown as {
  __inMemoryAppointments?: AppointmentData[];
  __inMemoryServices?: ServiceData[];
  __isPrismaAvailable?: boolean | null;
  __lastPrismaCheck?: number;
};

if (!globalForStore.__inMemoryAppointments) {
  globalForStore.__inMemoryAppointments = loadStoredAppointments();
}

if (!globalForStore.__inMemoryServices) {
  globalForStore.__inMemoryServices = loadStoredServices();
}

export const inMemoryAppointments: AppointmentData[] = globalForStore.__inMemoryAppointments;
export const inMemoryServices: ServiceData[] = globalForStore.__inMemoryServices;

export function saveStoredAppointments() {
  if (process.env.NODE_ENV === "test") return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      APPOINTMENTS_FILE,
      JSON.stringify(inMemoryAppointments, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Failed to save appointments to disk:", err);
  }
}

export function saveStoredServices() {
  if (process.env.NODE_ENV === "test") return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      SERVICES_FILE,
      JSON.stringify(inMemoryServices, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Failed to save services to disk:", err);
  }
}

export async function checkPrismaAvailable(): Promise<boolean> {
  const now = Date.now();
  if (
    globalForStore.__isPrismaAvailable === false &&
    globalForStore.__lastPrismaCheck &&
    now - globalForStore.__lastPrismaCheck < 30000
  ) {
    return false;
  }
  if (globalForStore.__isPrismaAvailable === true) return true;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB check timeout")), 1500)),
    ]);
    globalForStore.__isPrismaAvailable = true;
    return true;
  } catch {
    globalForStore.__isPrismaAvailable = false;
    globalForStore.__lastPrismaCheck = now;
    return false;
  }
}

const TARGET_HAIRCUTS = [
  {
    name: "Taper",
    description: "Smooth fade only on the sideburns and back of the neck, keeping length on the sides.",
    durationMinutes: 40,
    priceEtb: 350,
  },
  {
    name: "Fade",
    description: "Smooth transition from long hair on top down to skin on the sides and back.",
    durationMinutes: 40,
    priceEtb: 350,
  },
  {
    name: "Clean Cut",
    description: "Simple, neat trim all around with a clean neck line and a tidy finish.",
    durationMinutes: 35,
    priceEtb: 350,
  },
  {
    name: "Line Up",
    description: "Sharp razor outline to make your hairline, temples, and neck look straight and neat.",
    durationMinutes: 25,
    priceEtb: 350,
  },
];

const TARGET_HAIRCUT_NAMES = TARGET_HAIRCUTS.map((h) => h.name);

function sortServices(services: ServiceData[]): ServiceData[] {
  return [...services].sort((a, b) => {
    const idxA = TARGET_HAIRCUT_NAMES.indexOf(a.name);
    const idxB = TARGET_HAIRCUT_NAMES.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.priceEtb - b.priceEtb;
  });
}

async function syncDbServicesIfNeeded() {
  try {
    const existingActive = await prisma.service.findMany({ where: { isActive: true } });
    const hasObsoleteActive = existingActive.some(
      (s) => !TARGET_HAIRCUT_NAMES.includes(s.name)
    );
    const hasAllTargets = TARGET_HAIRCUT_NAMES.every((name) =>
      existingActive.some((s) => s.name === name)
    );

    // If only the target haircuts are active and present, no DB changes needed
    if (!hasObsoleteActive && hasAllTargets) {
      return;
    }

    // 1. Deactivate old services (e.g. Beard Sculpting, Classic Haircut, etc.) that are not in target haircuts
    await prisma.service.updateMany({
      where: {
        name: { notIn: TARGET_HAIRCUT_NAMES },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // 2. Fetch all services to see if any match the target haircuts by name
    const allExisting = await prisma.service.findMany();

    for (const hc of TARGET_HAIRCUTS) {
      const match = allExisting.find(
        (s) => s.name.trim().toLowerCase() === hc.name.trim().toLowerCase()
      );
      if (match) {
        await prisma.service.update({
          where: { id: match.id },
          data: {
            name: hc.name,
            description: hc.description,
            durationMinutes: hc.durationMinutes,
            priceEtb: hc.priceEtb,
            isActive: true,
          },
        });
      } else {
        await prisma.service.create({
          data: {
            name: hc.name,
            description: hc.description,
            durationMinutes: hc.durationMinutes,
            priceEtb: hc.priceEtb,
            isActive: true,
          },
        });
      }
    }
  } catch (err) {
    console.error("Failed to auto-sync services to database:", err);
  }
}

export async function getAllServices(): Promise<ServiceData[]> {
  if (await checkPrismaAvailable()) {
    try {
      await syncDbServicesIfNeeded();
      const services = await prisma.service.findMany({
        where: { isActive: true },
      });
      if (services.length > 0) return sortServices(services);
    } catch {
      // fallback
    }
  }
  return sortServices(inMemoryServices.filter((s) => s.isActive));
}

export async function getAllServicesForAdmin(): Promise<ServiceData[]> {
  if (await checkPrismaAvailable()) {
    try {
      await syncDbServicesIfNeeded();
      const services = await prisma.service.findMany({
        orderBy: { priceEtb: "asc" },
      });
      if (services.length > 0) return sortServices(services);
    } catch {
      // fallback
    }
  }
  return sortServices(inMemoryServices);
}

export async function getServiceById(id: string): Promise<ServiceData | null> {
  if (await checkPrismaAvailable()) {
    try {
      const s = await prisma.service.findUnique({ where: { id } });
      if (s) return s;
    } catch {
      // fallback
    }
  }
  return inMemoryServices.find((s) => s.id === id) || null;
}

export async function updateService(
  id: string,
  data: Partial<Omit<ServiceData, "id">>
): Promise<ServiceData | null> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.durationMinutes !== undefined) updateData.durationMinutes = Math.round(Number(data.durationMinutes));
  if (data.priceEtb !== undefined) updateData.priceEtb = Math.round(Number(data.priceEtb));
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  if (await checkPrismaAvailable()) {
    try {
      const updated = await prisma.service.update({
        where: { id },
        data: updateData,
      });
      const idx = inMemoryServices.findIndex((s) => s.id === id);
      if (idx !== -1) {
        Object.assign(inMemoryServices[idx], updateData);
        saveStoredServices();
      }
      return updated;
    } catch {
      // fallback to in-memory
    }
  }

  const service = inMemoryServices.find((s) => s.id === id);
  if (!service) return null;
  Object.assign(service, updateData);
  saveStoredServices();
  return service;
}

export async function createService(
  data: Omit<ServiceData, "id">
): Promise<ServiceData> {
  const newId = `srv-${Date.now()}`;
  const payload = {
    name: data.name,
    description: data.description ?? null,
    durationMinutes: Math.round(Number(data.durationMinutes)),
    priceEtb: Math.round(Number(data.priceEtb)),
    isActive: data.isActive ?? true,
  };

  if (await checkPrismaAvailable()) {
    try {
      const created = await prisma.service.create({
        data: {
          id: newId,
          ...payload,
        },
      });
      inMemoryServices.push(created);
      saveStoredServices();
      return created;
    } catch {
      // fallback
    }
  }

  const newService: ServiceData = {
    id: newId,
    ...payload,
  };
  inMemoryServices.push(newService);
  saveStoredServices();
  return newService;
}

export async function deleteService(id: string): Promise<boolean> {
  if (await checkPrismaAvailable()) {
    try {
      await prisma.service.delete({ where: { id } });
      const idx = inMemoryServices.findIndex((s) => s.id === id);
      if (idx !== -1) {
        inMemoryServices.splice(idx, 1);
        saveStoredServices();
      }
      return true;
    } catch {
      // If DB error (e.g. linked foreign key appointments), fallback to deactivating
      try {
        await prisma.service.update({
          where: { id },
          data: { isActive: false },
        });
      } catch {}
    }
  }

  const idx = inMemoryServices.findIndex((s) => s.id === id);
  if (idx !== -1) {
    inMemoryServices.splice(idx, 1);
    saveStoredServices();
    return true;
  }
  return false;
}

export async function getAllBarbers(): Promise<BarberData[]> {
  if (await checkPrismaAvailable()) {
    try {
      const barbers = await prisma.barber.findMany({
        where: { isActive: true },
      });
      if (barbers.length > 0) return barbers;
    } catch {
      // fallback
    }
  }
  return MEMORY_BARBERS;
}

export async function getBarberById(id: string): Promise<BarberData | null> {
  if (await checkPrismaAvailable()) {
    try {
      const b = await prisma.barber.findUnique({ where: { id } });
      if (b) return b;
    } catch {
      // fallback
    }
  }
  return MEMORY_BARBERS.find((b) => b.id === id) || null;
}


export async function getBarberWorkingHours(barberId: string, dayOfWeek: number): Promise<WorkingHoursData | null> {
  if (await checkPrismaAvailable()) {
    try {
      const wh = await prisma.workingHours.findUnique({
        where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
      });
      if (wh) return wh;
    } catch {
      // fallback
    }
  }
  return MEMORY_WORKING_HOURS.find((wh) => wh.barberId === barberId && wh.dayOfWeek === dayOfWeek) || null;
}

export async function getBarberAppointmentsForDay(barberId: string, dayStart: Date, dayEnd: Date) {
  if (await checkPrismaAvailable()) {
    try {
      return await prisma.appointment.findMany({
        where: {
          barberId,
          status: "BOOKED",
          startTime: { gte: dayStart, lte: dayEnd },
        },
      });
    } catch {
      // fallback
    }
  }
  return inMemoryAppointments.filter(
    (a) =>
      a.barberId === barberId &&
      a.status === "BOOKED" &&
      a.startTime >= dayStart &&
      a.startTime <= dayEnd
  );
}

export async function getBarberTimeOff(barberId: string, dayStart: Date, dayEnd: Date) {
  if (await checkPrismaAvailable()) {
    try {
      return await prisma.timeOff.findMany({
        where: {
          barberId,
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart },
        },
      });
    } catch {
      // fallback
    }
  }
  return [];
}

/**
 * Creates an appointment with double-booking verification
 */
export async function createBooking(data: {
  serviceId: string;
  barberId: string;
  startTime: Date;
  endTime: Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  telegramChatId?: string | null;
  notes?: string | null;
  paymentScreenshot?: string | null;
}) {
  const service = await getServiceById(data.serviceId);
  if (!service) throw new Error("Selected service not found");

  const barber = await getBarberById(data.barberId);
  if (!barber) throw new Error("Selected barber not found");

  // Generate unique booking reference e.g., ARB-8492
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingReference = `ARB-${randomSuffix}`;
  const cancellationToken = `tok_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

  if (await checkPrismaAvailable()) {
    try {
      // Find or create customer by phone
      let customer = await prisma.customer.findFirst({
        where: { phone: data.customerPhone },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: data.customerName,
            phone: data.customerPhone,
            email: data.customerEmail,
            telegramChatId: data.telegramChatId,
          },
        });
      } else if (data.customerEmail && !customer.email) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { email: data.customerEmail },
        });
      }

      // Check double booking in DB transaction
      const conflicting = await prisma.appointment.findFirst({
        where: {
          barberId: data.barberId,
          status: "BOOKED",
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
      });

      if (conflicting) {
        throw new Error("This time slot is no longer available. Please select another slot.");
      }

      const appointment = await prisma.appointment.create({
        data: {
          bookingReference,
          cancellationToken,
          customerId: customer.id,
          barberId: data.barberId,
          serviceId: data.serviceId,
          startTime: data.startTime,
          endTime: data.endTime,
          priceEtb: service.priceEtb,
          notes: data.notes,
          paymentScreenshot: data.paymentScreenshot,
          status: "BOOKED",
        },
      });

      return {
        id: appointment.id,
        bookingReference: appointment.bookingReference,
        cancellationToken: appointment.cancellationToken,
        customerId: appointment.customerId,
        barberId: appointment.barberId,
        serviceId: appointment.serviceId,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        priceEtb: appointment.priceEtb,
        notes: appointment.notes,
        status: appointment.status,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
      };
    } catch (e: any) {
      if (e.message.includes("no longer available")) throw e;
    }
  }

  // Memory Store Fallback
  const conflict = inMemoryAppointments.find(
    (a) =>
      a.barberId === data.barberId &&
      a.status === "BOOKED" &&
      a.startTime < data.endTime &&
      a.endTime > data.startTime
  );

  if (conflict) {
    throw new Error("This time slot is no longer available. Please select another slot.");
  }

  const newAppt: AppointmentData = {
    id: `appt-${Date.now()}`,
    bookingReference,
    customerId: `cust-${Date.now()}`,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    telegramChatId: data.telegramChatId,
    barberId: barber.id,
    barberName: barber.name,
    serviceId: service.id,
    serviceName: service.name,
    durationMinutes: service.durationMinutes,
    startTime: data.startTime,
    endTime: data.endTime,
    status: "BOOKED",
    priceEtb: service.priceEtb,
    notes: data.notes,
    cancellationToken,
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentScreenshot: data.paymentScreenshot,
  };

  inMemoryAppointments.push(newAppt);
  saveStoredAppointments();
  console.log("Created new in-memory appointment:", newAppt);
  console.log("Total in-memory appointments:", inMemoryAppointments.length);

  return {
    id: newAppt.id,
    bookingReference: newAppt.bookingReference,
    cancellationToken: newAppt.cancellationToken,
    customerName: newAppt.customerName,
    customerPhone: newAppt.customerPhone,
    customerEmail: newAppt.customerEmail,
    telegramChatId: newAppt.telegramChatId,
    barberName: newAppt.barberName,
    serviceName: newAppt.serviceName,
    durationMinutes: service.durationMinutes,
    priceEtb: newAppt.priceEtb,
    startTime: newAppt.startTime,
    endTime: newAppt.endTime,
    status: newAppt.status,
  };
}

export async function getAppointmentByToken(cancellationToken: string): Promise<AppointmentData | null> {
  if (await checkPrismaAvailable()) {
    try {
      const a = await prisma.appointment.findUnique({
        where: { cancellationToken },
        include: { customer: true, barber: true, service: true },
      });
      if (a) {
        return {
          id: a.id,
          bookingReference: a.bookingReference,
          cancellationToken: a.cancellationToken,
          customerId: a.customerId,
          barberId: a.barberId,
          serviceId: a.serviceId,
          priceEtb: a.priceEtb,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status as "BOOKED" | "CANCELLED" | "COMPLETED",
          notes: a.notes,
          cancellationReason: a.cancellationReason,
          cancelledAt: a.cancelledAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        };
      }
    } catch {
      // fallback
    }
  }
  return inMemoryAppointments.find((a) => a.cancellationToken === cancellationToken) || null;
}

export async function cancelAppointmentByToken(
  cancellationToken: string,
  reason?: string
): Promise<AppointmentData> {
  const appt = await getAppointmentByToken(cancellationToken);
  if (!appt) {
    throw new Error("Appointment not found");
  }

  if (appt.status === "CANCELLED") {
    throw new Error("Appointment is already cancelled");
  }

  // 2-Hour Cutoff Validation:
  // Must be at least 2 hours before startTime
  const now = new Date();
  const cutoffTime = new Date(appt.startTime.getTime() - 2 * 60 * 60 * 1000);

  if (now > cutoffTime) {
    throw new Error(
      "Appointments cannot be cancelled within 2 hours of the scheduled time. Please call the shop directly at +251 911 223 344."
    );
  }

  if (await checkPrismaAvailable()) {
    try {
      const updated = await prisma.appointment.update({
        where: { cancellationToken },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancellationReason: reason || "Cancelled by customer via self-service portal",
        },
        include: { customer: true, barber: true, service: true },
      });

      return {
        id: updated.id,
        bookingReference: updated.bookingReference,
        cancellationToken: updated.cancellationToken,
        customerId: updated.customerId,
        customerName: updated.customer.name,
        customerPhone: updated.customer.phone,
        customerEmail: updated.customer.email,
        telegramChatId: updated.customer.telegramChatId,
        barberId: updated.barberId,
        barberName: updated.barber.name,
        serviceId: updated.serviceId,
        serviceName: updated.service.name,
        durationMinutes: updated.service.durationMinutes,
        priceEtb: updated.priceEtb,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: "CANCELLED",
        notes: updated.notes,
        cancellationReason: updated.cancellationReason,
        cancelledAt: updated.cancelledAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch {
      // fallback to memory
    }
  }

  // Update in memory
  appt.status = "CANCELLED";
  appt.cancelledAt = now;
  saveStoredAppointments();
  appt.cancellationReason = reason || "Cancelled by customer via self-service portal";
  return appt;
}

export async function rescheduleAppointmentByToken(
  cancellationToken: string,
  newStartTime: Date,
  newEndTime: Date,
  newBarberId?: string
): Promise<AppointmentData> {
  const appt = await getAppointmentByToken(cancellationToken);
  if (!appt) {
    throw new Error("Appointment not found");
  }

  if (appt.status === "CANCELLED") {
    throw new Error("Cannot reschedule a cancelled appointment. Please book a new appointment.");
  }

  // 2-Hour Cutoff Validation:
  const now = new Date();
  const cutoffTime = new Date(appt.startTime.getTime() - 2 * 60 * 60 * 1000);

  if (now > cutoffTime) {
    throw new Error(
      "Appointments cannot be rescheduled within 2 hours of the scheduled time. Please call the shop directly at +251 911 223 344."
    );
  }

  const targetBarberId = newBarberId || appt.barberId;
  const targetBarber = await getBarberById(targetBarberId);
  if (!targetBarber) throw new Error("Barber not found");

  if (await checkPrismaAvailable()) {
    try {
      // Check collision
      const conflict = await prisma.appointment.findFirst({
        where: {
          barberId: targetBarberId,
          status: "BOOKED",
          id: { not: appt.id },
          startTime: { lt: newEndTime },
          endTime: { gt: newStartTime },
        },
      });

      if (conflict) {
        throw new Error("The selected reschedule slot is no longer available. Please choose another time.");
      }

      const updated = await prisma.appointment.update({
        where: { cancellationToken },
        data: {
          barberId: targetBarberId,
          startTime: newStartTime,
          endTime: newEndTime,
          status: "BOOKED",
          reminderSent24h: false,
        },
        include: { customer: true, barber: true, service: true },
      });

      return {
        id: updated.id,
        bookingReference: updated.bookingReference,
        cancellationToken: updated.cancellationToken,
        customerId: updated.customerId,
        customerName: updated.customer.name,
        customerPhone: updated.customer.phone,
        customerEmail: updated.customer.email,
        telegramChatId: updated.customer.telegramChatId,
        barberId: updated.barberId,
        barberName: updated.barber.name,
        serviceId: updated.serviceId,
        serviceName: updated.service.name,
        durationMinutes: updated.service.durationMinutes,
        priceEtb: updated.priceEtb,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: "BOOKED",
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (e: any) {
      if (e.message?.includes("no longer available")) throw e;
    }
  }

  // Memory fallback check conflict
  const conflict = inMemoryAppointments.find(
    (a) =>
      a.id !== appt.id &&
      a.barberId === targetBarberId &&
      a.status === "BOOKED" &&
      a.startTime < newEndTime &&
      a.endTime > newStartTime
  );

  if (conflict) {
    throw new Error("The selected reschedule slot is no longer available. Please choose another time.");
  }

  appt.barberId = targetBarber.id;
  appt.barberName = targetBarber.name;
  appt.startTime = newStartTime;
  appt.endTime = newEndTime;
  appt.status = "BOOKED";
  saveStoredAppointments();

  return appt;
}
