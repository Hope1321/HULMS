const { prisma } = require("../../config/database");
const { createAuditLog } = require("../audit-log/audit-log.service");
const { createNotification } = require("../notification/notification.service");

/**
 * Generate unique request number
 * Example: HULMS-REQ-20260815-0001
 */
const generateRequestNumber = async () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const prefix = `HULMS-REQ-${year}${month}${day}`;

  const lastRequest = await prisma.chemicalRequest.findFirst({
    where: {
      requestNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let sequence = 1;

  if (lastRequest) {
    const lastNumber = lastRequest.requestNumber
      .split("-")
      .pop();

    sequence = Number(lastNumber) + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

/**
 * Create chemical request
 * POST /api/chemical-requests
 */
const createChemicalRequest = async (req, res) => {
  try {
    const {
      purpose,
      requiredDate,
      notes,
      items,
    } = req.body;

    // User comes from authenticate middleware
    const requestedById = req.user.userId;

    // Validate purpose
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({
        success: false,
        message: "Purpose is required",
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one chemical item is required",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.chemicalId) {
        return res.status(400).json({
          success: false,
          message:
            "chemicalId is required for every item",
        });
      }

      if (
        item.requestedQty === undefined ||
        item.requestedQty === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "requestedQty is required for every item",
        });
      }

      const requestedQty = Number(item.requestedQty);

      if (
        !Number.isFinite(requestedQty) ||
        requestedQty <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "requestedQty must be greater than zero",
        });
      }

      if (!item.unitId) {
        return res.status(400).json({
          success: false,
          message:
            "unitId is required for every item",
        });
      }
    }

    // Verify all chemicals and units before creating request
    for (const item of items) {
      const chemical = await prisma.chemical.findUnique({
        where: { id: item.chemicalId },
      });

      if (!chemical) {
        return res.status(404).json({
          success: false,
          message: `Chemical not found: ${item.chemicalId}`,
        });
      }

      if (chemical.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: `${chemical.name} is not currently active`,
        });
      }

      const unit = await prisma.unit.findUnique({
        where: { id: item.unitId },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: `Unit not found: ${item.unitId}`,
        });
      }

      // ── Real-time stock check ─────────────────────────────────
      // Sum all issuable batches (AVAILABLE or LOW_STOCK).
      // Expired and depleted batches are excluded by design.
      const batches = await prisma.chemicalBatch.findMany({
        where: {
          chemicalId: item.chemicalId,
          status: { in: ["AVAILABLE", "LOW_STOCK"] },
        },
        select: { quantity: true },
      });

      const availableQty = batches.reduce(
        (sum, b) => sum + Number(b.quantity),
        0
      );

      const requestedQty = Number(item.requestedQty);

      if (availableQty === 0) {
        return res.status(400).json({
          success: false,
          message: `${chemical.name} is out of stock — unavailable for request.`,
          field: "requestedQty",
          chemicalId: item.chemicalId,
          availableQty: 0,
        });
      }

      if (requestedQty > availableQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${chemical.name}. Only ${availableQty} ${unit.symbol} is currently available.`,
          field: "requestedQty",
          chemicalId: item.chemicalId,
          availableQty,
        });
      }
    }

    // Generate request number
    const requestNumber =
      await generateRequestNumber();

    // Create request and request items in transaction
    const request =
      await prisma.$transaction(async (tx) => {
        const chemicalRequest =
          await tx.chemicalRequest.create({
            data: {
              requestNumber,
              purpose: purpose.trim(),
              requiredDate: requiredDate
                ? new Date(requiredDate)
                : null,
              notes: notes?.trim() || null,
              requestedById,

              items: {
                create: items.map((item) => ({
                  requestedQty: Number(
                    item.requestedQty
                  ),
                  notes: item.notes?.trim() || null,
                  chemicalId: item.chemicalId,
                  unitId: item.unitId,
                })),
              },
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

                  unit: true,
                },
              },
            },
          });

        return chemicalRequest;
      });

    await createAuditLog({
      userId: requestedById,
      action: "CREATE",
      entity: "ChemicalRequest",
      entityId: request.id,
      description: `Chemical request ${request.requestNumber} created successfully`,
      req,
    });

    await createNotification({
      userId: requestedById,
      title: "Request Submitted",
      message: `Your chemical request ${request.requestNumber} has been submitted and is pending review.`,
      type: "REQUEST_CREATED",
    });

    return res.status(201).json({
      success: true,
      message: "Chemical request created successfully",
      data: request,
    });
  } catch (error) {
    console.error(
      "Create chemical request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create chemical request",
    });
  }
};

/**
 * Get my chemical requests
 * GET /api/chemical-requests/my
 */
const getMyChemicalRequests = async (req, res) => {
  try {
    const requestedById = req.user.userId;

    const requests =
      await prisma.chemicalRequest.findMany({
        where: {
          requestedById,
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          items: {
            include: {
              chemical: true,
              unit: true,
            },
          },

          approvals: {
            include: {
              approvedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Your chemical requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    console.error(
      "Get my chemical requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve your chemical requests",
    });
  }
};

/**
 * Get all chemical requests
 * GET /api/chemical-requests
 */
const getAllChemicalRequests = async (req, res) => {
  try {
    const requests =
      await prisma.chemicalRequest.findMany({
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
              phone: true,
            },
          },

          items: {
            include: {
              chemical: true,
              unit: true,
            },
          },

          approvals: {
            include: {
              approvedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Chemical requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    console.error(
      "Get all chemical requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve chemical requests",
    });
  }
};

/**
 * Get pending chemical requests
 * GET /api/chemical-requests/pending
 */
const getPendingChemicalRequests = async (
  req,
  res
) => {
  try {
    const requests =
      await prisma.chemicalRequest.findMany({
        where: {
          status: "PENDING",
        },

        orderBy: {
          createdAt: "asc",
        },

        include: {
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },

          items: {
            include: {
              chemical: true,
              unit: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Pending chemical requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    console.error(
      "Get pending chemical requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve pending chemical requests",
    });
  }
};

/**
 * Get chemical request by ID
 * GET /api/chemical-requests/:id
 */
const getChemicalRequestById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const request =
      await prisma.chemicalRequest.findUnique({
        where: {
          id,
        },

        include: {
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
          },

          items: {
            include: {
              chemical: {
                include: {
                  category: true,
                  supplier: true,
                },
              },

              unit: true,
            },
          },

          approvals: {
            include: {
              approvedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
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

    return res.status(200).json({
      success: true,
      message:
        "Chemical request retrieved successfully",
      data: request,
    });
  } catch (error) {
    console.error(
      "Get chemical request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve chemical request",
    });
  }
};

/**
 * Cancel chemical request
 * PATCH /api/chemical-requests/:id/cancel
 */
const cancelChemicalRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const requestedById = req.user.userId;

    const request =
      await prisma.chemicalRequest.findUnique({
        where: {
          id,
        },
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Chemical request not found",
      });
    }

    // Only owner can cancel
    if (request.requestedById !== requestedById) {
      return res.status(403).json({
        success: false,
        message:
          "You can only cancel your own request",
      });
    }

    // Only pending requests can be cancelled
    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending requests can be cancelled",
      });
    }

    const updatedRequest =
      await prisma.chemicalRequest.update({
        where: {
          id,
        },

        data: {
          status: "CANCELLED",
        },

        include: {
          items: {
            include: {
              chemical: true,
              unit: true,
            },
          },
        },
      });

    await createAuditLog({
      userId: requestedById,
      action: "UPDATE",
      entity: "ChemicalRequest",
      entityId: id,
      description: `Chemical request ${updatedRequest.requestNumber} cancelled by requester`,
      req,
    });

    await createNotification({
      userId: requestedById,
      title: "Request Cancelled",
      message: `Your chemical request ${updatedRequest.requestNumber} has been cancelled.`,
      type: "SYSTEM",
    });

    return res.status(200).json({
      success: true,
      message:
        "Chemical request cancelled successfully",
      data: updatedRequest,
    });
  } catch (error) {
    console.error(
      "Cancel chemical request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to cancel chemical request",
    });
  }
};
/**
 * Approve or reject chemical request
 *
 * PATCH /api/chemical-requests/:id/approval
 */
const reviewChemicalRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      status,
      comments,
      items,
    } = req.body;

    const approvedById = req.user.userId;

    // Validate status
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Approval status is required",
      });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be APPROVED or REJECTED",
      });
    }

    // Find request
    const request =
      await prisma.chemicalRequest.findUnique({
        where: {
          id,
        },
        include: {
          items: true,
        },
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Chemical request not found",
      });
    }

    // Only pending requests can be reviewed
    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending chemical requests can be reviewed",
      });
    }

    // REJECT REQUEST
    if (status === "REJECTED") {
      const result = await prisma.$transaction(
        async (tx) => {
          const approval =
            await tx.approval.create({
              data: {
                status: "REJECTED",
                comments:
                  comments?.trim() || null,
                requestId: id,
                approvedById,
                approvedAt: new Date(),
              },
            });

          const updatedRequest =
            await tx.chemicalRequest.update({
              where: {
                id,
              },

              data: {
                status: "REJECTED",
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
                    chemical: true,
                    unit: true,
                  },
                },

                approvals: {
                  include: {
                    approvedBy: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            });

          return {
            approval,
            request: updatedRequest,
          };
        }
      );

      await createAuditLog({
        userId: approvedById,
        action: "REJECT",
        entity: "ChemicalRequest",
        entityId: id,
        description: `Chemical request ${result.request.requestNumber} rejected`,
        req,
      });

      await createNotification({
        userId: result.request.requestedById,
        title: "Request Rejected",
        message: `Your chemical request ${result.request.requestNumber} has been rejected.${comments ? ` Reason: ${comments}` : ""}`,
        type: "REQUEST_REJECTED",
      });

      return res.status(200).json({
        success: true,
        message: "Chemical request rejected successfully",
        data: result,
      });
    }

    // APPROVAL requires items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Approval items are required when approving a request",
      });
    }

    // Validate approved quantities
    for (const requestItem of request.items) {
      const approvalItem = items.find(
        (item) =>
          item.requestItemId === requestItem.id
      );

      if (!approvalItem) {
        return res.status(400).json({
          success: false,
          message:
            `Approved quantity is required for request item ${requestItem.id}`,
        });
      }

      const approvedQty = Number(
        approvalItem.approvedQty
      );

      const requestedQty = Number(
        requestItem.requestedQty
      );

      if (
        !Number.isFinite(approvedQty) ||
        approvedQty <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Approved quantity must be greater than zero",
        });
      }

      if (approvedQty > requestedQty) {
        return res.status(400).json({
          success: false,
          message:
            "Approved quantity cannot be greater than requested quantity",
        });
      }
    }

    // APPROVE REQUEST
    const result = await prisma.$transaction(
      async (tx) => {
        // Update request items
        for (const requestItem of request.items) {
          const approvalItem = items.find(
            (item) =>
              item.requestItemId ===
              requestItem.id
          );

          await tx.requestItem.update({
            where: {
              id: requestItem.id,
            },

            data: {
              approvedQty:
                Number(
                  approvalItem.approvedQty
                ),
            },
          });
        }

        // Create approval
        const approval =
          await tx.approval.create({
            data: {
              status: "APPROVED",
              comments:
                comments?.trim() || null,
              requestId: id,
              approvedById,
              approvedAt: new Date(),
            },
          });

        // Update request status
        const updatedRequest =
          await tx.chemicalRequest.update({
            where: {
              id,
            },

            data: {
              status: "APPROVED",
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
                  chemical: true,
                  unit: true,
                },
              },

              approvals: {
                include: {
                  approvedBy: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          });

        return {
          approval,
          request: updatedRequest,
        };
      }
    );

    await createAuditLog({
      userId: approvedById,
      action: "APPROVE",
      entity: "ChemicalRequest",
      entityId: id,
      description: `Chemical request ${result.request.requestNumber} approved`,
      req,
    });

    await createNotification({
      userId: result.request.requestedById,
      title: "Request Approved",
      message: `Your chemical request ${result.request.requestNumber} has been approved and is ready for issuance.`,
      type: "REQUEST_APPROVED",
    });

    return res.status(200).json({
      success: true,
      message: "Chemical request approved successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Review chemical request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to review chemical request",
    });
  }
};

module.exports = {
  createChemicalRequest,
  getMyChemicalRequests,
  getAllChemicalRequests,
  getPendingChemicalRequests,
  getChemicalRequestById,
  cancelChemicalRequest,
  reviewChemicalRequest,
};