const prisma = require("../config/database");

const createNotification = async ({
  userId,
  title,
  message,
  type,
}) => {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
};

module.exports = {
  createNotification,
};