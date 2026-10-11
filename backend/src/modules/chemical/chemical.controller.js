const { prisma } = require("../../config/database");

/**
 * Create chemical
 *
 * POST /api/chemicals
 * ADMIN only
 */
const createChemical = async (req, res) => {
  try {
    const {
      name,
      casNumber,
      formula,
      description,
      hazardLevel,
      status,
      categoryId,
      unitId,
      supplierId,
    } = req.body;

    // Validate required fields
    if (!name || !hazardLevel || !categoryId || !unitId) {
      return res.status(400).json({
        success: false,
        message:
          "Name, hazardLevel, categoryId, and unitId are required",
      });
    }

    // Check category
    const category = await prisma.chemicalCategory.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Chemical category not found",
      });
    }

    // Check unit
    const unit = await prisma.unit.findUnique({
      where: {
        id: unitId,
      },
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    // Check supplier if provided
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: {
          id: supplierId,
        },
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }
    }

    // Check CAS number
    if (casNumber) {
      const existingChemical =
        await prisma.chemical.findUnique({
          where: {
            casNumber: casNumber.trim(),
          },
        });

      if (existingChemical) {
        return res.status(409).json({
          success: false,
          message: "Chemical with this CAS number already exists",
        });
      }
    }

    const chemical = await prisma.chemical.create({
      data: {
        name: name.trim(),
        casNumber: casNumber?.trim() || null,
        formula: formula?.trim() || null,
        description: description?.trim() || null,
        hazardLevel,
        status: status || "ACTIVE",
        categoryId,
        unitId,
        supplierId: supplierId || null,
      },

      include: {
        category: true,
        unit: true,
        supplier: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Chemical created successfully",
      data: chemical,
    });
  } catch (error) {
    console.error("Create chemical error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create chemical",
    });
  }
};

/**
 * Get all chemicals
 *
 * GET /api/chemicals
 */
const getAllChemicals = async (req, res) => {
  try {
    const chemicals = await prisma.chemical.findMany({
      orderBy: {
        name: "asc",
      },

      include: {
        category: true,
        unit: true,
        supplier: true,

        _count: {
          select: {
            batches: true,
            sdsDocuments: true,
            requestItems: true,
            alerts: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Chemicals retrieved successfully",
      data: chemicals,
    });
  } catch (error) {
    console.error("Get chemicals error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chemicals",
    });
  }
};

/**
 * Get chemical by ID
 *
 * GET /api/chemicals/:id
 */
const getChemicalById = async (req, res) => {
  try {
    const { id } = req.params;

    const chemical = await prisma.chemical.findUnique({
      where: {
        id,
      },

      include: {
        category: true,
        unit: true,
        supplier: true,

        batches: {
          orderBy: { createdAt: "desc" },
          include: {
            unit: {
              select: { id: true, name: true, symbol: true },
            },
            storageLocation: {
              select: { id: true, name: true, building: true, room: true },
            },
          },
        },

        _count: {
          select: {
            batches: true,
            sdsDocuments: true,
            requestItems: true,
            alerts: true,
          },
        },
      },
    });

    if (!chemical) {
      return res.status(404).json({
        success: false,
        message: "Chemical not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chemical retrieved successfully",
      data: chemical,
    });
  } catch (error) {
    console.error("Get chemical error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chemical",
    });
  }
};

/**
 * Update chemical
 *
 * PATCH /api/chemicals/:id
 * ADMIN only
 */
const updateChemical = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      casNumber,
      formula,
      description,
      hazardLevel,
      status,
      categoryId,
      unitId,
      supplierId,
    } = req.body;

    // Find chemical
    const existingChemical =
      await prisma.chemical.findUnique({
        where: {
          id,
        },
      });

    if (!existingChemical) {
      return res.status(404).json({
        success: false,
        message: "Chemical not found",
      });
    }

    // Check category
    if (
      categoryId &&
      categoryId !== existingChemical.categoryId
    ) {
      const category =
        await prisma.chemicalCategory.findUnique({
          where: {
            id: categoryId,
          },
        });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Chemical category not found",
        });
      }
    }

    // Check unit
    if (
      unitId &&
      unitId !== existingChemical.unitId
    ) {
      const unit = await prisma.unit.findUnique({
        where: {
          id: unitId,
        },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found",
        });
      }
    }

    // Check supplier
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: {
          id: supplierId,
        },
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }
    }

    // Check CAS number uniqueness
    if (
      casNumber &&
      casNumber.trim() !== existingChemical.casNumber
    ) {
      const duplicateChemical =
        await prisma.chemical.findUnique({
          where: {
            casNumber: casNumber.trim(),
          },
        });

      if (duplicateChemical) {
        return res.status(409).json({
          success: false,
          message:
            "Another chemical already uses this CAS number",
        });
      }
    }

    const chemical = await prisma.chemical.update({
      where: {
        id,
      },

      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),

        ...(casNumber !== undefined && {
          casNumber: casNumber?.trim() || null,
        }),

        ...(formula !== undefined && {
          formula: formula?.trim() || null,
        }),

        ...(description !== undefined && {
          description: description?.trim() || null,
        }),

        ...(hazardLevel !== undefined && {
          hazardLevel,
        }),

        ...(status !== undefined && {
          status,
        }),

        ...(categoryId !== undefined && {
          categoryId,
        }),

        ...(unitId !== undefined && {
          unitId,
        }),

        ...(supplierId !== undefined && {
          supplierId: supplierId || null,
        }),
      },

      include: {
        category: true,
        unit: true,
        supplier: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Chemical updated successfully",
      data: chemical,
    });
  } catch (error) {
    console.error("Update chemical error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update chemical",
    });
  }
};

/**
 * Delete chemical
 *
 * DELETE /api/chemicals/:id
 * ADMIN only
 */
const deleteChemical = async (req, res) => {
  try {
    const { id } = req.params;

    const chemical = await prisma.chemical.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            batches: true,
            sdsDocuments: true,
            requestItems: true,
            alerts: true,
          },
        },
      },
    });

    if (!chemical) {
      return res.status(404).json({
        success: false,
        message: "Chemical not found",
      });
    }

    // Prevent deleting chemical with related records
    const hasRelatedRecords =
      chemical._count.batches > 0 ||
      chemical._count.sdsDocuments > 0 ||
      chemical._count.requestItems > 0 ||
      chemical._count.alerts > 0;

    if (hasRelatedRecords) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete chemical because related records exist. Consider changing its status to INACTIVE instead.",
      });
    }

    await prisma.chemical.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Chemical deleted successfully",
    });
  } catch (error) {
    console.error("Delete chemical error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete chemical",
    });
  }
};

/**
 * Get real-time availability for a chemical
 * Sums quantity across all AVAILABLE and LOW_STOCK batches (excludes EXPIRED/DEPLETED).
 * Returns: { chemicalId, name, formula, unitSymbol, availableQty, status, batches[] }
 *
 * GET /api/chemicals/:id/availability
 */
const getChemicalAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const chemical = await prisma.chemical.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        formula: true,
        status: true,
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });

    if (!chemical) {
      return res.status(404).json({ success: false, message: "Chemical not found" });
    }

    if (chemical.status !== "ACTIVE") {
      return res.status(200).json({
        success: true,
        data: {
          chemicalId:   chemical.id,
          name:         chemical.name,
          formula:      chemical.formula,
          unitId:       chemical.unit.id,
          unitSymbol:   chemical.unit.symbol,
          availableQty: 0,
          status:       "INACTIVE",
          batches:      [],
        },
      });
    }

    // Only sum batches that can actually be issued
    const batches = await prisma.chemicalBatch.findMany({
      where: {
        chemicalId: id,
        status: { in: ["AVAILABLE", "LOW_STOCK"] },
      },
      select: {
        id: true,
        batchNumber: true,
        quantity: true,
        minimumStock: true,
        status: true,
        expiryDate: true,
        unit: { select: { id: true, name: true, symbol: true } },
        storageLocation: { select: { name: true } },
      },
    });

    const availableQty = batches.reduce((sum, b) => sum + Number(b.quantity), 0);

    let stockStatus = "OUT_OF_STOCK";
    if (availableQty > 0) {
      const hasLow = batches.some(b => b.status === "LOW_STOCK");
      stockStatus = hasLow ? "LOW_STOCK" : "IN_STOCK";
    }

    return res.status(200).json({
      success: true,
      data: {
        chemicalId:   chemical.id,
        name:         chemical.name,
        formula:      chemical.formula,
        unitId:       chemical.unit.id,
        unitSymbol:   chemical.unit.symbol,
        availableQty,
        status:       stockStatus,
        batches:      batches.map(b => ({
          id:              b.id,
          batchNumber:     b.batchNumber,
          quantity:        Number(b.quantity),
          minimumStock:    Number(b.minimumStock),
          status:          b.status,
          expiryDate:      b.expiryDate,
          unitSymbol:      b.unit.symbol,
          storageLocation: b.storageLocation.name,
        })),
      },
    });
  } catch (error) {
    console.error("Get chemical availability error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve chemical availability" });
  }
};

/**
 * Get all batches for a chemical (with total stock summary)
 *
 * GET /api/chemicals/:id/batches
 */
const getChemicalBatches = async (req, res) => {
  try {
    const { id } = req.params;

    const chemical = await prisma.chemical.findUnique({
      where: { id },
      select: { id: true, name: true, unit: { select: { symbol: true } } },
    });

    if (!chemical) {
      return res.status(404).json({ success: false, message: "Chemical not found" });
    }

    const batches = await prisma.chemicalBatch.findMany({
      where: { chemicalId: id },
      orderBy: { createdAt: "desc" },
      include: {
        unit: { select: { id: true, name: true, symbol: true } },
        storageLocation: { select: { id: true, name: true, building: true, room: true } },
        _count: { select: { issuances: true } },
      },
    });

    // Compute total available stock across all non-depleted/expired batches
    const totalStock = batches
      .filter(b => b.status !== "DEPLETED" && b.status !== "EXPIRED")
      .reduce((sum, b) => sum + Number(b.quantity), 0);

    return res.status(200).json({
      success: true,
      message: "Chemical batches retrieved successfully",
      data: {
        chemical,
        batches,
        totalStock,
        totalBatches: batches.length,
      },
    });
  } catch (error) {
    console.error("Get chemical batches error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve chemical batches" });
  }
};

module.exports = {
  createChemical,
  getAllChemicals,
  getChemicalById,
  updateChemical,
  deleteChemical,
  getChemicalBatches,
  getChemicalAvailability,
};