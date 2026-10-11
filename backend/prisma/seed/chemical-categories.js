/**
 * Seed chemical categories
 *
 * Run: node prisma/seed/chemical-categories.js
 */

require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  {
    name: "Acid",
    description: "Substances that donate protons or accept electrons (e.g. HCl, H2SO4)",
  },
  {
    name: "Base",
    description: "Substances that accept protons or donate electrons (e.g. NaOH, NH3)",
  },
  {
    name: "Salt",
    description: "Ionic compounds formed from acid-base reactions (e.g. NaCl, CaCO3)",
  },
  {
    name: "Organic Solvent",
    description: "Carbon-based solvents used in extractions and reactions (e.g. Ethanol, Acetone)",
  },
  {
    name: "Oxidizing Agent",
    description: "Substances that cause oxidation of other compounds (e.g. KMnO4, H2O2)",
  },
  {
    name: "Reducing Agent",
    description: "Substances that cause reduction of other compounds (e.g. NaBH4, Zn)",
  },
  {
    name: "Indicator",
    description: "Substances used to detect pH or endpoint in titrations (e.g. Phenolphthalein)",
  },
  {
    name: "Buffer",
    description: "Solutions that resist pH changes (e.g. Phosphate buffer, Acetate buffer)",
  },
  {
    name: "Heavy Metal Compound",
    description: "Compounds containing heavy metals (e.g. Lead nitrate, Mercury chloride)",
  },
  {
    name: "Other",
    description: "Chemicals that do not fit into the above categories",
  },
];

async function main() {
  console.log("🌱 Seeding chemical categories...\n");

  let created = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    await prisma.chemicalCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat,
    });

    console.log(`  ✅ ${cat.name}`);
    created++;
  }

  console.log(`\n🎉 Done. ${created} categories seeded.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
