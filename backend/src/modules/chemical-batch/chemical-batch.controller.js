const { prisma } = require("../../config/database");

/**
 * Create chemical batch
 * POST /api/chemical-batches
 */
const createChemicalBatch = async (req, res) => {
  try {
    const {
      batchNumber,
      quantity,
      minimumStock,
      purchaseDate,
      expiryDate,
      status,
      chemicalId,
      unitId,
      storageLocationId,
    } = req.body;

    // Required fields
    if (
      !batchNumber ||
      quantity === undefined ||
      minimumStock === undefined ||
      !chemicalId ||
      !unitId ||
      !storageLocationId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "batchNumber, quantity, minimumStock, chemicalId, unitId and storageLocationId are required",
      });
    }

    // Convert numbers
    const quantityNumber = Number(quantity);
    const minimumStockNumber = Number(minimumStock);

    // Validate quantity
    if (
      !Number.isFinite(quantityNumber) ||
      quantityNumber < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid non-negative number",
      });
    }

    // Validate minimum stock
    if (
      !Number.isFinite(minimumStockNumber) ||
      minimumStockNumber < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum stock must be a valid non-negative number",
      });
    }

    // Check chemical
    const chemical = await prisma.chemical.findUnique({
      where: {
        id: chemicalId,
      },
    });

    if (!chemical) {
      return res.status(404).json({
        success: false,
        message: "Chemical not found",
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

    // Check storage location
    const storageLocation =
      await prisma.storageLocation.findUnique({
        where: {
          id: storageLocationId,
        },
      });

    if (!storageLocation) {
      return res.status(404).json({
        success: false,
        message: "Storage location not found",
      });
    }

    // Check duplicate batch
    const existingBatch =
      await prisma.chemicalBatch.findFirst({
        where: {
          chemicalId,
          batchNumber: batchNumber.trim(),
        },
      });

    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message:
          "Batch number already exists for this chemical",
      });
    }

    // Determine status automatically
    let batchStatus = status || "AVAILABLE";

    if (quantityNumber === 0) {
      batchStatus = "DEPLETED";
    } else if (quantityNumber <= minimumStockNumber) {
      batchStatus = "LOW_STOCK";
    } else {
      batchStatus = "AVAILABLE";
    }

    // Create batch
    const batch = await prisma.chemicalBatch.create({
      data: {
        batchNumber: batchNumber.trim(),

        quantity: quantityNumber,

        minimumStock: minimumStockNumber,

        purchaseDate: purchaseDate
          ? new Date(purchaseDate)
          : null,

        expiryDate: expiryDate
          ? new Date(expiryDate)
          : null,

        status: batchStatus,

        chemicalId,

        unitId,

        storageLocationId,
      },

      include: {
        chemical: true,
        unit: true,
        storageLocation: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Chemical batch created successfully",
      data: batch,
    });
  } catch (error) {
    console.error(
      "Create chemical batch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create chemical batch",
    });
  }
};

/**
 * Get all chemical batches
 * GET /api/chemical-batches
 */
const getAllChemicalBatches = async (req, res) => {
  try {
    const batches =
      await prisma.chemicalBatch.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          chemical: true,
          unit: true,
          storageLocation: true,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Chemical batches retrieved successfully",
      data: batches,
    });
  } catch (error) {
    console.error(
      "Get chemical batches error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve chemical batches",
    });
  }
};

/**
 * Get chemical batch by ID
 * GET /api/chemical-batches/:id
 */
const getChemicalBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const batch =
      await prisma.chemicalBatch.findUnique({
        where: {
          id,
        },

        include: {
          chemical: {
            include: {
              category: true,
              supplier: true,
            },
          },

          unit: true,

          storageLocation: true,
        },
      });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Chemical batch not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Chemical batch retrieved successfully",
      data: batch,
    });
  } catch (error) {
    console.error(
      "Get chemical batch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve chemical batch",
      error: error.message,
    });
  }
};

/**
 * Get low-stock chemical batches
 * GET /api/chemical-batches/low-stock
 */
const getLowStockBatches = async (req, res) => {
  try {
    const batches =
      await prisma.chemicalBatch.findMany({
        where: {
          status: "LOW_STOCK",
        },

        orderBy: {
          quantity: "asc",
        },

        include: {
          chemical: true,
          unit: true,
          storageLocation: true,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Low-stock batches retrieved successfully",
      data: batches,
    });
  } catch (error) {
    console.error(
      "Get low-stock batches error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve low-stock batches",
    });
  }
};

/**
 * Update chemical batch
 * PATCH /api/chemical-batches/:id
 */
const updateChemicalBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      batchNumber,
      quantity,
      minimumStock,
      purchaseDate,
      expiryDate,
      status,
      unitId,
      storageLocationId,
    } = req.body;

    // Find existing batch
    const existingBatch =
      await prisma.chemicalBatch.findUnique({
        where: {
          id,
        },
      });

    if (!existingBatch) {
      return res.status(404).json({
        success: false,
        message: "Chemical batch not found",
      });
    }

    // Calculate new quantity
    const newQuantity =
      quantity !== undefined
        ? Number(quantity)
        : Number(existingBatch.quantity);

    // Calculate new minimum stock
    const newMinimumStock =
      minimumStock !== undefined
        ? Number(minimumStock)
        : Number(existingBatch.minimumStock);

    // Validate quantity
    if (
      !Number.isFinite(newQuantity) ||
      newQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a valid non-negative number",
      });
    }

    // Validate minimum stock
    if (
      !Number.isFinite(newMinimumStock) ||
      newMinimumStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum stock must be a valid non-negative number",
      });
    }

    // Validate unit
    if (unitId) {
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

    // Validate storage location
    if (storageLocationId) {
      const location =
        await prisma.storageLocation.findUnique({
          where: {
            id: storageLocationId,
          },
        });

      if (!location) {
        return res.status(404).json({
          success: false,
          message:
            "Storage location not found",
        });
      }
    }

    // Check duplicate batch number
    if (
      batchNumber &&
      batchNumber.trim() !==
        existingBatch.batchNumber
    ) {
      const duplicate =
        await prisma.chemicalBatch.findFirst({
          where: {
            chemicalId:
              existingBatch.chemicalId,

            batchNumber:
              batchNumber.trim(),

            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Batch number already exists for this chemical",
        });
      }
    }

    // Determine status automatically
    let batchStatus = status;

    if (!batchStatus) {
      if (newQuantity === 0) {
        batchStatus = "DEPLETED";
      } else if (
        newQuantity <= newMinimumStock
      ) {
        batchStatus = "LOW_STOCK";
      } else {
        batchStatus = "AVAILABLE";
      }
    }

    // Update batch
    const batch =
      await prisma.chemicalBatch.update({
        where: {
          id,
        },

        data: {
          ...(batchNumber !== undefined && {
            batchNumber:
              batchNumber.trim(),
          }),

          ...(quantity !== undefined && {
            quantity: newQuantity,
          }),

          ...(minimumStock !== undefined && {
            minimumStock:
              newMinimumStock,
          }),

          ...(purchaseDate !== undefined && {
            purchaseDate: purchaseDate
              ? new Date(purchaseDate)
              : null,
          }),

          ...(expiryDate !== undefined && {
            expiryDate: expiryDate
              ? new Date(expiryDate)
              : null,
          }),

          status: batchStatus,

          ...(unitId !== undefined && {
            unitId,
          }),

          ...(storageLocationId !==
            undefined && {
            storageLocationId,
          }),
        },

        include: {
          chemical: true,
          unit: true,
          storageLocation: true,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Chemical batch updated successfully",
      data: batch,
    });
  } catch (error) {
    console.error(
      "Update chemical batch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update chemical batch",
    });
  }
};

/**
 * Delete chemical batch
 * DELETE /api/chemical-batches/:id
 */
const deleteChemicalBatch = async (req, res) => {
  try {
    const { id } = req.params;

    // Find batch
    const batch =
      await prisma.chemicalBatch.findUnique({
        where: {
          id,
        },
      });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Chemical batch not found",
      });
    }

    // Delete batch
    await prisma.chemicalBatch.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Chemical batch deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete chemical batch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete chemical batch",
    });
  }
};

module.exports = {
  createChemicalBatch,
  getAllChemicalBatches,
  getChemicalBatchById,
  getLowStockBatches,
  updateChemicalBatch,
  deleteChemicalBatch,
};