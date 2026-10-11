const { prisma } = require("../../config/database");

/**
 * GET ALL AUDIT LOGS
 *
 * GET /api/audit-logs
 * Query params: action, entity, userId
 */
const getAuditLogs = async (req, res) => {
  try {
    const { action, entity, userId } = req.query;

    const where = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    console.error("❌ Get audit logs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit logs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET AUDIT LOG BY ID
 *
 * GET /api/audit-logs/:id
 */
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Audit log retrieved successfully",
      data: log,
    });
  } catch (error) {
    console.error("❌ Get audit log by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit log",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * CREATE AUDIT LOG (internal helper — also exposed as endpoint)
 *
 * POST /api/audit-logs
 *
 * Body: { action, entity, entityId, description, ipAddress, userAgent, userId }
 */
const createAuditLog = async (req, res) => {
  try {
    const { action, entity, entityId, description, ipAddress, userAgent } =
      req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action is required",
      });
    }

    if (!entity) {
      return res.status(400).json({
        success: false,
        message: "Entity is required",
      });
    }

    const userId = req.user?.userId || req.user?.id || null;

    const log = await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || null,
        description: description || null,
        ipAddress: ipAddress || req.ip || null,
        userAgent: userAgent || req.headers["user-agent"] || null,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Audit log created successfully",
      data: log,
    });
  } catch (error) {
    console.error("❌ Create audit log error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create audit log",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * DELETE AUDIT LOG
 *
 * DELETE /api/audit-logs/:id
 */
const deleteAuditLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({ where: { id } });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    await prisma.auditLog.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Audit log deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete audit log error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete audit log",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
  deleteAuditLog,
};
