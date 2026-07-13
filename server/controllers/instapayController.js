import crypto from "crypto";
import { brokerModel } from "../models/brokerModel.js";
import { instapayModel } from "../models/instapayModel.js";
import { profileModel } from "../models/profileModel.js";
import { activateSubscription } from "./brokerController.js";
import {
  assertRegistrationFormData,
  buildRegistrationOrderSummary,
  provisionBrokerAccount,
  resolveDomainFields,
  signInWithPassword,
} from "./authController.js";
import { supabaseAdmin } from "../config/supabase.js";
import { PLANS_BY_ID } from "../config/plans.js";
import { priceForDomain, DOMAIN_CURRENCY } from "../config/domains.js";
import { encryptString, decryptString } from "../utils/secretBox.js";
import {
  INSTAPAY,
  INSTAPAY_ALLOWED_MIME,
  INSTAPAY_RECEIPT_BUCKET,
  INSTAPAY_RECEIPT_MAX_BYTES,
} from "../config/instapay.js";

function buildOrderSummary(broker) {
  const plan = PLANS_BY_ID[broker.package] ?? null;
  const planPrice = plan?.price ?? 0;
  const isCustom = broker.domain_type === "custom" && !!broker.custom_domain;
  const domainPrice = isCustom ? priceForDomain(broker.custom_domain) : 0;

  return {
    package: broker.package,
    planName: plan?.name ?? broker.package,
    planPrice,
    currency: plan?.currency ?? DOMAIN_CURRENCY,
    domainType: broker.domain_type,
    customDomain: isCustom ? broker.custom_domain : null,
    domainPrice,
    total: planPrice + domainPrice,
  };
}

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

function hashClaimToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createClaimToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashClaimToken(token) };
}

function encryptRegistrationPayload({
  formData,
  package: pkg,
  domain,
  domainFields,
}) {
  const passwordEnc = encryptString(formData.password);
  const { password: _omit, ...safeForm } = formData;
  return {
    formData: { ...safeForm, passwordEnc },
    package: pkg,
    domain,
    domainFields,
  };
}

function decryptRegistrationPayload(payload) {
  if (!payload?.formData?.passwordEnc) {
    throw Object.assign(new Error("Registration payload is missing"), {
      status: 500,
    });
  }
  const password = decryptString(payload.formData.passwordEnc);
  const { passwordEnc: _omit, ...rest } = payload.formData;
  return {
    formData: { ...rest, password },
    package: payload.package,
    domain: payload.domain,
    domainFields: payload.domainFields,
  };
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
    ...(includeReceiptUrl ? { receiptUrl } : {}),
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

async function resolveBrokerIdFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const row = await profileModel.findBrokerIdByUserId(user.id);
  return row?.broker_id ?? null;
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
 * Existing broker upgrade (Authorization Bearer):
 *   Body: { receipt }
 */
export const submitReceipt = async (req, res, next) => {
  try {
    const brokerId = await resolveBrokerIdFromAuth(req);

    if (brokerId) {
      return submitReceiptForBroker(req, res, brokerId);
    }

    return submitReceiptForDraft(req, res);
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

  const existingPending = await instapayModel.findPendingForBroker(brokerId);
  if (existingPending) {
    return res.status(409).json({
      status: "error",
      error: "A payment is already awaiting review",
      submission: toSubmissionDto(existingPending),
    });
  }

  const { buffer, mimeType, ext } = decodeReceiptBase64(req.body?.receipt);
  const summary = buildOrderSummary(broker);
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
      package: broker.package,
      reservedSubdomain: broker.subdomain,
      reservedCustomDomain: broker.custom_domain,
      domainType: broker.domain_type,
    });
  } catch (err) {
    await removeReceipt(receiptPath);
    if (err?.code === "23505") {
      return res.status(409).json({
        status: "error",
        error: "A payment is already awaiting review",
      });
    }
    throw err;
  }

  if (broker.subscription_status !== "pending") {
    await brokerModel.update(brokerId, { subscription_status: "pending" });
  }

  res.status(201).json({
    status: "success",
    data: toSubmissionDto(submission),
    subdomain: broker.subdomain,
    claimToken: token,
  });
}

async function submitReceiptForDraft(req, res) {
  const { formData, package: pkg, domain, receipt } = req.body ?? {};

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
      await activateSubscription(broker.id, {
        package: broker.package,
        billingAmount: Number(submission.amount),
      });

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
