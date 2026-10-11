const { prisma } = require("../../config/database");
const { hashPassword } = require("../../utils/password");

const USER_SELECT = {
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
  updatedAt: true,
  college:    { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true, code: true } },
  laboratory: { select: { id: true, name: true, code: true } },
  roles: {
    include: { role: { select: { id: true, name: true } } },
  },
  registrationRequest: {
    select: { id: true, status: true, reason: true, createdAt: true, reviewedAt: true },
  },
};

/**
 * GET /api/users/me
 * Get current user's own profile
 */
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: USER_SELECT,
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, message: "Profile retrieved", data: user });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve profile" });
  }
};

/**
 * PATCH /api/users/me
 * Update current user's own profile (firstName, lastName, phone)
 */
const updateMe = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const data = {};
    if (firstName !== undefined) data.firstName = firstName.trim();
    if (lastName  !== undefined) data.lastName  = lastName.trim();
    if (phone     !== undefined) data.phone     = phone.trim() || null;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: USER_SELECT,
    });
    return res.status(200).json({ success: true, message: "Profile updated successfully", data: user });
  } catch (error) {
    console.error("Update me error:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

/**
 * PATCH /api/users/me/password
 * Change current user's password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const { comparePassword } = require("../../utils/password");
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const match = await comparePassword(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: req.user.userId }, data: { password: hashed } });

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Failed to change password" });
  }
};

/**
 * GET /api/users
 * List all users — ADMIN only
 */
const getAllUsers = async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {};

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName:  { contains: search, mode: "insensitive" } },
        { email:     { contains: search, mode: "insensitive" } },
        { phone:     { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve users" });
  }
};

/**
 * GET /api/users/:id
 * Get single user — ADMIN only
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get user by id error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve user" });
  }
};

/**
 * PATCH /api/users/:id/status
 * Update user status — ADMIN only
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["ACTIVE", "SUSPENDED", "INACTIVE", "PENDING"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.userId) {
      return res.status(400).json({ success: false, message: "You cannot change your own status" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: USER_SELECT,
    });

    return res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: user,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update user status" });
  }
};

/**
 * PATCH /api/users/:id/roles
 * Assign roles to user — ADMIN only
 */
const updateUserRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const { roles } = req.body; // array of role names e.g. ["ADMIN","LECTURER"]

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ success: false, message: "roles must be a non-empty array" });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const roleRecords = await prisma.role.findMany({
      where: { name: { in: roles } },
    });

    if (roleRecords.length !== roles.length) {
      return res.status(400).json({ success: false, message: "One or more roles are invalid" });
    }

    // Replace all existing roles
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.userRole.createMany({
        data: roleRecords.map(r => ({ userId: id, roleId: r.id })),
        skipDuplicates: true,
      }),
    ]);

    const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });

    return res.status(200).json({
      success: true,
      message: "User roles updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update user roles error:", error);
    return res.status(500).json({ success: false, message: "Failed to update user roles" });
  }
};

/**
 * POST /api/users
 * Create user directly (admin-created accounts) — ADMIN only
 */
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, roles, status } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, email and password are required",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        password: hashedPassword,
        status: status || "ACTIVE",
        isEmailVerified: true,
      },
    });

    // Assign roles if provided
    if (Array.isArray(roles) && roles.length > 0) {
      const roleRecords = await prisma.role.findMany({
        where: { name: { in: roles } },
      });
      if (roleRecords.length > 0) {
        await prisma.userRole.createMany({
          data: roleRecords.map(r => ({ userId: user.id, roleId: r.id })),
          skipDuplicates: true,
        });
      }
    }

    const created = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ success: false, message: "Failed to create user" });
  }
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRoles,
  createUser,
};
