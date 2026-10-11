const { prisma } = require("../../config/database");

// ── Equipment Categories ──────────────────────────────────────────────────

const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.equipmentCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { equipment: true } } },
    });
    return res.json({ success: true, message: "Categories retrieved", data: categories });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to retrieve categories" });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    console.log("Creating category:", { name, code, description });
    if (!name || !code) return res.status(400).json({ success: false, message: "Name and code are required" });

    const category = await prisma.equipmentCategory.create({
      data: { name: name.trim(), code: code.trim().toUpperCase(), description: description?.trim() || null },
    });
    console.log("Category created:", category);
    return res.status(201).json({ success: true, message: "Category created", data: category });
  } catch (e) {
    console.error("Create category error:", e);
    if (e.code === "P2002") return res.status(409).json({ success: false, message: "Category name or code already exists" });
    return res.status(500).json({ success: false, message: "Failed to create category", error: e.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    const category = await prisma.equipmentCategory.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });
    return res.json({ success: true, message: "Category updated", data: category });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to update category" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.equipmentCategory.delete({ where: { id } });
    return res.json({ success: true, message: "Category deleted" });
  } catch (e) {
    if (e.code === "P2003") return res.status(409).json({ success: false, message: "Cannot delete: equipment exists under this category" });
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to delete category" });
  }
};

// ── Equipment ─────────────────────────────────────────────────────────────

const getAllEquipment = async (req, res) => {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true, code: true } },
        laboratory: { select: { id: true, name: true } },
        _count: { select: { requests: true, maintenances: true } },
      },
    });
    return res.json({ success: true, message: "Equipment retrieved", data: equipment });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to retrieve equipment" });
  }
};

const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        category: true,
        laboratory: true,
        requests: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { requestedBy: { select: { firstName: true, lastName: true, email: true } } },
        },
        maintenances: { orderBy: { scheduledDate: "desc" }, take: 5 },
      },
    });
    if (!equipment) return res.status(404).json({ success: false, message: "Equipment not found" });
    return res.json({ success: true, message: "Equipment retrieved", data: equipment });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to retrieve equipment" });
  }
};

const createEquipment = async (req, res) => {
  try {
    const { name, code, description, serialNumber, model, manufacturer,
            purchaseDate, status, location, categoryId, laboratoryId } = req.body;
    if (!name || !code || !categoryId)
      return res.status(400).json({ success: false, message: "Name, code and category are required" });

    const equipment = await prisma.equipment.create({
      data: {
        name: name.trim(), code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        model: model?.trim() || null,
        manufacturer: manufacturer?.trim() || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        status: status || "AVAILABLE",
        location: location?.trim() || null,
        categoryId,
        laboratoryId: laboratoryId || null,
      },
      include: { category: true, laboratory: true },
    });
    return res.status(201).json({ success: true, message: "Equipment created", data: equipment });
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ success: false, message: "Equipment code already exists" });
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to create equipment" });
  }
};

const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...(data.name        && { name: data.name.trim() }),
        ...(data.code        && { code: data.code.trim().toUpperCase() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber?.trim() || null }),
        ...(data.model       !== undefined && { model: data.model?.trim() || null }),
        ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer?.trim() || null }),
        ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
        ...(data.status      && { status: data.status }),
        ...(data.location    !== undefined && { location: data.location?.trim() || null }),
        ...(data.categoryId  && { categoryId: data.categoryId }),
        ...(data.laboratoryId !== undefined && { laboratoryId: data.laboratoryId || null }),
      },
      include: { category: true, laboratory: true },
    });
    return res.json({ success: true, message: "Equipment updated", data: equipment });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to update equipment" });
  }
};

const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.equipment.delete({ where: { id } });
    return res.json({ success: true, message: "Equipment deleted" });
  } catch (e) {
    if (e.code === "P2003") return res.status(409).json({ success: false, message: "Cannot delete: related requests or maintenance records exist" });
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to delete equipment" });
  }
};

// ── Equipment Requests ────────────────────────────────────────────────────

let reqSeq = 0;
const genRequestNumber = async () => {
  const today  = new Date();
  const prefix = `EQ-REQ-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}-`;
  const last   = await prisma.equipmentRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } }, orderBy: { createdAt: "desc" },
  });
  const seq = last ? (Number(last.requestNumber.split("-").pop()) + 1) : 1;
  return `${prefix}${String(seq).padStart(4,"0")}`;
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await prisma.equipmentRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        equipment: { include: { category: { select: { name: true } } } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return res.json({ success: true, message: "Requests retrieved", data: requests });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to retrieve requests" });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await prisma.equipmentRequest.findMany({
      where: { requestedById: userId }, orderBy: { createdAt: "desc" },
      include: { equipment: { include: { category: { select: { name: true } } } } },
    });
    return res.json({ success: true, message: "Your requests retrieved", data: requests });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to retrieve your requests" });
  }
};

const createRequest = async (req, res) => {
  try {
    const { equipmentId, purpose, requestedFrom, requestedTo, notes } = req.body;
    const userId = req.user.userId;
    if (!equipmentId || !purpose || !requestedFrom || !requestedTo)
      return res.status(400).json({ success: false, message: "Equipment, purpose and dates are required" });

    const requestNumber = await genRequestNumber();
    const request = await prisma.equipmentRequest.create({
      data: {
        requestNumber, equipmentId, requestedById: userId,
        purpose: purpose.trim(),
        requestedFrom: new Date(requestedFrom),
        requestedTo: new Date(requestedTo),
        notes: notes?.trim() || null,
      },
      include: { equipment: true, requestedBy: { select: { firstName: true, lastName: true, email: true } } },
    });
    return res.status(201).json({ success: true, message: "Request submitted", data: request });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to submit request" });
  }
};

const reviewRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    const reviewerId = req.user.userId;
    if (!["APPROVED","REJECTED"].includes(status))
      return res.status(400).json({ success: false, message: "Status must be APPROVED or REJECTED" });

    const request = await prisma.equipmentRequest.update({
      where: { id },
      data: { status, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNotes: reviewNotes?.trim() || null },
    });
    return res.json({ success: true, message: `Request ${status.toLowerCase()}`, data: request });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to review request" });
  }
};

// ── Equipment Maintenance ─────────────────────────────────────────────────

const genMaintenanceNumber = async () => {
  const today  = new Date();
  const prefix = `EQ-MNT-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}-`;
  const last   = await prisma.equipmentMaintenance.findFirst({
    where: { maintenanceNumber: { startsWith: prefix } }, orderBy: { createdAt: "desc" },
  });
  const seq = last ? (Number(last.maintenanceNumber.split("-").pop()) + 1) : 1;
  return `${prefix}${String(seq).padStart(4,"0")}`;
};

const getAllMaintenance = async (req, res) => {
  try {
    const records = await prisma.equipmentMaintenance.findMany({
      orderBy: { scheduledDate: "desc" },
      include: { equipment: { include: { category: { select: { name: true } } } } },
    });
    return res.json({ success: true, message: "Maintenance records retrieved", data: records });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to retrieve maintenance records" });
  }
};

const createMaintenance = async (req, res) => {
  try {
    const { equipmentId, type, scheduledDate, description, performedBy, notes, cost } = req.body;
    if (!equipmentId || !type || !scheduledDate || !description)
      return res.status(400).json({ success: false, message: "Equipment, type, scheduled date and description are required" });

    const maintenanceNumber = await genMaintenanceNumber();
    const record = await prisma.equipmentMaintenance.create({
      data: {
        maintenanceNumber, equipmentId, type,
        scheduledDate: new Date(scheduledDate),
        description: description.trim(),
        performedBy: performedBy?.trim() || null,
        notes: notes?.trim() || null,
        cost: cost ? parseFloat(cost) : null,
      },
      include: { equipment: { select: { name: true, code: true } } },
    });
    return res.status(201).json({ success: true, message: "Maintenance record created", data: record });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to create maintenance record" });
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedDate, notes, cost, performedBy } = req.body;
    const record = await prisma.equipmentMaintenance.update({
      where: { id },
      data: {
        ...(status        && { status }),
        ...(completedDate && { completedDate: new Date(completedDate) }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(cost  !== undefined && { cost: cost ? parseFloat(cost) : null }),
        ...(performedBy !== undefined && { performedBy: performedBy?.trim() || null }),
      },
      include: { equipment: { select: { name: true, code: true } } },
    });
    return res.json({ success: true, message: "Maintenance record updated", data: record });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to update maintenance record" });
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.equipmentMaintenance.delete({ where: { id } });
    return res.json({ success: true, message: "Maintenance record deleted" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Failed to delete maintenance record" });
  }
};

module.exports = {
  // Categories
  getAllCategories, createCategory, updateCategory, deleteCategory,
  // Equipment
  getAllEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment,
  // Requests
  getAllRequests, getMyRequests, createRequest, reviewRequest,
  // Maintenance
  getAllMaintenance, createMaintenance, updateMaintenance, deleteMaintenance,
};
