const express = require("express");

const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require("./supplier.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  getAllSuppliers
);

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createSupplier
);

router.get(
  "/:id",
  authenticate,
  getSupplierById
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateSupplier
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteSupplier
);

module.exports = router;