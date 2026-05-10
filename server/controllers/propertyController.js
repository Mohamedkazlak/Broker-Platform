import { propertyModel } from "../models/propertyModel.js";
import { brokerModel } from "../models/brokerModel.js";
import { getBrokerBySubdomainCached } from "../utils/subdomainBrokerCache.js";

/**
 * GET /api/properties
 * Public — returns filtered list of properties.
 *
 * When the request comes in on a broker subdomain (req.subdomain set by
 * subdomain.middleware.js), the listing is automatically scoped to that
 * broker so each tenant only ever sees their own properties.
 */
export const getAll = async (req, res, next) => {
  try {
    const filters = { ...req.query };

    if (req.subdomain) {
      const broker = await getBrokerBySubdomainCached(req.subdomain, () =>
        brokerModel.findBySubdomain(req.subdomain),
      );
      if (!broker) {
        return res
          .status(404)
          .json({ status: "error", error: "Tenant not found" });
      }
      // Subdomain wins over any client-supplied broker_id filter.
      filters.broker_id = broker.id;
    }

    const data = await propertyModel.findAll(filters);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/properties/:id
 * Public — returns a single property by ID.
 */
export const getById = async (req, res, next) => {
  try {
    const data = await propertyModel.findById(req.params.id);

    if (!data) {
      return res
        .status(404)
        .json({ status: "error", error: "Property not found" });
    }

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/properties
 * Authenticated — creates a new property for the broker.
 */
export const create = async (req, res, next) => {
  try {
    const propertyCode = `PR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const furnished = req.body.furnished;
    const furnishedValue =
      furnished === false || furnished === "" || furnished == null
        ? null
        : furnished;

    const propertyData = {
      ...req.body,
      broker_id: req.brokerId,
      property_code: req.body.property_code || propertyCode,
      status: req.body.status ?? "active",
      currency: req.body.currency ?? "EGP",
      price_negotiable: req.body.price_negotiable ?? false,
      featured: req.body.featured ?? false,
      amenities: req.body.amenities ?? [],
      furnished: furnishedValue,
    };

    const data = await propertyModel.create(propertyData);
    res.status(201).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/properties/:id
 * Authenticated — updates a property (only if owned by broker).
 */
export const update = async (req, res, next) => {
  try {
    const data = await propertyModel.update(
      req.params.id,
      req.brokerId,
      req.body,
    );

    if (!data) {
      return res
        .status(404)
        .json({
          status: "error",
          error: "Property not found or not owned by you",
        });
    }

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/properties/:id
 * Authenticated — deletes a property (only if owned by broker).
 */
export const remove = async (req, res, next) => {
  try {
    await propertyModel.delete(req.params.id, req.brokerId);
    res.json({ status: "success", message: "Property deleted" });
  } catch (error) {
    next(error);
  }
};
