const { prisma } = require("../../config/database");

/**
 * Create a notification
 */
const createNotification = async ({
  userId,
  title,
  message,
  type,
}) => {
  try {
    if (!userId) {
      throw new Error("userId is required");
    }

    if (!title) {
      throw new Error("Notification title is required");
    }

    if (!message) {
      throw new Error("Notification message is required");
    }

    if (!type) {
      throw new Error("Notification type is required");
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    return notification;
  } catch (error) {
    console.error("❌ Create notification service error:", error);
    throw error;
  }
};

/**
 * Notify when a chemical request is created
 */
const notifyRequestCreated = async ({
  userId,
  requestNumber,
}) => {
  return createNotification({
    userId,
    title: "Chemical Request Created",
    message: `Your chemical request ${requestNumber} has been created successfully and is pending approval.`,
    type: "REQUEST_CREATED",
  });
};

/**
 * Notify when a chemical request is approved
 */
const notifyRequestApproved = async ({
  userId,
  requestNumber,
}) => {
  return createNotification({
    userId,
    title: "Chemical Request Approved",
    message: `Your chemical request ${requestNumber} has been approved.`,
    type: "REQUEST_APPROVED",
  });
};

/**
 * Notify when a chemical request is rejected
 */
const notifyRequestRejected = async ({
  userId,
  requestNumber,
  reason,
}) => {
  return createNotification({
    userId,
    title: "Chemical Request Rejected",
    message: reason
      ? `Your chemical request ${requestNumber} has been rejected. Reason: ${reason}`
      : `Your chemical request ${requestNumber} has been rejected.`,
    type: "REQUEST_REJECTED",
  });
};

/**
 * Notify when chemical is issued
 */
const notifyChemicalIssued = async ({
  userId,
  issuanceNumber,
  chemicalName,
  quantity,
  unitSymbol,
}) => {
  return createNotification({
    userId,
    title: "Chemical Issued",
    message: `${quantity} ${unitSymbol} of ${chemicalName} has been issued to you. Issuance number: ${issuanceNumber}.`,
    type: "CHEMICAL_ISSUED",
  });
};

/**
 * Notify about low chemical stock
 */
const notifyLowStock = async ({
  userId,
  chemicalName,
  batchNumber,
  quantity,
  minimumStock,
  unitSymbol,
}) => {
  return createNotification({
    userId,
    title: "Low Chemical Stock",
    message: `${chemicalName} batch ${batchNumber} is below minimum stock. Current quantity: ${quantity} ${unitSymbol}, minimum stock: ${minimumStock} ${unitSymbol}.`,
    type: "LOW_STOCK",
  });
};

/**
 * Notify about expiring chemical
 */
const notifyExpiringChemical = async ({
  userId,
  chemicalName,
  batchNumber,
  expiryDate,
}) => {
  return createNotification({
    userId,
    title: "Chemical Expiring Soon",
    message: `${chemicalName} batch ${batchNumber} is expiring on ${expiryDate}.`,
    type: "EXPIRING_CHEMICAL",
  });
};

/**
 * General system notification
 */
const notifySystem = async ({
  userId,
  title,
  message,
}) => {
  return createNotification({
    userId,
    title,
    message,
    type: "SYSTEM",
  });
};

module.exports = {
  createNotification,
  notifyRequestCreated,
  notifyRequestApproved,
  notifyRequestRejected,
  notifyChemicalIssued,
  notifyLowStock,
  notifyExpiringChemical,
  notifySystem,
};