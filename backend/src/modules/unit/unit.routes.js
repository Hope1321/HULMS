const express = require("express");

const {
  createUnit,
  getAllUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
} = require("./unit.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get("/", authenticate, getAllUnits);

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createUnit
);

router.get(
  "/:id",
  authenticate,
  getUnitById
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  updateUnit
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteUnit
);

module.exports = router;