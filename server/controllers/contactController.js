import validator from "validator";
import { contactModel } from "../models/contactModel.js";

/**
 * POST /api/contact
 * Public — submits a contact message (with input sanitization).
 */
export const create = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: "error",
        error: "Missing required fields: name, email, subject, message",
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        status: "error",
        error: "Invalid email address",
      });
    }

    // Sanitize inputs
    const sanitized = {
      name: validator.escape(validator.trim(name)),
      email: validator.normalizeEmail(email),
      phone: phone ? validator.trim(phone) : null,
      subject: validator.escape(validator.trim(subject)),
      message: validator.escape(validator.trim(message)),
    };

    const data = await contactModel.create(sanitized);
    res.status(201).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contact
 * Authenticated — returns all contact messages for the broker.
 */
export const getAll = async (req, res, next) => {
  try {
    const data = await contactModel.findAll(req.brokerId);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/contact/:id
 * Authenticated — marks a message as read.
 */
export const markAsRead = async (req, res, next) => {
  try {
    const data = await contactModel.markAsRead(req.params.id, req.brokerId);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/contact/:id
 * Authenticated — deletes a contact message.
 */
export const remove = async (req, res, next) => {
  try {
    await contactModel.delete(req.params.id, req.brokerId);
    res.json({ status: "success", message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};

function toMessageDto(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    subject: row.subject,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

/**
 * GET /api/admin/contact-messages
 * Paginated Contact Us inbox. Query: search, status (all|unread|read), page, limit.
 */
export const adminListMessages = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const offset = (page - 1) * limit;

    let read;
    if (status === "unread") read = false;
    else if (status === "read") read = true;

    const { rows, total } = await contactModel.listForAdmin({
      search,
      read,
      limit,
      offset,
    });

    res.json({
      status: "success",
      data: rows.map(toMessageDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/contact-messages/:id
 * Body: { read: boolean }.
 */
export const adminSetMessageRead = async (req, res, next) => {
  try {
    const { read } = req.body ?? {};
    if (typeof read !== "boolean") {
      return res.status(400).json({
        status: "error",
        error: "read must be a boolean",
      });
    }

    const updated = await contactModel.setRead(req.params.id, read);
    if (!updated) {
      return res
        .status(404)
        .json({ status: "error", error: "Message not found" });
    }

    res.json({ status: "success", data: toMessageDto(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/contact-messages/:id
 */
export const adminDeleteMessage = async (req, res, next) => {
  try {
    const deleted = await contactModel.deleteById(req.params.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ status: "error", error: "Message not found" });
    }

    res.json({ status: "success", message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};
