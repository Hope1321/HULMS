const express = require("express");

const {
  createChemicalBatch,
  getAllChemicalBatches,
  getChemicalBatchById,
  updateChemicalBatch,
  deleteChemicalBatch,
  getLowStockBatches,
} = require("./chemical-batch.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Get all batches
 */
router.get(
  "/",
  authenticate,
  getAllChemicalBatches
);

/**
 * Create batch
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createChemicalBatch
);

/**
 * Get batch by ID
 */
router.get(
  "/:id",
  authenticate,
  getChemicalBatchById
);

/**
 * Update batch
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateChemicalBatch
);

/**
 * Delete batch
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteChemicalBatch
);

router.get(
  "/low-stock",
  authenticate,
  getLowStockBatches
);
module.exports = router;