const { prisma } = require("../../config/database");

/**
 * GET DASHBOARD SUMMARY
 *
 * Returns the main statistics needed by the HULMS admin dashboard.
 */
const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalChemicals,
      activeChemicals,
      totalBatches,
      lowStockBatches,
      expiredBatches,
      totalChemicalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalIssuances,
      activeAlerts,
      unreadNotifications,
      totalUsers,
      totalLaboratories,
    ] = await Promise.all([
      // Chemicals
      prisma.chemical.count(),

      prisma.chemical.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // Batches
      prisma.chemicalBatch.count(),

      prisma.chemicalBatch.count({
        where: {
          status: "LOW_STOCK",
        },
      }),

      prisma.chemicalBatch.count({
        where: {
          status: "EXPIRED",
        },
      }),

      // Requests
      prisma.chemicalRequest.count(),

      prisma.chemicalRequest.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.chemicalRequest.count({
        where: {
          status: "APPROVED",
        },
      }),

      prisma.chemicalRequest.count({
        where: {
          status: "REJECTED",
        },
      }),

      // Issuances
      prisma.chemicalIssuance.count(),

      // Alerts
      prisma.alert.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // Notifications
      prisma.notification.count({
        where: {
          isRead: false,
        },
      }),

      // Users
      prisma.user.count(),

      // Laboratories
      prisma.laboratory.count(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard summary retrieved successfully",
      data: {
        chemicals: {
          total: totalChemicals,
          active: activeChemicals,
        },

        batches: {
          total: totalBatches,
          lowStock: lowStockBatches,
          expired: expiredBatches,
        },

        requests: {
          total: totalChemicalRequests,
          pending: pendingRequests,
          approved: approvedRequests,
          rejected: rejectedRequests,
        },

        issuances: {
          total: totalIssuances,
        },

        alerts: {
          active: activeAlerts,
        },

        notifications: {
          unread: unreadNotifications,
        },

        users: {
          total: totalUsers,
        },

        laboratories: {
          total: totalLaboratories,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard summary",
      error: error.message,
    });
  }
};

/**
 * GET RECENT CHEMICAL REQUESTS
 */
const getRecentRequests = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 5, 1),
      20
    );

    const requests = await prisma.chemicalRequest.findMany({
      take: limit,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },

        items: {
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

            unit: {
              select: {
                id: true,
                name: true,
                symbol: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Recent chemical requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    console.error("❌ Get recent requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve recent chemical requests",
      error: error.message,
    });
  }
};

/**
 * GET RECENT ISSUANCES
 */
const getRecentIssuances = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 5, 1),
      20
    );

    const issuances = await prisma.chemicalIssuance.findMany({
      take: limit,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            purpose: true,
            status: true,
          },
        },

        batch: {
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            status: true,

            chemical: {
              select: {
                id: true,
                name: true,
                casNumber: true,
                formula: true,
                hazardLevel: true,
              },
            },

            unit: {
              select: {
                id: true,
                name: true,
                symbol: true,
              },
            },
          },
        },

        issuedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },

        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Recent chemical issuances retrieved successfully",
      data: issuances,
    });
  } catch (error) {
    console.error("❌ Get recent issuances error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve recent chemical issuances",
      error: error.message,
    });
  }
};

/**
 * GET ACTIVE ALERTS
 */
const getActiveAlerts = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50
    );

    const alerts = await prisma.alert.findMany({
      where: {
        status: "ACTIVE",
      },

      take: limit,

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
 * GET DASHBOARD
 *
 * Returns summary + recent requests + recent issuances + active alerts.
 */
const getDashboard = async (req, res) => {
  try {
    const [
      totalChemicals,
      activeChemicals,
      totalBatches,
      lowStockBatches,
      expiredBatches,
      totalChemicalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalIssuances,
      activeAlerts,
      unreadNotifications,
      totalUsers,
      totalLaboratories,
      recentRequests,
      recentIssuances,
      recentAlerts,
    ] = await Promise.all([
      prisma.chemical.count(),

      prisma.chemical.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.chemicalBatch.count(),

      prisma.chemicalBatch.count({
        where: {
          status: "LOW_STOCK",
        },
      }),

      prisma.chemicalBatch.count({
        where: {
          status: "EXPIRED",
        },
      }),

      prisma.chemicalRequest.count(),

      prisma.chemicalRequest.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.chemicalRequest.count({
        where: {
          status: "APPROVED",
        },
      }),

      prisma.chemicalRequest.count({
        where: {
          status: "REJECTED",
        },
      }),

      prisma.chemicalIssuance.count(),

      prisma.alert.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.notification.count({
        where: {
          isRead: false,
        },
      }),

      prisma.user.count(),

      prisma.laboratory.count(),

      prisma.chemicalRequest.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              chemical: {
                select: {
                  id: true,
                  name: true,
                  hazardLevel: true,
                },
              },
              unit: {
                select: {
                  id: true,
                  name: true,
                  symbol: true,
                },
              },
            },
          },
        },
      }),

      prisma.chemicalIssuance.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              purpose: true,
              status: true,
            },
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
              quantity: true,
              status: true,
              chemical: {
                select: {
                  id: true,
                  name: true,
                  hazardLevel: true,
                },
              },
              unit: {
                select: {
                  id: true,
                  name: true,
                  symbol: true,
                },
              },
            },
          },
          issuedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          issuedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      prisma.alert.findMany({
        where: {
          status: "ACTIVE",
        },
        take: 10,
        orderBy: {
          createdAt: "desc",
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
              expiryDate: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard data retrieved successfully",

      data: {
        summary: {
          chemicals: {
            total: totalChemicals,
            active: activeChemicals,
          },

          batches: {
            total: totalBatches,
            lowStock: lowStockBatches,
            expired: expiredBatches,
          },

          requests: {
            total: totalChemicalRequests,
            pending: pendingRequests,
            approved: approvedRequests,
            rejected: rejectedRequests,
          },

          issuances: {
            total: totalIssuances,
          },

          alerts: {
            active: activeAlerts,
          },

          notifications: {
            unread: unreadNotifications,
          },

          users: {
            total: totalUsers,
          },

          laboratories: {
            total: totalLaboratories,
          },
        },

        recentRequests,
        recentIssuances,
        recentAlerts,
      },
    });
  } catch (error) {
    console.error("❌ Get dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard data",
      error: error.message,
    });
  }
};
/**
 * GET DIRECTOR DASHBOARD
 */
const getDirectorDashboard = async (req, res) => {
  try {
    const [
      totalChemicals,
      totalBatches,
      lowStockBatches,
      expiredBatches,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalIssuances,
      activeAlerts,
      recentRequests,
      recentIssuances,
      recentAlerts,
    ] = await Promise.all([
      // Chemicals
      prisma.chemical.count(),

      // Batches
      prisma.chemicalBatch.count(),

      prisma.chemicalBatch.count({
        where: {
          status: "LOW_STOCK",
        },
      }),

      prisma.chemicalBatch.count({
        where: {
          status: "EXPIRED",
        },
      }),

      // Requests
      prisma.chemicalRequest.count(),

      prisma.chemicalRequest.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.chemicalRequest.count({
        where: {
          status: "APPROVED",
        },
      }),

      prisma.chemicalRequest.count({
        where: {
          status: "REJECTED",
        },
      }),

      // Issuances
      prisma.chemicalIssuance.count(),

      // Alerts
      prisma.alert.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // Recent Requests
      prisma.chemicalRequest.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Recent Issuances
      prisma.chemicalIssuance.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Recent Alerts
      prisma.alert.findMany({
        where: {
          status: "ACTIVE",
        },
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Director dashboard data retrieved successfully",

      data: {
        summary: {
          chemicals: {
            total: totalChemicals,
          },

          batches: {
            total: totalBatches,
            lowStock: lowStockBatches,
            expired: expiredBatches,
          },

          requests: {
            total: totalRequests,
            pending: pendingRequests,
            approved: approvedRequests,
            rejected: rejectedRequests,
          },

          issuances: {
            total: totalIssuances,
          },

          alerts: {
            active: activeAlerts,
          },
        },

        recentRequests,
        recentIssuances,
        recentAlerts,
      },
    });
  } catch (error) {
    console.error("❌ Get director dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve director dashboard data",
      error: error.message,
    });
  }
};

/**
 * GET STUDENT DASHBOARD
 *
 * Returns data scoped to the authenticated student:
 *   – their own requests (counts + recent 5)
 *   – their own issuances (count + recent 3)
 *   – their unread notification count + recent 3
 */
const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalIssuances,
      unreadNotifications,
      recentRequests,
      recentIssuances,
      recentNotifications,
    ] = await Promise.all([
      // My request counts
      prisma.chemicalRequest.count({ where: { requestedById: userId } }),
      prisma.chemicalRequest.count({ where: { requestedById: userId, status: "PENDING" } }),
      prisma.chemicalRequest.count({ where: { requestedById: userId, status: "APPROVED" } }),
      prisma.chemicalRequest.count({ where: { requestedById: userId, status: "REJECTED" } }),

      // My issuances
      prisma.chemicalIssuance.count({ where: { issuedToId: userId } }),

      // My unread notifications
      prisma.notification.count({ where: { userId, isRead: false } }),

      // Recent 5 requests
      prisma.chemicalRequest.findMany({
        where: { requestedById: userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            take: 1,
            include: {
              chemical: { select: { id: true, name: true } },
              unit: { select: { id: true, name: true, symbol: true } },
            },
          },
        },
      }),

      // Recent 3 issuances
      prisma.chemicalIssuance.findMany({
        where: { issuedToId: userId },
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          batch: {
            include: {
              chemical: { select: { id: true, name: true } },
              unit: { select: { id: true, name: true, symbol: true } },
            },
          },
        },
      }),

      // Recent 3 notifications
      prisma.notification.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Approved requests with qty info for the "Approved Requests" panel
    const approvedRequestsList = await prisma.chemicalRequest.findMany({
      where: { requestedById: userId, status: "APPROVED" },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          take: 1,
          include: {
            unit: { select: { symbol: true } },
          },
        },
        approvals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Student dashboard data retrieved successfully",
      data: {
        summary: {
          requests: {
            total: totalRequests,
            pending: pendingRequests,
            approved: approvedRequests,
            rejected: rejectedRequests,
          },
          issuances: {
            total: totalIssuances,
          },
          notifications: {
            unread: unreadNotifications,
          },
        },
        recentRequests,
        recentIssuances,
        recentNotifications,
        approvedRequestsList,
      },
    });
  } catch (error) {
    console.error("❌ Get student dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve student dashboard data",
      error: error.message,
    });
  }
};

/**
 * GET CHEMICAL STOCK SUMMARY
 *
 * Returns chemicals with their aggregated stock across all active batches.
 * Used by the admin dashboard stock widget.
 *
 * GET /api/dashboard/chemical-stock
 */
const getChemicalStock = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50
    );

    // Fetch all active chemicals with their batches
    const chemicals = await prisma.chemical.findMany({
      where: { status: "ACTIVE" },
      include: {
        unit: { select: { symbol: true } },
        category: { select: { name: true } },
        batches: {
          where: { status: { notIn: ["DEPLETED", "EXPIRED"] } },
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            minimumStock: true,
            status: true,
            expiryDate: true,
          },
        },
      },
    });

    // Aggregate total stock per chemical
    const stockList = chemicals.map(c => {
      const totalStock = c.batches.reduce((sum, b) => sum + Number(b.quantity), 0);
      const hasLowStock = c.batches.some(b => b.status === "LOW_STOCK");
      const batchCount = c.batches.length;
      return {
        id: c.id,
        name: c.name,
        hazardLevel: c.hazardLevel,
        category: c.category?.name ?? null,
        unitSymbol: c.unit?.symbol ?? "",
        totalStock,
        batchCount,
        hasLowStock,
        minimumStock: c.batches.length > 0
          ? c.batches.reduce((sum, b) => sum + Number(b.minimumStock), 0)
          : 0,
      };
    });

    // Sort by totalStock descending, take limit
    stockList.sort((a, b) => b.totalStock - a.totalStock);
    const top = stockList.slice(0, limit);

    // Grand totals
    const grandTotal = stockList.reduce((s, c) => s + c.totalStock, 0);
    const lowStockCount = stockList.filter(c => c.hasLowStock).length;
    const zeroStockCount = stockList.filter(c => c.totalStock === 0).length;

    return res.status(200).json({
      success: true,
      message: "Chemical stock summary retrieved successfully",
      data: {
        chemicals: top,
        grandTotal,
        lowStockCount,
        zeroStockCount,
        totalChemicals: stockList.length,
      },
    });
  } catch (error) {
    console.error("❌ Get chemical stock error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chemical stock summary",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardSummary,
  getRecentRequests,
  getRecentIssuances,
  getActiveAlerts,
  getDashboard,
  getDirectorDashboard,
  getStudentDashboard,
  getChemicalStock,
};