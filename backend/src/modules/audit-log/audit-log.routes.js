const express = require("express");

const {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
  deleteAuditLog,
} = require("./audit-log.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Get all audit logs (ADMIN only)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  getAuditLogs
);

/**
 * Get audit log by ID (ADMIN only)
 */
router.get(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  getAuditLogById
);

/**
 * Create audit log (authenticated users)
 */
router.post(
  "/",
  authenticate,
  createAuditLog
);

/**
 * Delete audit log (ADMIN only)
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteAuditLog
);

module.exports = router;
