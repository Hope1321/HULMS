const { prisma } = require("../../config/database");

const createUnit = async (req, res) => {
  try {
    const { name, symbol, description } = req.body;

    if (!name || !symbol) {
      return res.status(400).json({
        success: false,
        message: "Name and symbol are required",
      });
    }

    const existingName = await prisma.unit.findUnique({
      where: { name: name.trim() },
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "Unit name already exists",
      });
    }

    const existingSymbol = await prisma.unit.findUnique({
      where: { symbol: symbol.trim() },
    });

    if (existingSymbol) {
      return res.status(409).json({
        success: false,
        message: "Unit symbol already exists",
      });
    }

    const unit = await prisma.unit.create({
      data: {
        name: name.trim(),
        symbol: symbol.trim(),
        description: description?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (error) {
    console.error("Create unit error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create unit",
    });
  }
};

const getAllUnits = async (req, res) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            chemicals: true,
            batches: true,
            requestItems: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Units retrieved successfully",
      data: units,
    });
  } catch (error) {
    console.error("Get units error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve units",
    });
  }
};

const getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            chemicals: true,
            batches: true,
            requestItems: true,
          },
        },
      },
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Unit retrieved successfully",
      data: unit,
    });
  } catch (error) {
    console.error("Get unit error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve unit",
    });
  }
};

const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, symbol, description } = req.body;

    const existingUnit = await prisma.unit.findUnique({
      where: { id },
    });

    if (!existingUnit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    if (name && name.trim() !== existingUnit.name) {
      const duplicate = await prisma.unit.findUnique({
        where: {
          name: name.trim(),
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Unit name already exists",
        });
      }
    }

    if (symbol && symbol.trim() !== existingUnit.symbol) {
      const duplicate = await prisma.unit.findUnique({
        where: {
          symbol: symbol.trim(),
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Unit symbol already exists",
        });
      }
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),
        ...(symbol !== undefined && {
          symbol: symbol.trim(),
        }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      data: unit,
    });
  } catch (error) {
    console.error("Update unit error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update unit",
    });
  }
};

const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            chemicals: true,
            batches: true,
            requestItems: true,
          },
        },
      },
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    if (
      unit._count.chemicals > 0 ||
      unit._count.batches > 0 ||
      unit._count.requestItems > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete unit because related records exist",
      });
    }

    await prisma.unit.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
    });
  } catch (error) {
    console.error("Delete unit error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete unit",
    });
  }
};

module.exports = {
  createUnit,
  getAllUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
};