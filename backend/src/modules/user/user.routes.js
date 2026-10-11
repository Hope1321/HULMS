const express = require("express");
const {
  getMe,
  updateMe,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRoles,
  createUser,
} = require("./user.controller");
const { authenticate }    = require("../../middleware/authMiddleware");
const { authorizeRoles }  = require("../../middleware/roleMiddleware");

const router = express.Router();

/* ── current user (no admin required) ── */
router.get("/me",              authenticate, getMe);
router.patch("/me",            authenticate, updateMe);
router.patch("/me/password",   authenticate, changePassword);

/* ── admin-only routes ── */
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/",             getAllUsers);
router.get("/:id",          getUserById);
router.post("/",            createUser);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/roles",  updateUserRoles);

module.exports = router;
