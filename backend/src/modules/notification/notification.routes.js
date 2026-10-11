const express = require("express");

const {
  getMyNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
} = require("./notification.controller");

const { authenticate } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getMyNotifications);

router.get("/unread", authenticate, getUnreadNotifications);

router.patch("/read-all", authenticate, markAllAsRead);

router.patch("/:id/read", authenticate, markAsRead);

module.exports = router;