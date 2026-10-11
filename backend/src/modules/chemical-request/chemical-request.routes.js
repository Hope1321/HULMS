const express = require("express");

const {
  createChemicalRequest,
  getMyChemicalRequests,
  getAllChemicalRequests,
  getPendingChemicalRequests,
  getChemicalRequestById,
  cancelChemicalRequest,
  reviewChemicalRequest,
} = require("./chemical-request.controller");

const {
  authenticate,
} = require("../../middleware/authMiddleware");

const router = express.Router();

/**
 * Create chemical request
 */
router.post(
  "/",
  authenticate,
  createChemicalRequest
);

/**
 * Get current user's requests
 */
router.get(
  "/my",
  authenticate,
  getMyChemicalRequests
);

/**
 * Get pending requests
 */
router.get(
  "/pending",
  authenticate,
  getPendingChemicalRequests
);

/**
 * Get all requests
 */
router.get(
  "/",
  authenticate,
  getAllChemicalRequests
);

/**
 * Get request by ID
 */
router.get(
  "/:id",
  authenticate,
  getChemicalRequestById
);

/**
 * Cancel own request
 */
router.patch(
  "/:id/cancel",
  authenticate,
  cancelChemicalRequest
);

router.patch(
  "/:id/approval",
  authenticate,
  reviewChemicalRequest
);

module.exports = router;