const prisma = require("../config/database");

const createAuditLog = async ({
  userId = null,
  action,
  entity,
  entityId = null,
  description = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        description,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);

    // Audit failure should not normally break the main business operation.
    return null;
  }
};

module.exports = {
  createAuditLog,
};