const express = require("express");
const router  = express.Router();

const {
  getAllCategories, createCategory, updateCategory, deleteCategory,
  getAllEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment,
  getAllRequests, getMyRequests, createRequest, reviewRequest,
  getAllMaintenance, createMaintenance, updateMaintenance, deleteMaintenance,
} = require("./equipment.controller");

const { authenticate }    = require("../../middleware/authMiddleware");
const { authorizeRoles }  = require("../../middleware/roleMiddleware");

const adminOnly = [authenticate, authorizeRoles("ADMIN")];
const authOnly  = [authenticate];
const adminOrLabTech = [authenticate, authorizeRoles("ADMIN", "LAB_TECHNICIAN")];

// ── Equipment Categories ──────────────────────────────────────────────────
router.get   ("/categories",        ...authOnly,  getAllCategories);
router.post  ("/categories",        ...adminOnly, createCategory);
router.patch ("/categories/:id",    ...adminOnly, updateCategory);
router.delete("/categories/:id",    ...adminOnly, deleteCategory);

// ── Equipment ─────────────────────────────────────────────────────────────
router.get   ("/",                  ...authOnly,  getAllEquipment);
router.get   ("/:id",               ...authOnly,  getEquipmentById);
router.post  ("/",                  ...adminOnly, createEquipment);
router.patch ("/:id",               ...adminOnly, updateEquipment);
router.delete("/:id",               ...adminOnly, deleteEquipment);

// ── Equipment Requests ────────────────────────────────────────────────────
router.get   ("/requests/all",      ...adminOnly, getAllRequests);
router.get   ("/requests/my",       ...authOnly,  getMyRequests);
router.post  ("/requests",          ...authOnly,  createRequest);
router.patch ("/requests/:id/review",...adminOnly, reviewRequest);

// ── Equipment Maintenance ─────────────────────────────────────────────────
router.get   ("/maintenance",       ...authOnly,  getAllMaintenance);
router.post  ("/maintenance",       ...adminOrLabTech, createMaintenance);
router.patch ("/maintenance/:id",   ...adminOnly, updateMaintenance);
router.delete("/maintenance/:id",   ...adminOnly, deleteMaintenance);

module.exports = router;
