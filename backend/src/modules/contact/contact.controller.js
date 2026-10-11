const { prisma } = require("../../config/database");
const { sendEmail } = require("../../utils/email");

/**
 * Create a contact message
 *
 * POST /api/contact
 */
const createContactMessage = async (req, res) => {
  try {
    const { name, email, department, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required",
      });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        department: department?.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Contact message submitted successfully",
      data: contactMessage,
    });
  } catch (error) {
    console.error("Create contact message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit contact message",
    });
  }
};

/**
 * Get all contact messages
 *
 * GET /api/contact
 * ADMIN only
 */
const getAllContactMessages = async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Contact messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    console.error("Get contact messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve contact messages",
    });
  }
};

/**
 * Get contact message by ID
 *
 * GET /api/contact/:id
 * ADMIN only
 */
const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({
      where: {
        id,
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact message retrieved successfully",
      data: message,
    });
  } catch (error) {
    console.error("Get contact message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve contact message",
    });
  }
};

/**
 * Mark contact message as read
 *
 * PATCH /api/contact/:id/read
 * ADMIN only
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({
      where: {
        id,
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: {
        id,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Mark as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
    });
  }
};

/**
 * Delete contact message
 *
 * DELETE /api/contact/:id
 * ADMIN only
 */
const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({
      where: {
        id,
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    await prisma.contactMessage.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Contact message deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete contact message",
    });
  }
};

/**
 * Reply to contact message via email
 *
 * POST /api/contact/:id/reply
 * ADMIN only
 */
const replyToContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    if (!replyMessage || replyMessage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const message = await prisma.contactMessage.findUnique({
      where: {
        id,
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reply to your message</h2>
        <p>Dear ${message.name},</p>
        <p>Thank you for contacting us. Here is our response to your message:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Your original message:</strong></p>
          <p style="margin: 10px 0; color: #666;">${message.message}</p>
        </div>
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Our reply:</strong></p>
          <p style="margin: 10px 0; color: #333;">${replyMessage}</p>
        </div>
        <p>If you have any further questions, please don't hesitate to contact us again.</p>
        <p>Best regards,<br>HULMS Team</p>
      </div>
    `;

    const textContent = `
Dear ${message.name},

Thank you for contacting us. Here is our response to your message:

Your original message:
${message.message}

Our reply:
${replyMessage}

If you have any further questions, please don't hesitate to contact us again.

Best regards,
HULMS Team
    `;

    await sendEmail({
      to: message.email,
      subject: `Re: ${message.subject}`,
      html: htmlContent,
      text: textContent,
    });

    await prisma.contactMessage.update({
      where: {
        id,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (error) {
    console.error("Reply to contact message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
};

module.exports = {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  markAsRead,
  deleteContactMessage,
  replyToContactMessage,
};
