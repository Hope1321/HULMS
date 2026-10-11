const { prisma } = require("../../config/database");

/**
 * ============================================================
 * LOW STOCK ALERT
 * ============================================================
 */
const createLowStockAlert = async (batch) => {
  const existingAlert = await prisma.alert.findFirst({
    where: {
      type: "LOW_STOCK",
      batchId: batch.id,
      status: {
        in: ["ACTIVE", "ACKNOWLEDGED"],
      },
    },
  });

  // Do not create or return duplicate alerts
  if (existingAlert) {
    return null;
  }

  return prisma.alert.create({
    data: {
      type: "LOW_STOCK",
      status: "ACTIVE",
      title: "Low Chemical Stock",
      message: `Chemical batch ${batch.batchNumber} is below the minimum stock level.`,
      chemicalId: batch.chemicalId,
      batchId: batch.id,
    },
  });
};

/**
 * ============================================================
 * EXPIRING CHEMICAL ALERT
 * ============================================================
 */
const createExpiringAlert = async (batch) => {
  if (!batch.expiryDate) {
    return null;
  }

  const existingAlert = await prisma.alert.findFirst({
    where: {
      type: "EXPIRING_CHEMICAL",
      batchId: batch.id,
      status: {
        in: ["ACTIVE", "ACKNOWLEDGED"],
      },
    },
  });

  // Prevent duplicate alert
  if (existingAlert) {
    return null;
  }

  return prisma.alert.create({
    data: {
      type: "EXPIRING_CHEMICAL",
      status: "ACTIVE",
      title: "Chemical Expiring Soon",
      message: `Chemical batch ${batch.batchNumber} will expire soon.`,
      chemicalId: batch.chemicalId,
      batchId: batch.id,
    },
  });
};

/**
 * ============================================================
 * EXPIRED CHEMICAL ALERT
 * ============================================================
 */
const createExpiredAlert = async (batch) => {
  const existingAlert = await prisma.alert.findFirst({
    where: {
      type: "EXPIRED_CHEMICAL",
      batchId: batch.id,
      status: {
        in: ["ACTIVE", "ACKNOWLEDGED"],
      },
    },
  });

  // Prevent duplicate alert
  if (existingAlert) {
    return null;
  }

  return prisma.alert.create({
    data: {
      type: "EXPIRED_CHEMICAL",
      status: "ACTIVE",
      title: "Chemical Expired",
      message: `Chemical batch ${batch.batchNumber} has expired.`,
      chemicalId: batch.chemicalId,
      batchId: batch.id,
    },
  });
};

/**
 * ============================================================
 * HIGH HAZARD ALERT
 * ============================================================
 */
const createHighHazardAlert = async (chemical) => {
  const existingAlert = await prisma.alert.findFirst({
    where: {
      type: "HIGH_HAZARD",
      chemicalId: chemical.id,
      status: {
        in: ["ACTIVE", "ACKNOWLEDGED"],
      },
    },
  });

  // IMPORTANT:
  // If the alert already exists, return null.
  // This prevents the same HIGH_HAZARD alert from
  // appearing multiple times when a chemical has multiple batches.
  if (existingAlert) {
    return null;
  }

  return prisma.alert.create({
    data: {
      type: "HIGH_HAZARD",
      status: "ACTIVE",
      title: "High Hazard Chemical",
      message: `${chemical.name} is classified as a ${chemical.hazardLevel} hazard chemical.`,
      chemicalId: chemical.id,
      batchId: null,
    },
  });
};

/**
 * ============================================================
 * CHECK ONE CHEMICAL BATCH
 * ============================================================
 */
const checkBatchAlerts = async (batch) => {
  const alerts = [];

  const quantity = Number(batch.quantity);
  const minimumStock = Number(batch.minimumStock);

  /**
   * LOW STOCK
   *
   * Example:
   * quantity = 50
   * minimumStock = 100
   *
   * 50 <= 100 → LOW_STOCK
   */
  if (quantity <= minimumStock) {
    const alert = await createLowStockAlert(batch);

    if (alert) {
      alerts.push(alert);
    }
  }

  /**
   * EXPIRY CHECK
   */
  if (batch.expiryDate) {
    const now = new Date();
    const expiryDate = new Date(batch.expiryDate);

    /**
     * Already expired
     */
    if (expiryDate < now) {
      const alert = await createExpiredAlert(batch);

      if (alert) {
        alerts.push(alert);
      }
    } else {
      /**
       * Calculate days remaining
       */
      const difference =
        expiryDate.getTime() - now.getTime();

      const daysUntilExpiry =
        difference / (1000 * 60 * 60 * 24);

      /**
       * Expiring within 30 days
       */
      if (daysUntilExpiry <= 30) {
        const alert = await createExpiringAlert(batch);

        if (alert) {
          alerts.push(alert);
        }
      }
    }
  }

  return alerts;
};

/**
 * ============================================================
 * CHECK ALL CHEMICAL ALERTS
 * ============================================================
 */
const checkAllChemicalAlerts = async () => {
  const batches = await prisma.chemicalBatch.findMany({
    include: {
      chemical: true,
    },
  });

  const alerts = [];

  /**
   * Track chemicals that have already been checked
   * for HIGH_HAZARD.
   *
   * This is important because one chemical can have
   * multiple batches.
   *
   * Example:
   *
   * Hydrochloric Acid
   * ├── HCL-2026-001
   * └── HCL-2026-002
   *
   * We only need ONE HIGH_HAZARD alert.
   */
  const checkedHazardChemicals = new Set();

  for (const batch of batches) {
    /**
     * Check batch-specific alerts:
     *
     * - LOW_STOCK
     * - EXPIRING_CHEMICAL
     * - EXPIRED_CHEMICAL
     */
    const batchAlerts = await checkBatchAlerts(batch);

    alerts.push(...batchAlerts);

    /**
     * ========================================================
     * HIGH HAZARD
     * ========================================================
     */
    const chemical = batch.chemical;

    if (
      chemical &&
      (
        chemical.hazardLevel === "HIGH" ||
        chemical.hazardLevel === "EXTREME"
      )
    ) {
      /**
       * Only check each chemical once.
       */
      if (!checkedHazardChemicals.has(chemical.id)) {
        checkedHazardChemicals.add(chemical.id);

        const hazardAlert =
          await createHighHazardAlert(chemical);

        if (hazardAlert) {
          alerts.push(hazardAlert);
        }
      }
    }
  }

  return alerts;
};

/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */
module.exports = {
  createLowStockAlert,
  createExpiringAlert,
  createExpiredAlert,
  createHighHazardAlert,
  checkBatchAlerts,
  checkAllChemicalAlerts,
};