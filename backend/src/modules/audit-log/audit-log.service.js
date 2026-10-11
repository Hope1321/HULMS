const { prisma } = require("../../config/database");

/**
 * Internal audit log helper — call this from any controller.
 *
 * @param {object} params
 * @param {string|null} params.userId
 * @param {string}      params.action   - AuditAction enum value
 * @param {string}      params.entity   - e.g. "ChemicalIssuance"
 * @param {string|null} params.entityId
 * @param {string|null} params.description
 * @param {object|null} params.req      - Express request object (for ip / userAgent)
 */
const createAuditLog = async ({
  userId = null,
  action,
  entity,
  entityId = null,
  description = null,
  req = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || null,
        description: description || null,
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.["user-agent"] || null,
        userId: userId || null,
      },
    });
  } catch (error) {
    // Audit logging should never crash the main request
    console.error("❌ Audit log creation failed:", error.message);
  }
};

module.exports = { createAuditLog };
