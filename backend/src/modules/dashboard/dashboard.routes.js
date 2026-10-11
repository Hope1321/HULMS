const express = require("express");

const {
  getDashboardSummary,
  getRecentRequests,
  getRecentIssuances,
  getActiveAlerts,
  getDashboard,
  getDirectorDashboard,
  getStudentDashboard,
  getChemicalStock,
} = require("./dashboard.controller");

const { authenticate } = require("../../middleware/authMiddleware");

const router = express.Router();

/**
 * All dashboard routes require authentication.
 */
router.use(authenticate);

/**
 * GET COMPLETE DASHBOARD
 *
 * GET /api/dashboard
 */
router.get("/", getDashboard);

/**
 * GET DASHBOARD SUMMARY
 *
 * GET /api/dashboard/summary
 */
router.get("/summary", getDashboardSummary);

/**
 * GET RECENT REQUESTS
 *
 * GET /api/dashboard/recent-requests
 *
 * Optional:
 * ?limit=10
 */
router.get("/recent-requests", getRecentRequests);

/**
 * GET RECENT ISSUANCES
 *
 * GET /api/dashboard/recent-issuances
 *
 * Optional:
 * ?limit=10
 */
router.get("/recent-issuances", getRecentIssuances);

/**
 * GET ACTIVE ALERTS
 *
 * GET /api/dashboard/active-alerts
 *
 * Optional:
 * ?limit=20
 */
router.get("/active-alerts", getActiveAlerts);
router.get("/director", getDirectorDashboard);
router.get("/student", getStudentDashboard);

/**
 * GET CHEMICAL STOCK SUMMARY
 *
 * GET /api/dashboard/chemical-stock
 * Optional: ?limit=10
 */
router.get("/chemical-stock", getChemicalStock);

module.exports = router;