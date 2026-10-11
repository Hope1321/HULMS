const express = require("express");

const {
  createDepartment,
  getAllDepartments,
  getDepartmentsByCollege,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} = require("./department.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Get all departments
 * GET /api/departments
 * Public endpoint - no authentication required for registration
 */
router.get(
  "/",
  getAllDepartments
);

/**
 * Create department
 * POST /api/departments
 *
 * ADMIN only
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createDepartment
);

/**
 * Get departments belonging to a college
 * GET /api/departments/college/:collegeId
 */
router.get(
  "/college/:collegeId",
  authenticate,
  getDepartmentsByCollege
);

/**
 * Get department by ID
 * GET /api/departments/:id
 */
router.get(
  "/:id",
  authenticate,
  getDepartmentById
);

/**
 * Update department
 * PATCH /api/departments/:id
 *
 * ADMIN only
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateDepartment
);

/**
 * Delete department
 * DELETE /api/departments/:id
 *
 * ADMIN only
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteDepartment
);

module.exports = router;