import crypto from "crypto";
import { brokerModel } from "../models/brokerModel.js";
import { instapayModel } from "../models/instapayModel.js";
import {
  applyPlanChange,
  applyPlanChangeSubdomain,
  resolvePlanChange,
} from "../services/subscription.js";
import { buildOrderSummary } from "../utils/orderSummary.js";
import {
  assertRegistrationFormData,
  buildRegistrationOrderSummary,
  provisionBrokerAccount,
  resolveDomainFields,
  signInWithPassword,
} from "./authController.js";
import { supabaseAdmin } from "../config/supabase.js";
import { PLANS_BY_ID } from "../config/plans.js";
import {
  encryptRegistrationPayload,
  decryptRegistrationPayload,
} from "../utils/registrationPayload.js";
import { createClaimToken, hashClaimToken } from "../utils/claimToken.js";
import { resolveBrokerIdFromAuth } from "../utils/resolveBrokerFromAuth.js";
import {
  INSTAPAY,
  INSTAPAY_ALLOWED_MIME,
  INSTAPAY_RECEIPT_BUCKET,
  INSTAPAY_RECEIPT_MAX_BYTES,
} from "../config/instapay.js";

function decodeReceiptBase64(receipt) {
  if (!receipt || typeof receipt !== "object") {
    throw Object.assign(new Error("Receipt image is required"), {
      status: 400,
    });
  }

  const { data: base64, mimeType, fileName } = receipt;
  if (!base64 || typeof base64 !== "string") {
    throw Object.assign(new Error("Receipt image data is required"), {
      status: 400,
    });
  }
  if (!mimeType || !INSTAPAY_ALLOWED_MIME.has(mimeType)) {
    throw Object.assign(
      new Error("Receipt must be a JPEG, PNG, WebP, or GIF image"),
      { status: 400 },
    );
  }

  const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
  let buffer;
  try {
    buffer = Buffer.from(cleaned, "base64");
  } catch {
    throw Object.assign(new Error("Invalid receipt image encoding"), {
      status: 400,
    });
  }

  if (!buffer.length) {
    throw Object.assign(new Error("Receipt image is empty"), { status: 400 });
  }
  if (buffer.length > INSTAPAY_RECEIPT_MAX_BYTES) {
    throw Object.assign(new Error("Receipt image must be 5 MB or smaller"), {
      status: 400,
    });
  }

  const extFromName = String(fileName ?? "")
    .split(".")
    .pop()
    ?.toLowerCase();
  const extFromMime = mimeType.split("/")[1]?.replace("jpeg", "jpg");
  const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(extFromName)
    ? extFromName === "jpeg"
      ? "jpg"
      : extFromName
    : extFromMime || "jpg";

  return { buffer, mimeType, ext };
}

async function uploadReceipt(folderId, buffer, mimeType, ext) {
  const path = `${folderId}/${Date.now()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(INSTAPAY_RECEIPT_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;
  return path;
}

async function removeReceipt(receiptPath) {
  if (!receiptPath) return;
  try {
    await supabaseAdmin.storage
      .from(INSTAPAY_RECEIPT_BUCKET)
      .remove([receiptPath]);
  } catch (cleanupErr) {
    console.error("Failed to clean up Instapay receipt:", cleanupErr);
  }
}

async function signedReceiptUrl(receiptPath) {
  if (!receiptPath) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(INSTAPAY_RECEIPT_BUCKET)
    .createSignedUrl(receiptPath, 60 * 60);

  if (error) {
    console.error("Failed to sign Instapay receipt URL:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

function toSubmissionDto(
  row,
  { includeReceiptUrl = false, receiptUrl = null } = {},
) {
  if (!row) return null;
  return {
    id: row.id,
    brokerId: row.broker_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    rejectionReason: row.rejection_reason ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // What this payment buys. For an existing broker changing plans these are
    // the *requested* values, which only reach the broker row on approval.
    requestedPackage: row.package ?? null,
    requestedDomainType: row.domain_type ?? null,
    requestedSubdomain: row.reserved_subdomain ?? null,
    requestedCustomDomain: row.reserved_custom_domain ?? null,
    ...(includeReceiptUrl ? { receiptUrl } : {}),
  };
}

/**
 * The plan + domain an approval should switch the broker to, read back off the
 * submission. Falls back to the broker's own values so submissions created
 * before plan changes existed (where these columns just mirrored the broker)
 * still approve as a plain activation.
 */
function planChangeFromSubmission(submission, broker) {
  const domainType = submission.domain_type ?? broker.domain_type;
  const customDomain =
    submission.reserved_custom_domain ?? broker.custom_domain ?? null;
  const wantsCustom = domainType === "custom" && !!customDomain;

  return {
    package: submission.package ?? broker.package,
    domain_type: wantsCustom ? "custom" : "subdomain",
    subdomain: submission.reserved_subdomain ?? broker.subdomain,
    custom_domain: wantsCustom ? customDomain : null,
  };
}

function applicantFromRow(row, broker = null) {
  if (broker) {
    return {
      id: broker.id,
      platformName: broker.platform_name,
      email: broker.email,
      contactName:
        `${broker.first_name ?? ""} ${broker.last_name ?? ""}`.trim() || null,
      plan: broker.package,
      subdomain: broker.subdomain,
    };
  }

  if (!row.email && !row.platform_name) return null;

  return {
    id: null,
    platformName: row.platform_name,
    email: row.email,
    contactName: row.contact_name,
    plan: row.package,
    subdomain: row.reserved_subdomain,
  };
}

/**
 * GET /api/instapay/account
 */
export const getAccount = async (_req, res) => {
  res.json({
    status: "success",
    data: {
      handle: INSTAPAY.handle,
      link: INSTAPAY.link,
      qrImagePath: INSTAPAY.qrImagePath,
    },
  });
};

/**
 * POST /api/instapay/submit-receipt
 *
 * Draft signup (no account yet):
 *   Body: { receipt, formData, package, domain }
 * Existing broker, finishing onboarding or renewing (Authorization Bearer):
 *   Body: { receipt }
 * Existing broker, upgrading / downgrading (Authorization Bearer):
 *   Body: { receipt, package, packageCategory, domain }
 */
export const submitReceipt = async (req, res, next) => {
  try {
    const brokerId = await resolveBrokerIdFromAuth(req);

    // Awaited (not just returned) so a rejection stays inside this try/catch
    // — see the identical fix in paymentController.js's checkout() for why
    // a bare `return submitReceiptForX(...)` would otherwise skip the catch
    // below and fall through to the generic error handler as an opaque 500.
    if (brokerId) {
      await submitReceiptForBroker(req, res, brokerId);
    } else {
      await submitReceiptForDraft(req, res);
    }
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ status: "error", error: error.message, reason: error.reason });
    }
    next(error);
  }
};

async function submitReceiptForBroker(req, res, brokerId) {
  const broker = await brokerModel.findById(brokerId);
  if (!broker) {
    return res.status(404).json({ status: "error", error: "Broker not found" });
  }

  // An upgrade / downgrade sends the plan (and optionally the domain) it is
  // paying for; without one this is the normal "finish paying for the plan
  // already on my row" case.
  const change = await resolvePlanChange(broker, {
    package: req.body?.package,
    packageCategory: req.body?.packageCategory,
    domain: req.body?.domain,
  });

  if (!change) {
    if (broker.package === "free") {
      return res.status(400).json({
        status: "error",
        error: "Instapay is only available for paid plans",
      });
    }

    if (broker.subscription_status === "active") {
      return res.status(400).json({
        status: "error",
        error: "Subscription is already active",
      });
    }
  }

  const existingPending = await instapayModel.findPendingForBroker(brokerId);
  if (existingPending) {
    return res.status(409).json({
      status: "error",
      error: "A payment is already awaiting review",
      submission: toSubmissionDto(existingPending),
    });
  }

  const { buffer, mimeType, ext } = decodeReceiptBase64(req.body?.receipt);
  const summary = change ? change.summary : buildOrderSummary(broker);
  const { token, hash } = createClaimToken();
  const receiptPath = await uploadReceipt(brokerId, buffer, mimeType, ext);

  let submission;
  try {
    submission = await instapayModel.create({
      brokerId,
      amount: summary.total,
      currency: summary.currency,
      receiptPath,
      receiptMimeType: mimeType,
      claimTokenHash: hash,
      email: broker.email,
      platformName: broker.platform_name,
      contactName:
        `${broker.first_name ?? ""} ${broker.last_name ?? ""}`.trim() || null,
      package: change?.package ?? broker.package,
      reservedSubdomain: change?.subdomain ?? broker.subdomain,
      reservedCustomDomain: change
        ? change.custom_domain
        : broker.custom_domain,
      domainType: change?.domain_type ?? broker.domain_type,
    });
  } catch (err) {
    await removeReceipt(receiptPath);
    if (err?.code === "23505") {
      // Someone else's pending payment claimed the domain between validation
      // and insert — the only unique conflict that isn't about this broker.
      const collidedOnDomain = /subdomain|custom_domain/.test(
        `${err.message ?? ""}${err.details ?? ""}`,
      );
      return res.status(409).json({
        status: "error",
        error: collidedOnDomain
          ? "That domain is no longer available"
          : "A payment is already awaiting review",
        reason: collidedOnDomain ? "taken" : undefined,
      });
    }
    throw err;
  }

  // A broker with a live subscription keeps it (and their current plan) while
  // the receipt is reviewed — only an unpaid subscription waits as 'pending'.
  if (
    broker.subscription_status !== "active" &&
    broker.subscription_status !== "pending"
  ) {
    await brokerModel.update(brokerId, { subscription_status: "pending" });
  }

  // The plan waits for the admin, the address doesn't.
  const { subdomain, applied: subdomainApplied } =
    await applyPlanChangeSubdomain(broker, change);

  res.status(201).json({
    status: "success",
    data: toSubmissionDto(submission),
    subdomain,
    subdomainApplied,
    claimToken: token,
    // Tells the client to send them back to their dashboard instead of the
    // onboarding "waiting for approval" screen.
    planChange: !!change,
  });
}

async function submitReceiptForDraft(req, res) {
  const {
    formData,
    package: pkg,
    packageCategory,
    domain,
    receipt,
  } = req.body ?? {};

  assertRegistrationFormData(formData);

  const plan = PLANS_BY_ID[pkg];
  if (!plan || pkg === "free") {
    return res.status(400).json({
      status: "error",
      error: "Instapay is only available for paid plans",
    });
  }

  const normalizedEmail = String(formData.email).trim().toLowerCase();
  const existingEmail = await brokerModel.findByEmail(normalizedEmail);
  if (existingEmail) {
    return res.status(409).json({
      status: "error",
      error: "An account with this email already exists",
    });
  }

  const pendingEmail = await instapayModel.findPendingByEmail(normalizedEmail);
  if (pendingEmail) {
    return res.status(409).json({
      status: "error",
      error: "A payment for this email is already awaiting review",
    });
  }

  const domainFields = await resolveDomainFields(formData, pkg, domain);

  if (domainFields.subdomain) {
    const pendingSub = await instapayModel.findPendingBySubdomain(
      domainFields.subdomain,
    );
    if (pendingSub) {
      return res.status(409).json({
        status: "error",
        error: "Subdomain already taken",
        reason: "taken",
      });
    }
  }

  if (domainFields.custom_domain) {
    const pendingCustom = await instapayModel.findPendingByCustomDomain(
      domainFields.custom_domain,
    );
    if (pendingCustom) {
      return res.status(409).json({
        status: "error",
        error: "Custom domain already taken",
        reason: "taken",
      });
    }
  }

  const summary = buildRegistrationOrderSummary(pkg, domainFields);
  const { buffer, mimeType, ext } = decodeReceiptBase64(receipt);
  const { token, hash } = createClaimToken();
  const folderId = crypto.randomUUID();
  const receiptPath = await uploadReceipt(folderId, buffer, mimeType, ext);

  const registrationPayload = encryptRegistrationPayload({
    formData: {
      ...formData,
      email: normalizedEmail,
    },
    package: pkg,
    packageCategory,
    domain,
    domainFields,
  });

  let submission;
  try {
    submission = await instapayModel.create({
      brokerId: null,
      amount: summary.total,
      currency: summary.currency,
      receiptPath,
      receiptMimeType: mimeType,
      registrationPayload,
      claimTokenHash: hash,
      email: normalizedEmail,
      platformName: formData.platformName,
      contactName: `${formData.firstName} ${formData.lastName}`.trim(),
      package: pkg,
      reservedSubdomain: domainFields.subdomain,
      reservedCustomDomain: domainFields.custom_domain,
      domainType: domainFields.domain_type,
    });
  } catch (err) {
    await removeReceipt(receiptPath);
    if (err?.code === "23505") {
      return res.status(409).json({
        status: "error",
        error: "Email or domain is already reserved by a pending payment",
      });
    }
    throw err;
  }

  res.status(201).json({
    status: "success",
    data: toSubmissionDto(submission),
    subdomain: domainFields.subdomain,
    claimToken: token,
  });
}

/**
 * GET /api/instapay/status?token=...
 * Public claim-token poll. When approved, returns a one-time session.
 */
export const getStatus = async (req, res, next) => {
  try {
    const token = String(req.query.token ?? "").trim();
    if (!token) {
      return res.status(400).json({
        status: "error",
        error: "Claim token is required",
      });
    }

    const submission = await instapayModel.findByClaimTokenHash(
      hashClaimToken(token),
    );
    if (!submission) {
      return res.status(404).json({
        status: "error",
        error: "Submission not found",
      });
    }

    const subdomain =
      submission.reserved_subdomain ??
      (submission.broker_id
        ? (await brokerModel.findById(submission.broker_id))?.subdomain
        : null);

    let subscriptionStatus = "pending";
    let session = null;

    if (submission.broker_id) {
      const broker = await brokerModel.findById(submission.broker_id);
      subscriptionStatus = broker?.subscription_status ?? "pending";
    }

    if (submission.status === "approved") {
      subscriptionStatus = "active";

      if (submission.registration_payload?.formData?.passwordEnc) {
        try {
          const decrypted = decryptRegistrationPayload(
            submission.registration_payload,
          );
          session = await signInWithPassword(
            decrypted.formData.email,
            decrypted.formData.password,
          );
          await instapayModel.update(submission.id, {
            registration_payload: null,
          });
        } catch (handOffErr) {
          console.error("Instapay session handoff failed:", handOffErr);
        }
      }
    }

    res.json({
      status: "success",
      data: {
        subscriptionStatus,
        subdomain,
        package: submission.package,
        submission: toSubmissionDto(submission),
        session,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/instapay/my-submission
 * Authenticated — the broker's own most recent submission, so the dashboard can
 * show "payment awaiting review" (or why it was rejected) without a claim token.
 */
export const getMySubmission = async (req, res, next) => {
  try {
    const brokerId = await resolveBrokerIdFromAuth(req);
    if (!brokerId) {
      return res
        .status(401)
        .json({ status: "error", error: "Authentication required" });
    }

    const submission = await instapayModel.findLatestForBroker(brokerId);
    if (!submission) {
      return res.json({ status: "success", data: null });
    }

    const broker = await brokerModel.findById(brokerId);

    res.json({
      status: "success",
      data: {
        ...toSubmissionDto(submission),
        currentPackage: broker?.package ?? null,
        // Lets the dashboard tell an already-applied subdomain (it matches)
        // apart from one still waiting on approval (it doesn't).
        currentSubdomain: broker?.subdomain ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/instapay
 */
export const adminListSubmissions = async (req, res, next) => {
  try {
    const status = req.query.status || "pending_review";
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const offset = (page - 1) * limit;

    const { rows, total } = await instapayModel.list({ status, limit, offset });

    const brokerIds = [
      ...new Set(rows.map((r) => r.broker_id).filter(Boolean)),
    ];
    const brokersById = {};
    await Promise.all(
      brokerIds.map(async (id) => {
        const broker = await brokerModel.findById(id);
        if (broker) brokersById[id] = broker;
      }),
    );

    const data = await Promise.all(
      rows.map(async (row) => {
        const broker = row.broker_id ? brokersById[row.broker_id] : null;
        const receiptUrl = await signedReceiptUrl(row.receipt_path);
        return {
          ...toSubmissionDto(row, { includeReceiptUrl: true, receiptUrl }),
          broker: applicantFromRow(row, broker),
        };
      }),
    );

    res.json({
      status: "success",
      data,
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
 * PATCH /api/admin/instapay/:id
 * Approve (deferred signup): provisions auth.users + brokers + profiles.
 * Approve (existing broker): activates subscription.
 */
export const adminReviewSubmission = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body ?? {};
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({
        status: "error",
        error: "action must be 'approve' or 'reject'",
      });
    }

    const submission = await instapayModel.findById(req.params.id);
    if (!submission) {
      return res
        .status(404)
        .json({ status: "error", error: "Submission not found" });
    }

    if (submission.status !== "pending_review") {
      return res.status(409).json({
        status: "error",
        error: "Submission has already been reviewed",
        submission: toSubmissionDto(submission),
      });
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      const reason = String(rejectionReason ?? "").trim();
      if (!reason) {
        return res.status(400).json({
          status: "error",
          error: "rejectionReason is required when rejecting",
        });
      }

      const updated = await instapayModel.update(submission.id, {
        status: "rejected",
        rejection_reason: reason,
        reviewed_by: req.admin.id,
        reviewed_at: now,
        registration_payload: null,
      });

      return res.json({
        status: "success",
        data: toSubmissionDto(updated),
      });
    }

    let broker = submission.broker_id
      ? await brokerModel.findById(submission.broker_id)
      : null;
    let subdomain = broker?.subdomain ?? submission.reserved_subdomain;

    if (!broker) {
      if (!submission.registration_payload) {
        return res.status(400).json({
          status: "error",
          error: "Submission is missing registration data",
        });
      }

      const decrypted = decryptRegistrationPayload(
        submission.registration_payload,
      );

      const provisioned = await provisionBrokerAccount({
        formData: decrypted.formData,
        package: decrypted.package,
        packageCategory: decrypted.packageCategory,
        domain: decrypted.domain,
        domainFields: decrypted.domainFields,
        billingAmount: Number(submission.amount),
      });

      broker = provisioned.broker;
      subdomain = broker.subdomain;

      await instapayModel.update(submission.id, {
        broker_id: broker.id,
        status: "approved",
        rejection_reason: null,
        reviewed_by: req.admin.id,
        reviewed_at: now,
      });
    } else {
      // Applies the plan / domain this receipt paid for — for a plain
      // activation those values are the broker's own, so it just activates.
      const updatedBroker = await applyPlanChange(
        broker.id,
        planChangeFromSubmission(submission, broker),
        { billingAmount: Number(submission.amount) },
      );
      subdomain = updatedBroker.subdomain;

      await instapayModel.update(submission.id, {
        status: "approved",
        rejection_reason: null,
        reviewed_by: req.admin.id,
        reviewed_at: now,
      });
    }

    const updated = await instapayModel.findById(submission.id);

    res.json({
      status: "success",
      data: toSubmissionDto(updated),
      subdomain,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        status: "error",
        error: error.message,
        reason: error.reason,
      });
    }
    next(error);
  }
};
