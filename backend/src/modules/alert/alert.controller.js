const { prisma } = require("../../config/database");

/**
 * ============================================================
 * GET ALL ALERTS
 * ============================================================
 */
const getAllAlerts = async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        chemical: {
          select: {
            id: true,
            name: true,
            casNumber: true,
            formula: true,
            hazardLevel: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            minimumStock: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Alerts retrieved successfully",
      data: alerts,
    });
  } catch (error) {
    console.error("❌ Get all alerts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve alerts",
      error: error.message,
    });
  }
};

/**
 * ============================================================
 * GET ACTIVE ALERTS
 * ============================================================
 */
const getActiveAlerts = async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        chemical: {
          select: {
            id: true,
            name: true,
            casNumber: true,
            formula: true,
            hazardLevel: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            minimumStock: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Active alerts retrieved successfully",
      data: alerts,
    });
  } catch (error) {
    console.error("❌ Get active alerts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve active alerts",
      error: error.message,
    });
  }
};

/**
 * ============================================================
 * GET ALERT BY ID
 * ============================================================
 */
const getAlertById = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: {
        id,
      },
      include: {
        chemical: {
          select: {
            id: true,
            name: true,
            casNumber: true,
            formula: true,
            description: true,
            hazardLevel: true,
            status: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            minimumStock: true,
            purchaseDate: true,
            expiryDate: true,
            status: true,
            chemicalId: true,
            unitId: true,
            storageLocationId: true,
          },
        },
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Alert retrieved successfully",
      data: alert,
    });
  } catch (error) {
    console.error("❌ Get alert by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve alert",
      error: error.message,
    });
  }
};

/**
 * ============================================================
 * ACKNOWLEDGE ALERT
 * ============================================================
 */
const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: {
        id,
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    if (alert.status === "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Resolved alert cannot be acknowledged",
      });
    }

    if (alert.status === "ACKNOWLEDGED") {
      return res.status(400).json({
        success: false,
        message: "Alert is already acknowledged",
      });
    }

    const updatedAlert = await prisma.alert.update({
      where: {
        id,
      },
      data: {
        status: "ACKNOWLEDGED",
      },
      include: {
        chemical: {
          select: {
            id: true,
            name: true,
            hazardLevel: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            minimumStock: true,
            status: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Alert acknowledged successfully",
      data: updatedAlert,
    });
  } catch (error) {
    console.error("❌ Acknowledge alert error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to acknowledge alert",
      error: error.message,
    });
  }
};

/**
 * ============================================================
 * RESOLVE ALERT
 * ============================================================
 */
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: {
        id,
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    if (alert.status === "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Alert is already resolved",
      });
    }

    const updatedAlert = await prisma.alert.update({
      where: {
        id,
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
      include: {
        chemical: {
          select: {
            id: true,
            name: true,
            hazardLevel: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            minimumStock: true,
            status: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Alert resolved successfully",
      data: updatedAlert,
    });
  } catch (error) {
    console.error("❌ Resolve alert error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resolve alert",
      error: error.message,
    });
  }
};

/**
 * ============================================================
 * GET ACTIVE ALERT COUNT
 * ============================================================
 */
const getActiveAlertCount = async (req, res) => {
  try {
    const count = await prisma.alert.count({
      where: {
        status: "ACTIVE",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Active alert count retrieved successfully",
      data: {
        count,
      },
    });
  } catch (error) {
    console.error("❌ Get active alert count error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve active alert count",
      error: error.message,
    });
  }
};

module.exports = {
  getAllAlerts,
  getActiveAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getActiveAlertCount,
};