import { adminModel } from "../models/adminModel.js";

/**
 * Derive a single account status for the UI from the broker's suspend flag
 * (`is_active`) and billing state (`subscription_status`). A suspended broker
 * always reads as "suspended" regardless of billing state.
 */
function deriveStatus(broker) {
  if (broker.is_active === false) return "suspended";
  return broker.subscription_status ?? "pending";
}

/** Shape a broker row for admin list/detail responses. */
function toBrokerSummary(broker) {
  return {
    id: broker.id,
    name: broker.platform_name,
    contactName:
      `${broker.first_name ?? ""} ${broker.last_name ?? ""}`.trim() || null,
    email: broker.email,
    subdomain: broker.subdomain,
    customDomain: broker.custom_domain ?? null,
    plan: broker.package,
    status: deriveStatus(broker),
    signupDate: broker.created_at,
  };
}

/**
 * GET /api/admin/me
 * Returns the current admin's identity, or 403 (handled by requireAdmin).
 */
export const getMe = async (req, res) => {
  res.json({
    status: "success",
    data: {
      id: req.admin.id,
      email: req.admin.email,
      full_name: req.admin.full_name ?? null,
    },
  });
};

/**
 * GET /api/admin/dashboard-stats
 * Aggregate broker counts for the dashboard home stat cards.
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminModel.getDashboardStats();
    res.json({ status: "success", data: stats });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/brokers
 * Paginated broker list. Query params: search, status, page, limit.
 */
export const listBrokers = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const offset = (page - 1) * limit;

    const { rows, total } = await adminModel.listBrokers({
      search,
      status,
      limit,
      offset,
    });

    res.json({
      status: "success",
      data: rows.map(toBrokerSummary),
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
 * GET /api/admin/brokers/:brokerId
 * Single broker detail (profile + domain + plan + status + signup date).
 */
export const getBrokerDetail = async (req, res, next) => {
  try {
    const broker = await adminModel.getBrokerDetail(req.params.brokerId);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    res.json({
      status: "success",
      data: {
        id: broker.id,
        firstName: broker.first_name,
        lastName: broker.last_name,
        platformName: broker.platform_name,
        email: broker.email,
        phoneNumber: broker.phone_number,
        whatsappNumber: broker.whatsapp_number,
        governorate: broker.governorate,
        subdomain: broker.subdomain,
        customDomain: broker.custom_domain ?? null,
        domainType: broker.domain_type,
        plan: broker.package,
        packageLimit: broker.package_limit,
        status: deriveStatus(broker),
        isActive: broker.is_active,
        subscriptionStatus: broker.subscription_status,
        signupDate: broker.created_at,
        // TODO: properties list (Prompt: Properties section)
        // TODO: payment history (Prompt: Payments section)
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/brokers/:brokerId/status
 * Body: { status: 'active' | 'suspended' }.
 * Maps onto the existing `is_active` boolean (see adminModel.setBrokerActive).
 */
export const updateBrokerStatus = async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    if (status !== "active" && status !== "suspended") {
      return res.status(400).json({
        status: "error",
        error: "status must be 'active' or 'suspended'",
      });
    }

    const updated = await adminModel.setBrokerActive(
      req.params.brokerId,
      status === "active",
    );
    if (!updated) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    res.json({
      status: "success",
      data: {
        id: updated.id,
        status: deriveStatus(updated),
        isActive: updated.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
};
