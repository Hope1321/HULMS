const express = require("express");

const {
  createStorageLocation,
  getAllStorageLocations,
  getStorageLocationById,
  updateStorageLocation,
  deleteStorageLocation,
} = require("./storage-location.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Get all storage locations
 */
router.get(
  "/",
  authenticate,
  getAllStorageLocations
);

/**
 * Create storage location
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createStorageLocation
);

/**
 * Get storage location by ID
 */
router.get(
  "/:id",
  authenticate,
  getStorageLocationById
);

/**
 * Update storage location
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateStorageLocation
);

/**
 * Delete storage location
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteStorageLocation
);

module.exports = router;