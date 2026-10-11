const { prisma } = require("../../config/database");

// Create supplier
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      contactName,
      email,
      phone,
      address,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        name: name.trim(),
      },
    });

    if (existingSupplier) {
      return res.status(409).json({
        success: false,
        message: "Supplier already exists",
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactName: contactName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier",
    });
  }
};

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            chemicals: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Suppliers retrieved successfully",
      data: suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve suppliers",
    });
  }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
      include: {
        chemicals: true,
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier retrieved successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Get supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve supplier",
    });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      contactName,
      email,
      phone,
      address,
    } = req.body;

    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
    });

    if (!existingSupplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    if (name && name.trim() !== existingSupplier.name) {
      const duplicate = await prisma.supplier.findUnique({
        where: {
          name: name.trim(),
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Supplier name already exists",
        });
      }
    }

    const supplier = await prisma.supplier.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),
        ...(contactName !== undefined && {
          contactName: contactName?.trim() || null,
        }),
        ...(email !== undefined && {
          email: email?.trim() || null,
        }),
        ...(phone !== undefined && {
          phone: phone?.trim() || null,
        }),
        ...(address !== undefined && {
          address: address?.trim() || null,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier",
    });
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            chemicals: true,
          },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    if (supplier._count.chemicals > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete supplier because chemicals are assigned to it",
      });
    }

    await prisma.supplier.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete supplier",
    });
  }
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};