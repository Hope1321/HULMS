require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const connectDatabase = async () => {
  try {
    await prisma.$connect();

    console.log("✅ PostgreSQL connected successfully through Prisma");
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);

    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();

    console.log("✅ PostgreSQL disconnected");
  } catch (error) {
    console.error("❌ Error disconnecting database:");
    console.error(error);
  }
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};