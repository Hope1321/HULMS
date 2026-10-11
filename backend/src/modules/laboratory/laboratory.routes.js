const express = require("express");

const {
  createLaboratory,
  getAllLaboratories,
  getLaboratoriesByDepartment,
  getLaboratoryById,
  updateLaboratory,
  deleteLaboratory,
} = require("./laboratory.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Get all laboratories
 * GET /api/laboratories
 */
router.get(
  "/",
  authenticate,
  getAllLaboratories
);

/**
 * Create laboratory
 * POST /api/laboratories
 *
 * ADMIN only
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createLaboratory
);

/**
 * Get laboratories by department
 * GET /api/laboratories/department/:departmentId
 */
router.get(
  "/department/:departmentId",
  authenticate,
  getLaboratoriesByDepartment
);

/**
 * Get laboratory by ID
 * GET /api/laboratories/:id
 */
router.get(
  "/:id",
  authenticate,
  getLaboratoryById
);

/**
 * Update laboratory
 * PATCH /api/laboratories/:id
 *
 * ADMIN only
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateLaboratory
);

/**
 * Delete laboratory
 * DELETE /api/laboratories/:id
 *
 * ADMIN only
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteLaboratory
);

module.exports = router;