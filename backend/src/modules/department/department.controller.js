const { prisma } = require("../../config/database");

/**
 * Create a department
 *
 * POST /api/departments
 * ADMIN only
 */
const createDepartment = async (req, res) => {
  try {
    const { name, code, description, collegeId } = req.body;

    // Validate required fields
    if (!name || !code || !collegeId) {
      return res.status(400).json({
        success: false,
        message: "Name, code, and collegeId are required",
      });
    }

    // Check whether the college exists
    const college = await prisma.college.findUnique({
      where: {
        id: collegeId,
      },
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    // Check duplicate department code inside the same college
    const existingDepartment = await prisma.department.findUnique({
      where: {
        collegeId_code: {
          collegeId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: "Department code already exists in this college",
      });
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        collegeId,
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error("Create department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create department",
    });
  }
};

/**
 * Get all departments
 *
 * GET /api/departments
 */
const getAllDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            laboratories: true,
            users: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Departments retrieved successfully",
      data: departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve departments",
    });
  }
};

/**
 * Get departments by college
 *
 * GET /api/departments/college/:collegeId
 */
const getDepartmentsByCollege = async (req, res) => {
  try {
    const { collegeId } = req.params;

    const college = await prisma.college.findUnique({
      where: {
        id: collegeId,
      },
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    const departments = await prisma.department.findMany({
      where: {
        collegeId,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            laboratories: true,
            users: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Departments retrieved successfully",
      data: departments,
    });
  } catch (error) {
    console.error("Get departments by college error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve departments",
    });
  }
};

/**
 * Get one department
 *
 * GET /api/departments/:id
 */
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: {
        id,
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        laboratories: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department retrieved successfully",
      data: department,
    });
  } catch (error) {
    console.error("Get department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve department",
    });
  }
};

/**
 * Update department
 *
 * PATCH /api/departments/:id
 * ADMIN only
 */
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, collegeId } = req.body;

    const existingDepartment = await prisma.department.findUnique({
      where: {
        id,
      },
    });

    if (!existingDepartment) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Determine the college that the department will belong to
    const newCollegeId = collegeId || existingDepartment.collegeId;

    // If college is changing, make sure it exists
    if (collegeId && collegeId !== existingDepartment.collegeId) {
      const college = await prisma.college.findUnique({
        where: {
          id: collegeId,
        },
      });

      if (!college) {
        return res.status(404).json({
          success: false,
          message: "New college not found",
        });
      }
    }

    const newCode = code
      ? code.trim().toUpperCase()
      : existingDepartment.code;

    // Check duplicate code within the target college
    const duplicateDepartment = await prisma.department.findFirst({
      where: {
        collegeId: newCollegeId,
        code: newCode,
        NOT: {
          id,
        },
      },
    });

    if (duplicateDepartment) {
      return res.status(409).json({
        success: false,
        message: "Department code already exists in this college",
      });
    }

    const department = await prisma.department.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),
        ...(code !== undefined && {
          code: newCode,
        }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(collegeId !== undefined && {
          collegeId,
        }),
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    console.error("Update department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update department",
    });
  }
};

/**
 * Delete department
 *
 * DELETE /api/departments/:id
 * ADMIN only
 */
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            laboratories: true,
            users: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Prevent accidental deletion of a department with related data
    if (
      department._count.laboratories > 0 ||
      department._count.users > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete department because it has laboratories or users",
      });
    }

    await prisma.department.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete department",
    });
  }
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentsByCollege,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};