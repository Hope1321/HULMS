const express = require("express");

const {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  markAsRead,
  deleteContactMessage,
  replyToContactMessage,
} = require("./contact.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Create contact message
 * POST /api/contact
 * Public endpoint - no authentication required
 */
router.post("/", createContactMessage);

/**
 * Get all contact messages
 * GET /api/contact
 * ADMIN only
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  getAllContactMessages
);

/**
 * Get contact message by ID
 * GET /api/contact/:id
 * ADMIN only
 */
router.get(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  getContactMessageById
);

/**
 * Mark message as read
 * PATCH /api/contact/:id/read
 * ADMIN only
 */
router.patch(
  "/:id/read",
  authenticate,
  authorizeRoles("ADMIN"),
  markAsRead
);

/**
 * Delete contact message
 * DELETE /api/contact/:id
 * ADMIN only
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  deleteContactMessage
);

/**
 * Reply to contact message
 * POST /api/contact/:id/reply
 * ADMIN only
 */
router.post(
  "/:id/reply",
  authenticate,
  authorizeRoles("ADMIN"),
  replyToContactMessage
);

module.exports = router;
