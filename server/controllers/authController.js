import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabase.js";
import { brokerModel } from "../models/brokerModel.js";
import { profileModel } from "../models/profileModel.js";
import { isValidGovernorate } from "../constants/governorates.js";
import { validateSubdomainFormat } from "../utils/subdomainValidator.js";
import { generateDefaultSubdomain } from "../utils/subdomainGenerator.js";
import { PLANS_BY_ID } from "../config/plans.js";
import { priceForDomain, DOMAIN_CURRENCY } from "../config/domains.js";

/** Shared anon client for password sign-in (no per-request allocation). */
const anonAuthClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
  },
);

const BILLING_CYCLE_DAYS = 30;

/**
 * GET /api/auth/check-email?email=...
 * Public — advisory check so the register form can reject taken emails before
 * the user starts onboarding (no DB write yet).
 */
export const checkEmail = async (req, res, next) => {
  try {
    const email = String(req.query.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      return res
        .status(400)
        .json({ status: "error", error: "Valid email is required" });
    }

    const existing = await brokerModel.findByEmail(email);
    if (existing) {
      return res.json({ available: false, reason: "taken" });
    }

    res.json({ available: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Build order totals from plan + optional custom domain (server-side only).
 */
function buildRegistrationOrderSummary(pkg, domain) {
  const plan = PLANS_BY_ID[pkg] ?? null;
  const planPrice = plan?.price ?? 0;
  const isCustom = domain?.domain_type === "custom" && !!domain?.custom_domain;
  const domainPrice = isCustom ? priceForDomain(domain.custom_domain) : 0;

  return {
    package: pkg,
    planName: plan?.name ?? pkg,
    planPrice,
    currency: plan?.currency ?? DOMAIN_CURRENCY,
    domainType: domain?.domain_type ?? "subdomain",
    customDomain: isCustom ? domain.custom_domain : null,
    domainPrice,
    total: planPrice + domainPrice,
  };
}

/**
 * Resolve subdomain / custom domain fields for a new broker row.
 */
async function resolveDomainFields(formData, pkg, domain) {
  const plan = PLANS_BY_ID[pkg];

  if (pkg === "free") {
    const subdomain = await generateDefaultSubdomain(
      formData.firstName,
      brokerModel.findIdBySubdomain.bind(brokerModel),
    );
    return {
      domain_type: "subdomain",
      subdomain,
      custom_domain: null,
    };
  }

  if (!domain?.domain_type) {
    throw Object.assign(new Error("Domain choice is required for paid plans"), {
      status: 400,
    });
  }

  if (domain.domain_type === "subdomain") {
    const result = validateSubdomainFormat(domain.subdomain);
    if (!result.valid) {
      throw Object.assign(new Error("Invalid subdomain"), {
        status: 400,
        reason: result.reason,
      });
    }
    const existing = await brokerModel.findIdBySubdomain(result.normalized);
    if (existing) {
      throw Object.assign(new Error("Subdomain already taken"), {
        status: 409,
        reason: "taken",
      });
    }
    return {
      domain_type: "subdomain",
      subdomain: result.normalized,
      custom_domain: null,
    };
  }

  if (domain.domain_type === "custom") {
    if (!plan?.customDomain) {
      throw Object.assign(
        new Error("Custom domains are not available on this plan"),
        { status: 400 },
      );
    }
    const customDomain = String(domain.custom_domain ?? "")
      .trim()
      .toLowerCase();
    if (!customDomain) {
      throw Object.assign(new Error("Custom domain is required"), {
        status: 400,
      });
    }
    const taken = await brokerModel.findByCustomDomain(customDomain);
    if (taken) {
      throw Object.assign(new Error("Custom domain already taken"), {
        status: 409,
        reason: "taken",
      });
    }
    // Paid custom-domain brokers still need a platform subdomain for routing.
    const subdomain = await generateDefaultSubdomain(
      formData.firstName,
      brokerModel.findIdBySubdomain.bind(brokerModel),
    );
    return {
      domain_type: "custom",
      subdomain,
      custom_domain: customDomain,
    };
  }

  throw Object.assign(new Error("Invalid domain_type"), { status: 400 });
}

/**
 * POST /api/auth/complete-registration
 *
 * Creates auth.users + brokers + profiles in one shot when onboarding finishes
 * (free plan selected, or paid payment succeeds). Until this runs, nothing is
 * persisted — the client holds a draft in localStorage.
 *
 * Body: { formData, package, domain?, paymentOutcome? }
 *   - free: domain optional (auto-generated)
 *   - paid: domain required; paymentOutcome must be "succeed"
 */
export const completeRegistration = async (req, res, next) => {
  let createdAuthUserId = null;

  try {
    const { formData, package: pkg, domain, paymentOutcome } = req.body ?? {};

    if (!formData) {
      return res
        .status(400)
        .json({ status: "error", error: "Missing form data" });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      platformName,
      phone,
      whatsapp,
      governorate,
    } = formData;

    if (
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !platformName ||
      !governorate
    ) {
      return res.status(400).json({
        status: "error",
        error:
          "Missing required fields: email, password, firstName, lastName, platformName, governorate",
      });
    }

    if (!isValidGovernorate(governorate)) {
      return res.status(400).json({
        status: "error",
        error: "Invalid governorate",
      });
    }

    const plan = PLANS_BY_ID[pkg];
    if (!plan) {
      return res
        .status(400)
        .json({ status: "error", error: "Invalid plan selected" });
    }

    if (pkg !== "free") {
      if (paymentOutcome !== "succeed") {
        return res.status(400).json({
          status: "error",
          error: "Paid plans require a successful payment before registration",
        });
      }
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingEmail = await brokerModel.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(409).json({
        status: "error",
        error: "An account with this email already exists",
      });
    }

    const domainFields = await resolveDomainFields(formData, pkg, domain);
    const orderSummary = buildRegistrationOrderSummary(pkg, domainFields);

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      });

    if (authError) {
      if (
        authError.message?.toLowerCase().includes("already") ||
        authError.status === 422
      ) {
        return res.status(409).json({
          status: "error",
          error: "An account with this email already exists",
        });
      }
      throw authError;
    }

    const userId = authData.user.id;
    createdAuthUserId = userId;

    const nextBilling =
      pkg === "free"
        ? null
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + BILLING_CYCLE_DAYS);
            return d.toISOString();
          })();

    // 2. Create broker — already active (onboarding finished)
    const broker = await brokerModel.create({
      first_name: firstName,
      last_name: lastName,
      platform_name: platformName,
      subdomain: domainFields.subdomain,
      domain_type: domainFields.domain_type,
      custom_domain: domainFields.custom_domain,
      email: normalizedEmail,
      phone_number: phone || "",
      whatsapp_number: whatsapp || "",
      governorate,
      password: "managed-by-supabase-auth",
      package: pkg,
      package_limit: plan.packageLimit,
      subscription_status: "active",
      next_billing_date: nextBilling,
      billing_amount: pkg === "free" ? 0 : orderSummary.total,
    });

    // 3. Create profile (links auth user to broker)
    await profileModel.create({
      id: userId,
      broker_id: broker.id,
      full_name: `${firstName} ${lastName}`,
      email: normalizedEmail,
      phone_number: phone || null,
    });

    const { data: signInData, error: signInError } =
      await anonAuthClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

    if (signInError) throw signInError;

    res.status(201).json({
      status: "success",
      session: signInData.session,
      broker: {
        id: broker.id,
        platform_name: broker.platform_name,
        subdomain: broker.subdomain,
        package: broker.package,
      },
      redirect: pkg === "free" ? "dashboard" : "branding-setup",
    });
  } catch (error) {
    // Roll back orphan auth user if broker/profile creation failed after it.
    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackErr) {
        console.error(
          "Failed to roll back auth user after registration error:",
          rollbackErr,
        );
      }
    }

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

/**
 * POST /api/auth/login
 * Signs in a user and returns session tokens.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        error: "Email and password are required",
      });
    }

    const { data, error } = await anonAuthClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        status: "error",
        error: "Invalid email or password",
      });
    }

    let broker = null;
    try {
      const brokerData = await profileModel.findBrokerForLoginRedirect(
        data.user.id,
      );
      if (brokerData) {
        broker = {
          id: brokerData.id,
          platform_name: brokerData.platform_name,
          subdomain: brokerData.subdomain,
        };
      }
    } catch (brokerErr) {
      console.error("Error fetching broker for login redirect:", brokerErr);
      // Non-fatal — login still succeeds without broker redirect info
    }

    res.json({
      status: "success",
      session: data.session,
      user: data.user,
      broker,
    });
  } catch (error) {
    next(error);
  }
};
