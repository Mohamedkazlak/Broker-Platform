import validator from 'validator';
import { contactModel } from '../models/contactModel.js';

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
        status: 'error',
        error: 'Missing required fields: name, email, subject, message',
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid email address',
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
    res.status(201).json({ status: 'success', data });
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
    const data = await contactModel.findAll();
    res.json({ status: 'success', data });
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
    const data = await contactModel.markAsRead(req.params.id);
    res.json({ status: 'success', data });
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
    await contactModel.delete(req.params.id);
    res.json({ status: 'success', message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
};
