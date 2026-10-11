const express = require("express");

const {
  createChemicalIssuance,
  getChemicalIssuances,
  getChemicalIssuanceById,
  getMyChemicalIssuances,
  cancelChemicalIssuance,
} = require("./chemical-issuance.controller");

const { authenticate } = require("../../middleware/authMiddleware");

const router = express.Router();

/**
 * Get all chemical issuances
 */
router.get(
  "/",
  authenticate,
  getChemicalIssuances
);

/**
 * Get current user's chemical issuances
 */
router.get(
  "/my",
  authenticate,
  getMyChemicalIssuances
);

/**
 * Get chemical issuance by ID
 */
router.get(
  "/:id",
  authenticate,
  getChemicalIssuanceById
);

/**
 * Create chemical issuance
 */
router.post(
  "/",
  authenticate,
  createChemicalIssuance
);

/**
 * Cancel chemical issuance
 */
router.patch(
  "/:id/cancel",
  authenticate,
  cancelChemicalIssuance
);

module.exports = router;