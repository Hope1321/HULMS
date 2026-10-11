require("dotenv").config();

const app = require("./app");
const {
  connectDatabase,
  disconnectDatabase,
} = require("./config/database");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 HULMS API running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      console.log("\n🛑 Shutting down server...");

      server.close(async () => {
        await disconnectDatabase();
        console.log("✅ Database disconnected");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("❌ Failed to start HULMS server");
    console.error(error);

    process.exit(1);
  }
};

startServer();