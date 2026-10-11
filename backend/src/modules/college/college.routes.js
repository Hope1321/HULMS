const express = require("express");

const {
  createCollege,
  getAllColleges,
  getCollegeById,
  updateCollege,
  deleteCollege,
} = require("./college.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Get all colleges
 * GET /api/colleges
 * Public endpoint - no authentication required for registration
 */
router.get(
  "/",
  getAllColleges
);

/**
 * Create college
 * POST /api/colleges
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createCollege
);

/**
 * Get college by ID
 * GET /api/colleges/:id
 */
router.get(
  "/:id",
  authenticate,
  getCollegeById
);

/**
 * Update college
 * PATCH /api/colleges/:id
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateCollege
);

/**
 * Delete college
 * DELETE /api/colleges/:id
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteCollege
);

module.exports = router;