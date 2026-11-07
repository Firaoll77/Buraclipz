import { PrismaClient, AppointmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up existing data...");
  await prisma.appointment.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barber.deleteMany();

  console.log("Seeding Barbers...");
  const dawit = await prisma.barber.create({
    data: {
      name: "Dawit Tadesse",
      phone: "+251911223344",
      email: "dawit@arada-barber.et",
      bio: "Master Barber with 8+ years specializing in classic scissors cuts, fades, and traditional grooming.",
      avatarUrl: "/images/barbers/dawit.jpg",
      isActive: true,
    },
  });

  const yohannes = await prisma.barber.create({
    data: {
      name: "Yohannes Bekele",
      phone: "+251922334455",
      email: "yohannes@arada-barber.et",
      bio: "Razor fade expert and precision beard sculpting master.",
      avatarUrl: "/images/barbers/yohannes.jpg",
      isActive: true,
    },
  });

  const abel = await prisma.barber.create({
    data: {
      name: "Abel Girma",
      phone: "+251933445566",
      email: "abel@arada-barber.et",
      bio: "Modern styling specialist, hot towel treatment and head massage professional.",
      avatarUrl: "/images/barbers/abel.jpg",
      isActive: true,
    },
  });

  console.log("Seeding Working Hours (Addis Ababa shop local time)...");
  const barbers = [dawit, yohannes, abel];

  for (const barber of barbers) {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    for (let day = 0; day <= 6; day++) {
      // Dawit takes Monday off (1), Abel takes Sunday off (0), Yohannes works all with a Wednesday half-day
      const isDayOff = (barber.id === dawit.id && day === 1) || (barber.id === abel.id && day === 0);

      await prisma.workingHours.create({
        data: {
          barberId: barber.id,
          dayOfWeek: day,
          isOpen: !isDayOff,
          startTime: day === 0 ? "10:00" : "09:00",
          endTime: day === 0 ? "18:00" : "20:00",
          breakStartTime: "13:00",
          breakEndTime: "14:00",
        },
      });
    }
  }

  console.log("Seeding Services...");
  const classicCut = await prisma.service.create({
    data: {
      name: "Classic Haircut",
      description: "Consultation, precision scissor & clipper cut, neck razor shave, styling.",
      durationMinutes: 40,
      priceEtb: 350,
      isActive: true,
    },
  });

  const fadeCut = await prisma.service.create({
    data: {
      name: "Skin Fade & Lineup",
      description: "Crisp drop/taper/high skin fade with sharp razor contouring.",
      durationMinutes: 45,
      priceEtb: 400,
      isActive: true,
    },
  });

  const beardTrim = await prisma.service.create({
    data: {
      name: "Beard Sculpting & Hot Towel",
      description: "Hot towel steam, organic beard oil treatment, precision razor edge trimming.",
      durationMinutes: 25,
      priceEtb: 200,
      isActive: true,
    },
  });

  const comboPackage = await prisma.service.create({
    data: {
      name: "Haircut + Beard Grooming Combo",
      description: "Full precision haircut, beard trim with hot towel, and aftershave tonic.",
      durationMinutes: 60,
      priceEtb: 500,
      isActive: true,
    },
  });

  const headMassage = await prisma.service.create({
    data: {
      name: "Traditional Head Massage & Hair Wash",
      description: "Invigorating scalp massage, herbal shampoo wash, and refreshing hair tonic.",
      durationMinutes: 30,
      priceEtb: 250,
      isActive: true,
    },
  });

  const executivePackage = await prisma.service.create({
    data: {
      name: "Executive VIP Grooming Package",
      description: "Haircut, beard sculpting, scalp massage, herbal wash, and revitalizing facial scrub.",
      durationMinutes: 80,
      priceEtb: 750,
      isActive: true,
    },
  });

  console.log("Seeding Time Off...");
  // Dawit takes a scheduled personal leave next month
  const futureLeaveStart = new Date();
  futureLeaveStart.setDate(futureLeaveStart.getDate() + 14);
  futureLeaveStart.setHours(9, 0, 0, 0);

  const futureLeaveEnd = new Date(futureLeaveStart);
  futureLeaveEnd.setDate(futureLeaveEnd.getDate() + 2);
  futureLeaveEnd.setHours(20, 0, 0, 0);

  await prisma.timeOff.create({
    data: {
      barberId: dawit.id,
      startDate: futureLeaveStart,
      endDate: futureLeaveEnd,
      reason: "Family event / personal leave",
    },
  });

  console.log("Seeding Customers & Sample Appointments...");
  const customer1 = await prisma.customer.create({
    data: {
      name: "Haile Gebre",
      phone: "+251911234567",
      email: "haile.g@example.com",
      notes: "Prefers low taper fade, sensitive skin on neck.",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: "Biruk Assefa",
      phone: "+251922456789",
      email: "biruk.a@example.com",
      notes: "Regular every 2 weeks.",
    },
  });

  // Tomorrow at 10:00 AM shop time for Dawit
  const tomorrow10am = new Date();
  tomorrow10am.setDate(tomorrow10am.getDate() + 1);
  tomorrow10am.setHours(10, 0, 0, 0);

  const tomorrow1040am = new Date(tomorrow10am);
  tomorrow1040am.setMinutes(tomorrow1040am.getMinutes() + classicCut.durationMinutes);

  await prisma.appointment.create({
    data: {
      bookingReference: "ARB-1001",
      customerId: customer1.id,
      barberId: dawit.id,
      serviceId: classicCut.id,
      startTime: tomorrow10am,
      endTime: tomorrow1040am,
      status: AppointmentStatus.BOOKED,
      priceEtb: classicCut.priceEtb,
      notes: "First time customer",
      cancellationToken: "token-demo-haile-1001",
    },
  });

  // Yesterday completed appointment for Yohannes
  const yesterday2pm = new Date();
  yesterday2pm.setDate(yesterday2pm.getDate() - 1);
  yesterday2pm.setHours(14, 0, 0, 0);

  const yesterday3pm = new Date(yesterday2pm);
  yesterday3pm.setMinutes(yesterday3pm.getMinutes() + comboPackage.durationMinutes);

  await prisma.appointment.create({
    data: {
      bookingReference: "ARB-0998",
      customerId: customer2.id,
      barberId: yohannes.id,
      serviceId: comboPackage.id,
      startTime: yesterday2pm,
      endTime: yesterday3pm,
      status: AppointmentStatus.COMPLETED,
      priceEtb: comboPackage.priceEtb,
      notes: "Completed smoothly",
      cancellationToken: "token-demo-biruk-0998",
    },
  });

  console.log("Seed data successfully created!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

