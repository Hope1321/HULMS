const { prisma } = require("../../config/database");

/**
 * Create chemical category
 * POST /api/chemical-categories
 */
const createChemicalCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existingCategory =
      await prisma.chemicalCategory.findUnique({
        where: {
          name: name.trim(),
        },
      });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Chemical category already exists",
      });
    }

    const category = await prisma.chemicalCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Chemical category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create chemical category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create chemical category",
    });
  }
};

/**
 * Get all chemical categories
 * GET /api/chemical-categories
 */
const getAllChemicalCategories = async (req, res) => {
  try {
    const categories =
      await prisma.chemicalCategory.findMany({
        orderBy: {
          name: "asc",
        },
        include: {
          _count: {
            select: {
              chemicals: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message: "Chemical categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Get chemical categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chemical categories",
    });
  }
};

/**
 * Get category by ID
 * GET /api/chemical-categories/:id
 */
const getChemicalCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category =
      await prisma.chemicalCategory.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              chemicals: true,
            },
          },
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Chemical category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chemical category retrieved successfully",
      data: category,
    });
  } catch (error) {
    console.error("Get chemical category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chemical category",
    });
  }
};

/**
 * Update category
 * PATCH /api/chemical-categories/:id
 */
const updateChemicalCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingCategory =
      await prisma.chemicalCategory.findUnique({
        where: {
          id,
        },
      });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Chemical category not found",
      });
    }

    if (name && name.trim() !== existingCategory.name) {
      const duplicate =
        await prisma.chemicalCategory.findUnique({
          where: {
            name: name.trim(),
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Chemical category already exists",
        });
      }
    }

    const category =
      await prisma.chemicalCategory.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && {
            name: name.trim(),
          }),
          ...(description !== undefined && {
            description: description?.trim() || null,
          }),
        },
      });

    return res.status(200).json({
      success: true,
      message: "Chemical category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update chemical category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update chemical category",
    });
  }
};

/**
 * Delete category
 * DELETE /api/chemical-categories/:id
 */
const deleteChemicalCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category =
      await prisma.chemicalCategory.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              chemicals: true,
            },
          },
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Chemical category not found",
      });
    }

    if (category._count.chemicals > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete category because chemicals are assigned to it",
      });
    }

    await prisma.chemicalCategory.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Chemical category deleted successfully",
    });
  } catch (error) {
    console.error("Delete chemical category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete chemical category",
    });
  }
};

module.exports = {
  createChemicalCategory,
  getAllChemicalCategories,
  getChemicalCategoryById,
  updateChemicalCategory,
  deleteChemicalCategory,
};