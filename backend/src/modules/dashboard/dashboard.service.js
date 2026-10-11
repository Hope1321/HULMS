const { prisma } = require("../../config/database");

/**
 * GET DASHBOARD STATISTICS
 */
const getDashboardStatistics = async () => {
  // Run all independent queries in parallel
  const [
    totalChemicals,
    activeChemicals,
    inactiveChemicals,
    discontinuedChemicals,

    totalBatches,
    availableBatches,
    lowStockBatches,
    expiredBatches,
    depletedBatches,

    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,

    totalIssuances,
    issuedIssuances,
    cancelledIssuances,

    activeAlerts,
    lowStockAlerts,
    highHazardAlerts,
    expiringChemicalAlerts,
    expiredChemicalAlerts,

    unreadNotifications,
  ] = await Promise.all([
    // =========================
    // CHEMICALS
    // =========================
    prisma.chemical.count(),

    prisma.chemical.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.chemical.count({
      where: {
        status: "INACTIVE",
      },
    }),

    prisma.chemical.count({
      where: {
        status: "DISCONTINUED",
      },
    }),

    // =========================
    // CHEMICAL BATCHES
    // =========================
    prisma.chemicalBatch.count(),

    prisma.chemicalBatch.count({
      where: {
        status: "AVAILABLE",
      },
    }),

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

    prisma.chemicalBatch.count({
      where: {
        status: "DEPLETED",
      },
    }),

    // =========================
    // CHEMICAL REQUESTS
    // =========================
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

    // =========================
    // CHEMICAL ISSUANCES
    // =========================
    prisma.chemicalIssuance.count(),

    prisma.chemicalIssuance.count({
      where: {
        status: "ISSUED",
      },
    }),

    prisma.chemicalIssuance.count({
      where: {
        status: "CANCELLED",
      },
    }),

    // =========================
    // ALERTS
    // =========================
    prisma.alert.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.alert.count({
      where: {
        status: "ACTIVE",
        type: "LOW_STOCK",
      },
    }),

    prisma.alert.count({
      where: {
        status: "ACTIVE",
        type: "HIGH_HAZARD",
      },
    }),

    prisma.alert.count({
      where: {
        status: "ACTIVE",
        type: "EXPIRING_CHEMICAL",
      },
    }),

    prisma.alert.count({
      where: {
        status: "ACTIVE",
        type: "EXPIRED_CHEMICAL",
      },
    }),

    // =========================
    // NOTIFICATIONS
    // =========================
    prisma.notification.count({
      where: {
        isRead: false,
      },
    }),
  ]);

  return {
    chemicals: {
      total: totalChemicals,
      active: activeChemicals,
      inactive: inactiveChemicals,
      discontinued: discontinuedChemicals,
    },

    batches: {
      total: totalBatches,
      available: availableBatches,
      lowStock: lowStockBatches,
      expired: expiredBatches,
      depleted: depletedBatches,
    },

    requests: {
      total: totalRequests,
      pending: pendingRequests,
      approved: approvedRequests,
      rejected: rejectedRequests,
    },

    issuances: {
      total: totalIssuances,
      issued: issuedIssuances,
      cancelled: cancelledIssuances,
    },

    alerts: {
      active: activeAlerts,
      lowStock: lowStockAlerts,
      highHazard: highHazardAlerts,
      expiring: expiringChemicalAlerts,
      expired: expiredChemicalAlerts,
    },

    notifications: {
      unread: unreadNotifications,
    },
  };
};

module.exports = {
  getDashboardStatistics,
};