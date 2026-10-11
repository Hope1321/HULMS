const { prisma } = require("../../config/database");
const {
  hashPassword,
  comparePassword,
} = require("../../utils/password");
const { generateAccessToken } = require("../../utils/jwt");

const registerUser = async ({
  firstName,
  lastName,
  email,
  phone,
  password,
  userType = "STUDENT",
  collegeId,
  departmentId,
}) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Validate userType — only these three can self-register
  const ALLOWED_TYPES = ["STUDENT", "RESEARCHER", "LECTURER"];
  const roleName = ALLOWED_TYPES.includes(userType.toUpperCase())
    ? userType.toUpperCase()
    : "STUDENT";

  // Validate collegeId if provided
  if (collegeId) {
    const college = await prisma.college.findUnique({ where: { id: collegeId } });
    if (!college) throw new Error("Selected college not found");
  }

  // Validate departmentId if provided
  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new Error("Selected department not found");
    // Ensure department belongs to the selected college
    if (collegeId && dept.collegeId !== collegeId) {
      throw new Error("Department does not belong to the selected college");
    }
  }

  const hashedPassword = await hashPassword(password);

  // Create user, set ACTIVE immediately, assign role — all in one transaction
  const { user, roles } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        status: "ACTIVE",
        ...(collegeId    && { collegeId }),
        ...(departmentId && { departmentId }),
      },
    });

    const role = await tx.role.findUnique({ where: { name: roleName } });
    if (role) {
      await tx.userRole.create({
        data: { userId: newUser.id, roleId: role.id },
      });
    }

    return {
      user: newUser,
      roles: role ? [roleName] : [],
    };
  });

  const token = generateAccessToken({ userId: user.id });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles,
    },
    token,
  };
};

const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await comparePassword(password, user.password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const roles = user.roles.map((ur) => ur.role.name);

  const token = generateAccessToken({ userId: user.id });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles,
    },
    token,
  };
};

module.exports = {
  registerUser,
  loginUser,
};