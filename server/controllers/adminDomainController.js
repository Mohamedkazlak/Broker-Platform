import { brokerModel } from "../models/brokerModel.js";
import { paymentModel } from "../models/paymentModel.js";
import {
  attachDomainOnRender,
  ensureDomainDns,
} from "../services/domainProvisioning.js";
import { refundAndRevertBroker } from "../services/domainFailure.js";

function adminActor(req) {
  return {
    id: req.admin?.id,
    email: req.admin?.email,
  };
}

function logAdminAction(action, req, brokerId, extra = "") {
  const actor = adminActor(req);
  const when = new Date().toISOString();
  console.log(
    `[admin-domain] action=${action} by=${actor.email || actor.id} at=${when} broker=${brokerId}${extra ? ` ${extra}` : ""}`,
  );
  return { actor, when };
}

function toIssueDto(broker) {
  return {
    brokerId: broker.id,
    platformName: broker.platform_name,
    email: broker.email,
    subdomain: broker.subdomain,
    customDomain: broker.custom_domain,
    domainStatus: broker.domain_status,
    lastError: broker.domain_last_error,
    dnsAttempts: broker.domain_dns_attempts,
    verifyAttempts: broker.domain_verify_attempts,
    nameComOrderId: broker.name_com_order_id,
    renderDomainId: broker.render_domain_id,
    domainExpiresAt: broker.domain_expires_at,
    package: broker.package,
    updatedAt: broker.updated_at,
    createdAt: broker.created_at,
  };
}

/**
 * GET /api/admin/domains/issues
 * Cases for the admin Domain issues page (UI in Phase 6).
 */
export const listDomainIssues = async (req, res, next) => {
  try {
    const rows = await brokerModel.findDomainNeedsReview();
    res.json({
      status: "success",
      data: rows.map(toIssueDto),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/domains/:brokerId/retry-dns
 * Manual DNS retry (admin only). Logged with who/when.
 */
export const retryDns = async (req, res, next) => {
  try {
    const broker = await brokerModel.findById(req.params.brokerId);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }
    if (!broker.custom_domain) {
      return res.status(400).json({
        status: "error",
        error: "Broker has no custom domain",
      });
    }

    const { actor, when } = logAdminAction("retry-dns", req, broker.id);
    await brokerModel.update(broker.id, {
      domain_status: "dns_pending",
      domain_last_error: `[admin retry-dns] by=${actor.email || actor.id} at=${when}`,
    });

    try {
      await ensureDomainDns(broker.custom_domain);
      await attachDomainOnRender(
        broker.id,
        broker.custom_domain,
        `[admin-domain] retry-dns broker=${broker.id}`,
      );
    } catch (err) {
      const message = err?.message || String(err);
      await brokerModel.update(broker.id, {
        domain_status: "needs_review",
        domain_last_error: `[admin retry-dns failed] by=${actor.email || actor.id} at=${when}: ${message}`,
      });
      return res.status(502).json({
        status: "error",
        error: message,
      });
    }

    const updated = await brokerModel.findById(broker.id);
    res.json({ status: "success", data: toIssueDto(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/domains/:brokerId/retry-render
 * Manual Render attach / verification kick (admin only). Never automatic.
 */
export const retryRender = async (req, res, next) => {
  try {
    const broker = await brokerModel.findById(req.params.brokerId);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }
    if (!broker.custom_domain) {
      return res.status(400).json({
        status: "error",
        error: "Broker has no custom domain",
      });
    }

    const { actor, when } = logAdminAction("retry-render", req, broker.id);
    await brokerModel.update(broker.id, {
      domain_last_error: `[admin retry-render] by=${actor.email || actor.id} at=${when}`,
    });

    try {
      await attachDomainOnRender(
        broker.id,
        broker.custom_domain,
        `[admin-domain] retry-render broker=${broker.id}`,
      );
    } catch (err) {
      const message = err?.message || String(err);
      await brokerModel.update(broker.id, {
        domain_status: "needs_review",
        domain_last_error: `[admin retry-render failed] by=${actor.email || actor.id} at=${when}: ${message}`,
      });
      return res.status(502).json({
        status: "error",
        error: message,
      });
    }

    const updated = await brokerModel.findById(broker.id);
    res.json({ status: "success", data: toIssueDto(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/domains/:brokerId/mark-resolved
 * Admin fixed DNS/Render by hand; domain is live. Sets active.
 */
export const markDomainResolved = async (req, res, next) => {
  try {
    const broker = await brokerModel.findById(req.params.brokerId);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }
    if (!broker.custom_domain) {
      return res.status(400).json({
        status: "error",
        error: "Broker has no custom domain",
      });
    }

    const { actor, when } = logAdminAction("mark-resolved", req, broker.id);
    const updated = await brokerModel.update(broker.id, {
      domain_status: "active",
      domain_last_error: null,
      domain_provisioned_at: new Date().toISOString(),
    });

    console.log(
      `[admin-domain] marked active broker=${broker.id} domain=${broker.custom_domain} by=${actor.email || actor.id} at=${when}`,
    );

    res.json({ status: "success", data: toIssueDto(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/domains/:brokerId/refund-revert
 * Body: { reason: string } — required confirmation reason.
 * Refunds the full payment session amount, reverts broker to free/subdomain.
 * There is deliberately no admin action that buys a domain.
 */
export const refundAndRevert = async (req, res, next) => {
  try {
    const reason = String(req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({
        status: "error",
        error: "Confirmation reason is required",
      });
    }

    const broker = await brokerModel.findById(req.params.brokerId);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    const session = await paymentModel.findLatestDomainSessionForBroker(
      broker.id,
      broker.custom_domain,
    );
    if (!session) {
      return res.status(404).json({
        status: "error",
        error: "No paid custom-domain payment session found for this broker",
      });
    }

    if (session.refund_status === "refunded") {
      return res.status(409).json({
        status: "error",
        error: "Session was already refunded",
      });
    }

    const { actor, when } = logAdminAction(
      "refund-revert",
      req,
      broker.id,
      `session=${session.id} reason=${reason}`,
    );

    const updatedSession = await refundAndRevertBroker({
      session,
      broker,
      reason,
      admin: actor,
    });

    const updatedBroker = await brokerModel.findById(broker.id);

    res.json({
      status: "success",
      data: {
        broker: toIssueDto({
          ...updatedBroker,
          domain_status: updatedBroker.domain_status,
        }),
        session: {
          id: updatedSession.id,
          refundStatus: updatedSession.refund_status,
          refundReason: updatedSession.refund_reason,
          refundedAt: updatedSession.refunded_at,
        },
        resolvedBy: actor.email || actor.id,
        resolvedAt: when,
      },
    });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ status: "error", error: error.message });
    }
    next(error);
  }
};
