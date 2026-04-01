import { brokerModel } from '../models/brokerModel.js';

/**
 * GET /api/brokers/subdomain/:subdomain
 * Public — resolves a broker by subdomain.
 */
export const getBySubdomain = async (req, res, next) => {
  try {
    const data = await brokerModel.findBySubdomain(req.params.subdomain);

    if (!data) {
      return res.status(404).json({ status: 'error', error: 'Broker not found' });
    }

    res.json({
      status: 'success',
      data: {
        id: data.id,
        platform_name: data.platform_name,
        subdomain: data.subdomain,
        email: data.email,
        phone_number: data.phone_number,
        whatsapp_number: data.whatsapp_number,
        package: data.package,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/brokers/:id
 * Authenticated — returns full broker details.
 */
export const getById = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: 'error', error: 'Access denied' });
    }

    const data = await brokerModel.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ status: 'error', error: 'Broker not found' });
    }

    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/brokers/:id
 * Authenticated — updates broker settings (only owner).
 */
export const update = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: 'error', error: 'Access denied' });
    }

    const { id, package: pkg, package_limit, created_at, ...safeUpdates } = req.body;

    const data = await brokerModel.update(req.params.id, safeUpdates);
    res.json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};
