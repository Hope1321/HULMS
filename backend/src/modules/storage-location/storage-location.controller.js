const { prisma } = require("../../config/database");

/**
 * Create storage location
 * POST /api/storage-locations
 */
const createStorageLocation = async (req, res) => {
  try {
    const {
      name,
      building,
      room,
      description,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Storage location name is required",
      });
    }

    const existingLocation =
      await prisma.storageLocation.findUnique({
        where: {
          name: name.trim(),
        },
      });

    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: "Storage location already exists",
      });
    }

    const storageLocation =
      await prisma.storageLocation.create({
        data: {
          name: name.trim(),
          building: building?.trim() || null,
          room: room?.trim() || null,
          description: description?.trim() || null,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Storage location created successfully",
      data: storageLocation,
    });
  } catch (error) {
    console.error(
      "Create storage location error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create storage location",
    });
  }
};

/**
 * Get all storage locations
 * GET /api/storage-locations
 */
const getAllStorageLocations = async (req, res) => {
  try {
    const locations =
      await prisma.storageLocation.findMany({
        orderBy: {
          name: "asc",
        },
        include: {
          _count: {
            select: {
              batches: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message: "Storage locations retrieved successfully",
      data: locations,
    });
  } catch (error) {
    console.error(
      "Get storage locations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve storage locations",
    });
  }
};

/**
 * Get storage location by ID
 * GET /api/storage-locations/:id
 */
const getStorageLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const location =
      await prisma.storageLocation.findUnique({
        where: {
          id,
        },
        include: {
          batches: {
            include: {
              chemical: true,
              unit: true,
            },
          },
        },
      });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Storage location not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Storage location retrieved successfully",
      data: location,
    });
  } catch (error) {
    console.error(
      "Get storage location error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve storage location",
    });
  }
};

/**
 * Update storage location
 * PATCH /api/storage-locations/:id
 */
const updateStorageLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      building,
      room,
      description,
    } = req.body;

    const existingLocation =
      await prisma.storageLocation.findUnique({
        where: {
          id,
        },
      });

    if (!existingLocation) {
      return res.status(404).json({
        success: false,
        message: "Storage location not found",
      });
    }

    if (
      name &&
      name.trim() !== existingLocation.name
    ) {
      const duplicate =
        await prisma.storageLocation.findUnique({
          where: {
            name: name.trim(),
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Storage location name already exists",
        });
      }
    }

    const location =
      await prisma.storageLocation.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && {
            name: name.trim(),
          }),

          ...(building !== undefined && {
            building: building?.trim() || null,
          }),

          ...(room !== undefined && {
            room: room?.trim() || null,
          }),

          ...(description !== undefined && {
            description:
              description?.trim() || null,
          }),
        },
      });

    return res.status(200).json({
      success: true,
      message: "Storage location updated successfully",
      data: location,
    });
  } catch (error) {
    console.error(
      "Update storage location error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update storage location",
    });
  }
};

/**
 * Delete storage location
 * DELETE /api/storage-locations/:id
 */
const deleteStorageLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location =
      await prisma.storageLocation.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              batches: true,
            },
          },
        },
      });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Storage location not found",
      });
    }

    if (location._count.batches > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete storage location because chemical batches are assigned to it",
      });
    }

    await prisma.storageLocation.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Storage location deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete storage location error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete storage location",
    });
  }
};

module.exports = {
  createStorageLocation,
  getAllStorageLocations,
  getStorageLocationById,
  updateStorageLocation,
  deleteStorageLocation,
};