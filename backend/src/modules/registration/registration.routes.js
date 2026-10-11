const express = require("express");

const {
  createRegistrationRequest,
  getPendingRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
   getMyRegistrationRequest,
} = require("./registration.controller");

const { authenticate } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

/**
 * Submit registration request
 * POST /api/registrations
 */
router.post("/", authenticate, createRegistrationRequest);

/**
 * Get pending registration requests
 * GET /api/registrations/pending
 *
 * ADMIN only
 */
router.get(
  "/pending",
  authenticate,
  authorizeRoles("ADMIN"),
  getPendingRegistrationRequests,

);
/**
 * Approve registration request
 * PATCH /api/registrations/:id/approve
 *
 * ADMIN only
 */
router.patch(
  "/:id/approve",
  authenticate,
  authorizeRoles("ADMIN"),
  approveRegistrationRequest
);

/**
 * Reject registration request
 * PATCH /api/registrations/:id/reject
 *
 * ADMIN only
 */
router.patch(
  "/:id/reject",
  authenticate,
  authorizeRoles("ADMIN"),
  rejectRegistrationRequest
);
/**
 * Get current user's registration request
 * GET /api/registrations/my-request
 */
router.get(
  "/my-request",
  authenticate,
  getMyRegistrationRequest
);

module.exports = router;
