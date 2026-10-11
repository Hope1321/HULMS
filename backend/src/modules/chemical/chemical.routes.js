const express = require("express");

const {
  createChemical,
  getAllChemicals,
  getChemicalById,
  updateChemical,
  deleteChemical,
  getChemicalBatches,
  getChemicalAvailability,
} = require("./chemical.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Get all chemicals
 *
 * GET /api/chemicals
 */
router.get(
  "/",
  authenticate,
  getAllChemicals
);

/**
 * Create chemical
 *
 * POST /api/chemicals
 * ADMIN only
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createChemical
);

/**
 * Get real-time availability (available qty from active batches)
 *
 * GET /api/chemicals/:id/availability
 */
router.get(
  "/:id/availability",
  authenticate,
  getChemicalAvailability
);

/**
 * Get all batches for a chemical (with total stock)
 *
 * GET /api/chemicals/:id/batches
 */
router.get(
  "/:id/batches",
  authenticate,
  getChemicalBatches
);

/**
 * Get chemical by ID
 *
 * GET /api/chemicals/:id
 */
router.get(
  "/:id",
  authenticate,
  getChemicalById
);

/**
 * Update chemical
 *
 * PATCH /api/chemicals/:id
 * ADMIN only
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateChemical
);

/**
 * Delete chemical
 *
 * DELETE /api/chemicals/:id
 * ADMIN only
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteChemical
);

module.exports = router;