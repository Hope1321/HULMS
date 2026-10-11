const express = require("express");

const {
  getAllAlerts,
  getActiveAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getActiveAlertCount,
} = require("./alert.controller");

const { authenticate } = require("../../middleware/authMiddleware");

const router = express.Router();

/**
 * All alert routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/alerts
 */
router.get("/", getAllAlerts);

/**
 * GET /api/alerts/active
 */
router.get("/active", getActiveAlerts);

/**
 * GET /api/alerts/count
 */
router.get("/count", getActiveAlertCount);

/**
 * GET /api/alerts/:id
 */
router.get("/:id", getAlertById);

/**
 * PATCH /api/alerts/:id/acknowledge
 */
router.patch("/:id/acknowledge", acknowledgeAlert);

/**
 * PATCH /api/alerts/:id/resolve
 */
router.patch("/:id/resolve", resolveAlert);

module.exports = router;