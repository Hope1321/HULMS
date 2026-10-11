require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const roles = [
  {
    name: "ADMIN",
    description: "System administration and management",
  },
  {
    name: "DIRECTOR",
    description: "Laboratory director and oversight",
  },
  {
    name: "LAB_TECHNICIAN",
    description: "Laboratory inventory and chemical operations",
  },
  {
    name: "LECTURER",
    description: "Lecturer access to laboratory services",
  },
  {
    name: "RESEARCHER",
    description: "Researcher access to laboratory resources",
  },
  {
    name: "STUDENT",
    description: "Student access to laboratory services",
  },
];

async function main() {
  console.log("🌱 Starting role seed...");

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
      },
      create: {
        name: role.name,
        description: role.description,
      },
    });

    console.log(`✅ ${role.name}`);
  }

  console.log("🎉 All HULMS roles created successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Role seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });