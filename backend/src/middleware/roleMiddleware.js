const { prisma } = require("../config/database");

const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userRoles = await prisma.userRole.findMany({
        where: {
          userId: req.user.userId,
        },
        include: {
          role: true,
        },
      });

      const roleNames = userRoles.map((userRole) => userRole.role.name);

      const hasPermission = allowedRoles.some((role) =>
        roleNames.includes(role)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource",
        });
      }

      req.user.roles = roleNames;

      next();
    } catch (error) {
      console.error("Role authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to verify user roles",
      });
    }
  };
};

module.exports = {
  authorizeRoles,
};