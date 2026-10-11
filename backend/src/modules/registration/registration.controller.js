const { prisma } = require("../../config/database");

/**
 * Create a registration request
 *
 * POST /api/registrations
 */
const createRegistrationRequest = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check whether the user already has a registration request
    const existingRequest = await prisma.registrationRequest.findUnique({
      where: {
        userId,
      },
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "Registration request already exists",
        data: existingRequest,
      });
    }

    const { reason, userType } = req.body;

    // Validate userType — must be one of the self-register roles
    const ALLOWED_TYPES = ["STUDENT", "RESEARCHER", "LECTURER"];
    const resolvedType = userType && ALLOWED_TYPES.includes(userType.toUpperCase())
      ? userType.toUpperCase()
      : "STUDENT";

    const registrationRequest = await prisma.registrationRequest.create({
      data: {
        userId,
        userType: resolvedType,
        reason: reason || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Registration request submitted successfully",
      data: registrationRequest,
    });
  } catch (error) {
    console.error("Create registration request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create registration request",
    });
  }
};

/**
 * Get pending registration requests
 *
 * GET /api/registrations/pending
 */
const getPendingRegistrationRequests = async (req, res) => {
  try {
    const requests = await prisma.registrationRequest.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            isEmailVerified: true,
            collegeId: true,
            departmentId: true,
            laboratoryId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Pending registration requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    console.error("Get pending registration requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending registration requests",
    });
  }
};

/**
 * Approve a registration request
 *
 * PATCH /api/registrations/:id/approve
 */
const approveRegistrationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.userId;

    // Find the registration request
    const registrationRequest = await prisma.registrationRequest.findUnique({
      where: {
        id,
      },
    });

    if (!registrationRequest) {
      return res.status(404).json({
        success: false,
        message: "Registration request not found",
      });
    }

    // Make sure request is still pending
    if (registrationRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Registration request is already ${registrationRequest.status.toLowerCase()}`,
      });
    }

    // Update request and user in one transaction, also assign STUDENT role
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.registrationRequest.update({
        where: {
          id,
        },
        data: {
          status: "APPROVED",
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      const updatedUser = await tx.user.update({
        where: {
          id: registrationRequest.userId,
        },
        data: {
          status: "ACTIVE",
        },
      });

      // Map userType → RoleName enum value
      const TYPE_TO_ROLE = {
        STUDENT:    "STUDENT",
        RESEARCHER: "RESEARCHER",
        LECTURER:   "LECTURER",
      };
      const roleName = TYPE_TO_ROLE[registrationRequest.userType] || "STUDENT";

      const targetRole = await tx.role.findUnique({
        where: { name: roleName },
      });

      if (targetRole) {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: registrationRequest.userId,
              roleId: targetRole.id,
            },
          },
          create: {
            userId: registrationRequest.userId,
            roleId: targetRole.id,
          },
          update: {},
        });
      }

      return {
        updatedRequest,
        updatedUser,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Registration request approved successfully",
      data: {
        registrationRequest: result.updatedRequest,
        user: {
          id: result.updatedUser.id,
          firstName: result.updatedUser.firstName,
          lastName: result.updatedUser.lastName,
          email: result.updatedUser.email,
          status: result.updatedUser.status,
        },
      },
    });
  } catch (error) {
    console.error("Approve registration request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve registration request",
    });
  }
};

/**
 * Reject a registration request
 *
 * PATCH /api/registrations/:id/reject
 */
const rejectRegistrationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.userId;
    const { reason } = req.body;

    // Find the registration request
    const registrationRequest = await prisma.registrationRequest.findUnique({
      where: {
        id,
      },
    });

    if (!registrationRequest) {
      return res.status(404).json({
        success: false,
        message: "Registration request not found",
      });
    }

    // Make sure request is still pending
    if (registrationRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Registration request is already ${registrationRequest.status.toLowerCase()}`,
      });
    }

    // Reason is required when rejecting
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const updatedRequest = await prisma.registrationRequest.update({
      where: {
        id,
      },
      data: {
        status: "REJECTED",
        reason: reason.trim(),
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Registration request rejected successfully",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Reject registration request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject registration request",
    });
  }
};

/**
 * Get current user's registration request
 *
 * GET /api/registrations/my-request
 */
const getMyRegistrationRequest = async (req, res) => {
  try {
    const userId = req.user.userId;

    const registrationRequest =
      await prisma.registrationRequest.findUnique({
        where: {
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              isEmailVerified: true,
            },
          },
        },
      });

    if (!registrationRequest) {
      return res.status(404).json({
        success: false,
        message: "You have not submitted a registration request",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Registration request retrieved successfully",
      data: registrationRequest,
    });
  } catch (error) {
    console.error("Get my registration request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve registration request",
    });
  }
};

module.exports = {
  createRegistrationRequest,
  getPendingRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
   getMyRegistrationRequest,
};
