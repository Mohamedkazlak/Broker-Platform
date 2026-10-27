import { brokerModel } from "../models/brokerModel.js";
import { paymentModel } from "../models/paymentModel.js";
import { DOMAIN_FULFILLMENT_STUCK_MS } from "../config/billing.js";
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

function attemptsTotal(broker) {
  const dns =
    Number(broker.domain_dns_attempts ?? broker.domain_attempts ?? 0) || 0;
  const verify = Number(broker.domain_verify_attempts ?? 0) || 0;
  return dns + verify;
}

function toSessionSlice(session) {
  if (!session) {
    return {
      sessionId: null,
      sessionAmount: null,
      sessionCurrency: null,
      refundStatus: null,
      refundReason: null,
      fulfillmentStatus: null,
      startedAt: null,
    };
  }
  return {
    sessionId: session.id,
    sessionAmount: Number(session.amount),
    sessionCurrency: session.currency,
    refundStatus: session.refund_status ?? "none",
    refundReason: session.refund_reason ?? null,
    fulfillmentStatus: session.domain_fulfillment_status ?? null,
    startedAt:
      session.completed_at || session.created_at || session.updated_at || null,
  };
}

function toIssueDto(broker, session = null) {
  const sessionSlice = toSessionSlice(session);
  return {
    brokerId: broker.id,
    platformName: broker.platform_name,
    email: broker.email,
    subdomain: broker.subdomain,
    customDomain: broker.custom_domain ?? session?.requested_custom_domain ?? null,
    domainStatus: broker.domain_status,
    lastError: broker.domain_last_error ?? session?.refund_reason ?? null,
    attempts: attemptsTotal(broker),
    dnsAttempts: Number(broker.domain_dns_attempts ?? broker.domain_attempts ?? 0) || 0,
    verifyAttempts: Number(broker.domain_verify_attempts ?? 0) || 0,
    nameComOrderId: broker.name_com_order_id,
    renderDomainId: broker.render_domain_id,
    domainExpiresAt: broker.domain_expires_at,
    package: broker.package,
    updatedAt: broker.updated_at,
    createdAt: broker.created_at,
    startedAt:
      sessionSlice.startedAt ||
      broker.domain_provisioned_at ||
      broker.updated_at ||
      broker.created_at,
    ...sessionSlice,
  };
}

/**
 * GET /api/admin/domains/issues
 * Brokers with needs_review / failed / stuck mid-provision, plus payment
 * sessions with refund_status requested|failed.
 */
export const listDomainIssues = async (req, res, next) => {
  try {
    const olderThanIso = new Date(
      Date.now() - DOMAIN_FULFILLMENT_STUCK_MS,
    ).toISOString();

    const [brokers, refundSessions] = await Promise.all([
      brokerModel.findDomainIssues({ olderThanIso }),
      paymentModel.findDomainRefundIssues(),
    ]);

    const sessionsByBroker = await paymentModel.findLatestDomainSessionsForBrokers(
      brokers.map((b) => b.id),
    );

    const byBrokerId = new Map();
    for (const broker of brokers) {
      byBrokerId.set(
        broker.id,
        toIssueDto(broker, sessionsByBroker.get(broker.id) ?? null),
      );
    }

    for (const session of refundSessions) {
      if (session.broker_id && byBrokerId.has(session.broker_id)) {
        const existing = byBrokerId.get(session.broker_id);
        byBrokerId.set(session.broker_id, {
          ...existing,
          ...toSessionSlice(session),
          startedAt: toSessionSlice(session).startedAt || existing.startedAt,
          lastError: existing.lastError || session.refund_reason || null,
        });
        continue;
      }

      let broker = null;
      if (session.broker_id) {
        broker = await brokerModel.findById(session.broker_id);
      }

      const key = session.broker_id || `session:${session.id}`;
      byBrokerId.set(
        key,
        toIssueDto(
          broker || {
            id: session.broker_id,
            platform_name: null,
            email: null,
            subdomain: null,
            custom_domain: session.requested_custom_domain,
            domain_status: null,
            domain_last_error: session.refund_reason,
            domain_dns_attempts: 0,
            domain_verify_attempts: 0,
            domain_attempts: 0,
            name_com_order_id: null,
            render_domain_id: null,
            domain_expires_at: null,
            domain_provisioned_at: null,
            package: session.package,
            updated_at: session.updated_at,
            created_at: session.created_at,
          },
          session,
        ),
      );
    }

    const data = [...byBrokerId.values()].sort((a, b) => {
      const aAt = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bAt = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bAt - aAt;
    });

    res.json({ status: "success", data });
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
