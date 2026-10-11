const { prisma } = require("../../config/database");

/**
 * Create a laboratory
 *
 * POST /api/laboratories
 * ADMIN only
 */
const createLaboratory = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      location,
      departmentId,
    } = req.body;

    // Validate required fields
    if (!name || !code || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Name, code, and departmentId are required",
      });
    }

    // Check whether department exists
    const department = await prisma.department.findUnique({
      where: {
        id: departmentId,
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

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Check globally unique laboratory code
    const existingLaboratory =
      await prisma.laboratory.findUnique({
        where: {
          code: code.trim().toUpperCase(),
        },
      });

    if (existingLaboratory) {
      return res.status(409).json({
        success: false,
        message: "Laboratory code already exists",
      });
    }

    const laboratory = await prisma.laboratory.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        departmentId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            college: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Laboratory created successfully",
      data: laboratory,
    });
  } catch (error) {
    console.error("Create laboratory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create laboratory",
    });
  }
};

/**
 * Get all laboratories
 *
 * GET /api/laboratories
 */
const getAllLaboratories = async (req, res) => {
  try {
    const laboratories = await prisma.laboratory.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            college: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Laboratories retrieved successfully",
      data: laboratories,
    });
  } catch (error) {
    console.error("Get laboratories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve laboratories",
    });
  }
};

/**
 * Get laboratories by department
 *
 * GET /api/laboratories/department/:departmentId
 */
const getLaboratoriesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Check department
    const department = await prisma.department.findUnique({
      where: {
        id: departmentId,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const laboratories = await prisma.laboratory.findMany({
      where: {
        departmentId,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Laboratories retrieved successfully",
      data: laboratories,
    });
  } catch (error) {
    console.error(
      "Get laboratories by department error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve laboratories",
    });
  }
};

/**
 * Get one laboratory
 *
 * GET /api/laboratories/:id
 */
const getLaboratoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const laboratory = await prisma.laboratory.findUnique({
      where: {
        id,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            college: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratory not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Laboratory retrieved successfully",
      data: laboratory,
    });
  } catch (error) {
    console.error("Get laboratory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve laboratory",
    });
  }
};

/**
 * Update laboratory
 *
 * PATCH /api/laboratories/:id
 * ADMIN only
 */
const updateLaboratory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      code,
      description,
      location,
      departmentId,
    } = req.body;

    // Find existing laboratory
    const existingLaboratory =
      await prisma.laboratory.findUnique({
        where: {
          id,
        },
      });

    if (!existingLaboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratory not found",
      });
    }

    // If department is changing, check new department
    if (
      departmentId &&
      departmentId !== existingLaboratory.departmentId
    ) {
      const department = await prisma.department.findUnique({
        where: {
          id: departmentId,
        },
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          message: "New department not found",
        });
      }
    }

    const newCode = code
      ? code.trim().toUpperCase()
      : existingLaboratory.code;

    // Check duplicate laboratory code
    if (newCode !== existingLaboratory.code) {
      const duplicateLaboratory =
        await prisma.laboratory.findUnique({
          where: {
            code: newCode,
          },
        });

      if (duplicateLaboratory) {
        return res.status(409).json({
          success: false,
          message: "Laboratory code already exists",
        });
      }
    }

    const laboratory = await prisma.laboratory.update({
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
          description:
            description?.trim() || null,
        }),

        ...(location !== undefined && {
          location:
            location?.trim() || null,
        }),

        ...(departmentId !== undefined && {
          departmentId,
        }),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            college: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Laboratory updated successfully",
      data: laboratory,
    });
  } catch (error) {
    console.error("Update laboratory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update laboratory",
    });
  }
};

/**
 * Delete laboratory
 *
 * DELETE /api/laboratories/:id
 * ADMIN only
 */
const deleteLaboratory = async (req, res) => {
  try {
    const { id } = req.params;

    const laboratory = await prisma.laboratory.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratory not found",
      });
    }

    // Prevent deletion when users are assigned
    if (laboratory._count.users > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete laboratory because users are assigned to it",
      });
    }

    await prisma.laboratory.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Laboratory deleted successfully",
    });
  } catch (error) {
    console.error("Delete laboratory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete laboratory",
    });
  }
};

module.exports = {
  createLaboratory,
  getAllLaboratories,
  getLaboratoriesByDepartment,
  getLaboratoryById,
  updateLaboratory,
  deleteLaboratory,
};