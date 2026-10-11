const { prisma } = require("../../config/database");
const { createAuditLog } = require("../audit-log/audit-log.service");
const { createNotification } = require("../notification/notification.service");
/**
 * Generate issuance number
 * Example:
 * HULMS-ISS-20260815-0001
 */
const generateIssuanceNumber = async () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const prefix = `HULMS-ISS-${year}${month}${day}-`;

  const lastIssuance = await prisma.chemicalIssuance.findFirst({
    where: {
      issuanceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      issuanceNumber: true,
    },
  });

  let sequence = 1;

  if (lastIssuance) {
    const lastNumber = Number(
      lastIssuance.issuanceNumber.split("-").pop()
    );

    if (!Number.isNaN(lastNumber)) {
      sequence = lastNumber + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, "0")}`;
};

/**
 * CREATE CHEMICAL ISSUANCE
 *
 * POST /api/chemical-issuances
 *
 * Body:
 * {
 *   "requestId": "...",
 *   "batchId": "...",
 *   "quantity": 30,
 *   "notes": "Issued for chemistry practical activity."
 * }
 */
const createChemicalIssuance = async (req, res) => {
  try {
    const { requestId, batchId, quantity, notes } = req.body;

    // ---------------------------------------------------------
    // 1. Validate request body
    // ---------------------------------------------------------
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required",
      });
    }

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "Batch ID is required",
      });
    }

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required",
      });
    }

    const requestedQuantity = Number(quantity);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
      });
    }

    // ---------------------------------------------------------
    // 2. Get authenticated user
    // ---------------------------------------------------------
    const issuedById = req.user?.userId || req.user?.id;

    if (!issuedById) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    // ---------------------------------------------------------
    // 3. Find the chemical request
    // ---------------------------------------------------------
    const request = await prisma.chemicalRequest.findUnique({
      where: {
        id: requestId,
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
                status: true,
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
        approvals: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Chemical request not found",
      });
    }

    // ---------------------------------------------------------
    // 4. Request must be APPROVED
    // ---------------------------------------------------------
    if (request.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: `Chemical request cannot be issued because its status is ${request.status}`,
      });
    }

    // ---------------------------------------------------------
    // 5. Verify approval exists
    // ---------------------------------------------------------
    const approved = request.approvals.some(
      (approval) => approval.status === "APPROVED"
    );

    if (!approved) {
      return res.status(400).json({
        success: false,
        message: "Chemical request has not been approved",
      });
    }

    // ---------------------------------------------------------
    // 6. Find the chemical batch
    // ---------------------------------------------------------
    const batch = await prisma.chemicalBatch.findUnique({
      where: {
        id: batchId,
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

    // ---------------------------------------------------------
    // 7. Validate batch status
    // ---------------------------------------------------------
    if (batch.status === "EXPIRED") {
      return res.status(400).json({
        success: false,
        message: "Cannot issue chemical from an expired batch",
      });
    }

    if (batch.status === "DEPLETED") {
      return res.status(400).json({
        success: false,
        message: "Cannot issue chemical from a depleted batch",
      });
    }

    // ---------------------------------------------------------
    // 8. Chemical must be ACTIVE
    // ---------------------------------------------------------
    if (batch.chemical.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Cannot issue an inactive or discontinued chemical",
      });
    }

    // ---------------------------------------------------------
    // 9. Check requested chemical matches batch chemical
    // ---------------------------------------------------------
    const requestItem = request.items.find(
      (item) => item.chemicalId === batch.chemicalId
    );

    if (!requestItem) {
      return res.status(400).json({
        success: false,
        message:
          "The selected chemical batch does not belong to a chemical requested in this request",
      });
    }

    // ---------------------------------------------------------
    // 10. Check approved quantity
    // ---------------------------------------------------------
    if (requestItem.approvedQty === null) {
      return res.status(400).json({
        success: false,
        message: "No approved quantity exists for this chemical",
      });
    }

    const approvedQuantity = Number(requestItem.approvedQty);

    if (requestedQuantity > approvedQuantity) {
      return res.status(400).json({
        success: false,
        message: `Issuance quantity cannot exceed approved quantity of ${approvedQuantity}`,
      });
    }

    // ---------------------------------------------------------
    // 11. Check batch stock
    // ---------------------------------------------------------
    const availableQuantity = Number(batch.quantity);

    if (requestedQuantity > availableQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available quantity is ${availableQuantity}`,
      });
    }

    // ---------------------------------------------------------
    // 12. Prevent duplicate issuance
    // ---------------------------------------------------------
    const existingIssuance = await prisma.chemicalIssuance.findFirst({
      where: {
        requestId,
        batchId,
        status: {
          not: "CANCELLED",
        },
      },
    });

    if (existingIssuance) {
      return res.status(409).json({
        success: false,
        message: "An issuance already exists for this request and batch",
        data: existingIssuance,
      });
    }

    // ---------------------------------------------------------
    // 13. Generate issuance number
    // ---------------------------------------------------------
    const issuanceNumber = await generateIssuanceNumber();

    // ---------------------------------------------------------
    // 14. Create issuance + reduce stock in transaction
    // ---------------------------------------------------------
    const result = await prisma.$transaction(async (tx) => {
      /*
       * Update the batch only if enough stock still exists.
       * This helps protect against issuing the same stock
       * simultaneously from two requests.
       */
      const updatedBatch = await tx.chemicalBatch.updateMany({
        where: {
          id: batchId,
          quantity: {
            gte: requestedQuantity,
          },
        },
        data: {
          quantity: {
            decrement: requestedQuantity,
          },
        },
      });

      if (updatedBatch.count !== 1) {
        throw new Error(
          "Stock changed before issuance could be completed. Please try again."
        );
      }

      // Calculate new quantity
      const newQuantity = availableQuantity - requestedQuantity;

      // Determine new batch status
      let newStatus = "AVAILABLE";

      if (newQuantity <= 0) {
        newStatus = "DEPLETED";
      } else if (newQuantity <= Number(batch.minimumStock)) {
        newStatus = "LOW_STOCK";
      }

      await tx.chemicalBatch.update({
        where: {
          id: batchId,
        },
        data: {
          status: newStatus,
        },
      });

      // Create issuance
      const issuance = await tx.chemicalIssuance.create({
        data: {
          issuanceNumber,
          quantity: requestedQuantity,
          status: "ISSUED",
          issuedAt: new Date(),
          notes: notes || null,

          requestId,
          batchId,

          // The person receiving the chemical
          issuedToId: request.requestedById,

          // The authenticated person issuing the chemical
          issuedById,
        },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              purpose: true,
              requiredDate: true,
              status: true,
            },
          },

          batch: {
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

      return issuance;
    });

    // ---------------------------------------------------------
    // 15. Write audit log
    // ---------------------------------------------------------
    await createAuditLog({
      userId: req.user?.userId || req.user?.id,
      action: "ISSUE",
      entity: "ChemicalIssuance",
      entityId: result.id,
      description: `Chemical issuance ${result.issuanceNumber} created successfully`,
      req,
    });

    // ---------------------------------------------------------
    // 16. Send notifications
    // ---------------------------------------------------------

    // Notify the person who received the chemical
    await createNotification({
      userId: result.issuedToId,
      title: "Chemical Issued",
      message: `Your chemical request has been fulfilled. Issuance reference: ${result.issuanceNumber}.`,
      type: "CHEMICAL_ISSUED",
    });

    // Notify the person who performed the issuance (confirmation)
    await createNotification({
      userId: issuedById,
      title: "Issuance Confirmed",
      message: `You have successfully issued chemicals under reference ${result.issuanceNumber}.`,
      type: "CHEMICAL_ISSUED",
    });

    // ---------------------------------------------------------
    // 17. Success response
    // ---------------------------------------------------------
    return res.status(201).json({
      success: true,
      message: "Chemical issued successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Create chemical issuance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create chemical issuance",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * GET ALL CHEMICAL ISSUANCES
 *
 * GET /api/chemical-issuances
 */
const getChemicalIssuances = async (req, res) => {
  try {
    const issuances = await prisma.chemicalIssuance.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            purpose: true,
            requiredDate: true,
            status: true,
          },
        },

        batch: {
          include: {
            chemical: {
              select: {
                id: true,
                name: true,
                casNumber: true,
                formula: true,
                hazardLevel: true,
                status: true,
              },
            },

            unit: {
              select: {
                id: true,
                name: true,
                symbol: true,
              },
            },

            storageLocation: {
              select: {
                id: true,
                name: true,
                building: true,
                room: true,
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
      message: "Chemical issuances retrieved successfully",
      data: issuances,
    });
  } catch (error) {
    console.error("❌ Get chemical issuances error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chemical issuances",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * GET CHEMICAL ISSUANCE BY ID
 *
 * GET /api/chemical-issuances/:id
 */
const getChemicalIssuanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const issuance = await prisma.chemicalIssuance.findUnique({
      where: {
        id,
      },

      include: {
        request: {
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
        },

        batch: {
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
        },

        issuedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
        },

        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!issuance) {
      return res.status(404).json({
        success: false,
        message: "Chemical issuance not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chemical issuance retrieved successfully",
      data: issuance,
    });
  } catch (error) {
    console.error("❌ Get chemical issuance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chemical issuance",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * GET CURRENT USER'S ISSUANCES
 *
 * GET /api/chemical-issuances/my
 */
const getMyChemicalIssuances = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const issuances = await prisma.chemicalIssuance.findMany({
      where: {
        issuedToId: userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            purpose: true,
            requiredDate: true,
            status: true,
          },
        },

        batch: {
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

            storageLocation: {
              select: {
                id: true,
                name: true,
                building: true,
                room: true,
              },
            },
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
      message: "Your chemical issuances retrieved successfully",
      data: issuances,
    });
  } catch (error) {
    console.error("❌ Get my chemical issuances error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your chemical issuances",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * CANCEL CHEMICAL ISSUANCE
 *
 * IMPORTANT:
 * When cancelling an issuance, the issued quantity
 * must be returned to the original batch.
 *
 * PATCH /api/chemical-issuances/:id/cancel
 */
const cancelChemicalIssuance = async (req, res) => {
  try {
    const { id } = req.params;

    const issuance = await prisma.chemicalIssuance.findUnique({
      where: {
        id,
      },
    });

    if (!issuance) {
      return res.status(404).json({
        success: false,
        message: "Chemical issuance not found",
      });
    }

    if (issuance.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Chemical issuance is already cancelled",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Return quantity to batch
      const batch = await tx.chemicalBatch.findUnique({
        where: {
          id: issuance.batchId,
        },
      });

      if (!batch) {
        throw new Error("Original chemical batch not found");
      }

      const restoredQuantity =
        Number(batch.quantity) + Number(issuance.quantity);

      let batchStatus = "AVAILABLE";

      if (restoredQuantity <= 0) {
        batchStatus = "DEPLETED";
      } else if (restoredQuantity <= Number(batch.minimumStock)) {
        batchStatus = "LOW_STOCK";
      }

      await tx.chemicalBatch.update({
        where: {
          id: issuance.batchId,
        },
        data: {
          quantity: restoredQuantity,
          status: batchStatus,
        },
      });

      // Cancel issuance
      const cancelledIssuance =
        await tx.chemicalIssuance.update({
          where: {
            id,
          },

          data: {
            status: "CANCELLED",
            notes: req.body?.notes
              ? `${issuance.notes || ""}\nCancellation: ${req.body.notes}`.trim()
              : issuance.notes,
          },

          include: {
            request: true,

            batch: {
              include: {
                chemical: true,
                unit: true,
                storageLocation: true,
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

      return cancelledIssuance;
    });

    // ---------------------------------------------------------
    // Audit log
    // ---------------------------------------------------------
    await createAuditLog({
      userId: req.user?.userId || req.user?.id,
      action: "CANCEL",
      entity: "ChemicalIssuance",
      entityId: result.id,
      description: `Chemical issuance ${result.issuanceNumber} cancelled successfully`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: "Chemical issuance cancelled successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Cancel chemical issuance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel chemical issuance",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

module.exports = {
  createChemicalIssuance,
  getChemicalIssuances,
  getChemicalIssuanceById,
  getMyChemicalIssuances,
  cancelChemicalIssuance,
};