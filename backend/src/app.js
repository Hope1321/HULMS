const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./modules/auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to HULMS API",
    version: "1.0.0",
  });
});
const { authenticate } = require("./middleware/authMiddleware");
const { authorizeRoles } = require("./middleware/roleMiddleware");
const registrationRoutes = require("./modules/registration/registration.routes");
const collegeRoutes = require("./modules/college/college.routes");
const departmentRoutes = require("./modules/department/department.routes");
const laboratoryRoutes = require("./modules/laboratory/laboratory.routes");
const chemicalRoutes = require("./modules/chemical/chemical.routes");
const chemicalCategoryRoutes = require("./modules/chemical-category/chemical-category.routes");
const unitRoutes = require("./modules/unit/unit.routes");
const supplierRoutes = require("./modules/supplier/supplier.routes");
const storageLocationRoutes = require("./modules/storage-location/storage-location.routes");
const chemicalBatchRoutes = require("./modules/chemical-batch/chemical-batch.routes");
const chemicalRequestRoutes = require("./modules/chemical-request/chemical-request.routes");
const chemicalIssuanceRoutes = require("./modules/chemical-issuance/chemical-issuance.routes");
const notificationRoutes = require("./modules/notification/notification.routes");
const alertRoutes = require("./modules/alert/alert.routes");
const auditLogRoutes = require("./modules/audit-log/audit-log.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const userRoutes      = require("./modules/user/user.routes");
const contactRoutes   = require("./modules/contact/contact.routes");
const equipmentRoutes = require("./modules/equipment/equipment.routes");


app.get("/api/auth/me", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated user",
    data: {
      userId: req.user.userId,
    },
  });
});
app.get(
  "/api/admin/test",
  authenticate,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Admin authorization successful",
      data: {
        userId: req.user.userId,
        roles: req.user.roles,
      },
    });
  }
);

app.use("/api/auth", authRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/laboratories", laboratoryRoutes);
app.use("/api/chemicals", chemicalRoutes);
app.use("/api/chemical-categories",chemicalCategoryRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/storage-locations",storageLocationRoutes);
app.use("/api/chemical-batches", chemicalBatchRoutes);
app.use("/api/chemical-requests", chemicalRequestRoutes);
app.use("/api/chemical-issuances",chemicalIssuanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/contact",   contactRoutes);
app.use("/api/equipment", equipmentRoutes);

module.exports = app;