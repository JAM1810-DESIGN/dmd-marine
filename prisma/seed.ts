// Development-only seed data. Never run against production.
//
// Seeds structural/catalog data only (service categories & names, expense
// categories, one dev admin account) — no fabricated customers, bookings,
// invoices, or other business records. Service copy fields (overview,
// benefits, scope, process, FAQ) are intentionally left blank for the
// business to fill in via the admin service management module (Phase 4).
import { db } from "../src/lib/db";
import { slugify } from "../src/lib/slugify";
import { hashPassword } from "../src/lib/password";

const SERVICE_CATALOG: { category: string; services: string[] }[] = [
  {
    category: "Marine Consultancy",
    services: ["Vessel Operations Consultation", "Marine Advisory", "Operational Risk Assessment"],
  },
  {
    category: "Marine Survey & Inspection",
    services: [
      "Draft Survey",
      "Bunker Survey",
      "Third Party Hold Inspection",
      "Vessel Condition Inspection",
      "Pre-Purchase Inspection",
      "On-Hire / Off-Hire Survey",
    ],
  },
  {
    category: "Compliance Consulting",
    services: ["ISM / SMS Consulting", "ISPS Consulting", "Documentation Review"],
  },
  {
    category: "Navigation & Deck Operations",
    services: ["Navigation Audit", "Bridge Team Management", "Deck Operations Consulting"],
  },
  {
    category: "Maritime Training",
    services: ["Deck Officer Mentoring", "Career Development", "Competency Training"],
  },
  {
    category: "Remote Marine Support",
    services: ["Online Consultation", "Document Review", "Expert Advisory"],
  },
  {
    category: "Incident Support",
    services: ["Incident Investigation", "Root Cause Analysis", "Corrective Action"],
  },
  {
    category: "Port Support",
    services: ["Cargo Operation Support", "Loading Supervision", "Port Advisory"],
  },
];

const EXPENSE_CATEGORIES = [
  "Office Expenses",
  "Fuel",
  "Transportation",
  "Port Fees",
  "Travel",
  "Hotel & Accommodation",
  "Meals & Entertainment",
  "Equipment",
  "Survey Equipment",
  "Office Supplies",
  "Communication",
  "Internet",
  "Utilities",
  "Software & Subscriptions",
  "Marketing",
  "Insurance",
  "Professional Fees",
  "Taxes & Government Fees",
  "Employee Salary",
  "Contractor Payments",
  "Training",
  "Vessel Inspection Costs",
  "Miscellaneous",
];

async function seedAdmin() {
  const passwordHash = await hashPassword("DevAdmin123!");

  const admin = await db.user.upsert({
    where: { email: "admin@dmdmarine.dev" },
    update: {},
    create: {
      name: "DMD Admin",
      email: "admin@dmdmarine.dev",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Seeded dev admin user: ${admin.email} (password: DevAdmin123!)`);
}

async function seedServiceCatalog() {
  let categoryCount = 0;
  let serviceCount = 0;

  for (const [categoryOrder, { category, services }] of SERVICE_CATALOG.entries()) {
    const categoryRecord = await db.serviceCategory.upsert({
      where: { slug: slugify(category) },
      update: { name: category, order: categoryOrder },
      create: { name: category, slug: slugify(category), order: categoryOrder },
    });
    categoryCount++;

    for (const [serviceOrder, service] of services.entries()) {
      await db.service.upsert({
        where: { slug: slugify(service) },
        update: { name: service, categoryId: categoryRecord.id, order: serviceOrder },
        create: {
          name: service,
          slug: slugify(service),
          categoryId: categoryRecord.id,
          order: serviceOrder,
        },
      });
      serviceCount++;
    }
  }

  console.log(`Seeded ${categoryCount} service categories, ${serviceCount} services`);
}

async function seedExpenseCategories() {
  for (const name of EXPENSE_CATEGORIES) {
    await db.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name, isDefault: true },
    });
  }

  console.log(`Seeded ${EXPENSE_CATEGORIES.length} expense categories`);
}

async function seedSiteSettings() {
  await db.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("Seeded empty site settings row (fill in via admin Settings later)");
}

async function main() {
  await seedAdmin();
  await seedServiceCatalog();
  await seedExpenseCategories();
  await seedSiteSettings();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
