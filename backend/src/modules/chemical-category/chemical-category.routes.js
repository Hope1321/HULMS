const express = require("express");

const {
  createChemicalCategory,
  getAllChemicalCategories,
  getChemicalCategoryById,
  updateChemicalCategory,
  deleteChemicalCategory,
} = require("./chemical-category.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  getAllChemicalCategories
);

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createChemicalCategory
);

router.get(
  "/:id",
  authenticate,
  getChemicalCategoryById
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateChemicalCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteChemicalCategory
);

module.exports = router;