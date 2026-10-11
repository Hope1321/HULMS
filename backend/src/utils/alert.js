const prisma = require("../config/database");

const createLowStockAlert = async (batch) => {
  if (Number(batch.quantity) >= Number(batch.minimumStock)) {
    return null;
  }

  const existingAlert = await prisma.alert.findFirst({
    where: {
      batchId: batch.id,
      type: "LOW_STOCK",
      status: "ACTIVE",
    },
  });

  if (existingAlert) {
    return existingAlert;
  }

  return prisma.alert.create({
    data: {
      type: "LOW_STOCK",
      status: "ACTIVE",
      title: `Low stock: ${batch.chemical.name}`,
      message: `Batch ${batch.batchNumber} has ${batch.quantity} remaining, below the minimum stock of ${batch.minimumStock}.`,
      chemicalId: batch.chemicalId,
      batchId: batch.id,
    },
  });
};

module.exports = {
  createLowStockAlert,
};