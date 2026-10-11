const { prisma } = require("../../config/database");

/**
 * Create a new college
 *
 * POST /api/colleges
 * ADMIN only
 */
const createCollege = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "College name and code are required",
      });
    }

    // Check whether name already exists
    const existingName = await prisma.college.findUnique({
      where: {
        name,
      },
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "College name already exists",
      });
    }

    // Check whether code already exists
    const existingCode = await prisma.college.findUnique({
      where: {
        code,
      },
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: "College code already exists",
      });
    }

    const college = await prisma.college.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "College created successfully",
      data: college,
    });
  } catch (error) {
    console.error("Create college error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create college",
    });
  }
};

/**
 * Get all colleges
 *
 * GET /api/colleges
 */
const getAllColleges = async (req, res) => {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            departments: true,
            users: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Colleges retrieved successfully",
      data: colleges,
    });
  } catch (error) {
    console.error("Get colleges error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve colleges",
    });
  }
};

/**
 * Get one college by ID
 *
 * GET /api/colleges/:id
 */
const getCollegeById = async (req, res) => {
  try {
    const { id } = req.params;

    const college = await prisma.college.findUnique({
      where: {
        id,
      },
      include: {
        departments: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "College retrieved successfully",
      data: college,
    });
  } catch (error) {
    console.error("Get college error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve college",
    });
  }
};

/**
 * Update a college
 *
 * PATCH /api/colleges/:id
 * ADMIN only
 */
const updateCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    const existingCollege = await prisma.college.findUnique({
      where: {
        id,
      },
    });

    if (!existingCollege) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    // Check duplicate name
    if (name && name !== existingCollege.name) {
      const duplicateName = await prisma.college.findUnique({
        where: {
          name,
        },
      });

      if (duplicateName) {
        return res.status(409).json({
          success: false,
          message: "College name already exists",
        });
      }
    }

    // Check duplicate code
    if (code && code.toUpperCase() !== existingCollege.code) {
      const duplicateCode = await prisma.college.findUnique({
        where: {
          code: code.toUpperCase(),
        },
      });

      if (duplicateCode) {
        return res.status(409).json({
          success: false,
          message: "College code already exists",
        });
      }
    }

    const college = await prisma.college.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),
        ...(code !== undefined && {
          code: code.trim().toUpperCase(),
        }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "College updated successfully",
      data: college,
    });
  } catch (error) {
    console.error("Update college error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update college",
    });
  }
};

/**
 * Delete a college
 *
 * DELETE /api/colleges/:id
 * ADMIN only
 */
const deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;

    const college = await prisma.college.findUnique({
      where: {
        id,
      },
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    await prisma.college.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "College deleted successfully",
    });
  } catch (error) {
    console.error("Delete college error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete college",
    });
  }
};

module.exports = {
  createCollege,
  getAllColleges,
  getCollegeById,
  updateCollege,
  deleteCollege,
};