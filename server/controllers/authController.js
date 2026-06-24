import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabase.js";
import { brokerModel } from "../models/brokerModel.js";
import { profileModel } from "../models/profileModel.js";
import { isValidGovernorate } from "../constants/governorates.js";
import { createPendingSubdomain } from "../utils/subdomainGenerator.js";

/** Shared anon client for password sign-in (no per-request allocation). */
const anonAuthClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
  },
);

/**
 * POST /api/auth/register
 * Registers a new broker: creates Auth user → broker row → profile row → returns session.
 */
export const register = async (req, res, next) => {
  try {
    const { formData } = req.body;

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

    // Validate required fields
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

    const existingEmail = await brokerModel.findByEmail(email);

    if (existingEmail) {
      return res.status(409).json({
        status: "error",
        error: "An account with this email already exists",
      });
    }

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for now
      });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Create broker record. Subdomain is assigned later: auto-generated on
    // free-plan selection, or chosen on domain setup for paid plans.
    const pkg = formData.package || "free";
    // ultra is effectively unlimited; large sentinel keeps the numeric column valid
    const packageLimits = { free: 3, plus: 10, pro: 50, ultra: 999999 };
    const broker = await brokerModel.create({
      first_name: firstName,
      last_name: lastName,
      platform_name: platformName,
      subdomain: createPendingSubdomain(),
      email,
      phone_number: phone || "",
      whatsapp_number: whatsapp || "",
      governorate,
      password: "managed-by-supabase-auth", // Auth is handled by Supabase
      package: pkg,
      package_limit: packageLimits[pkg] ?? 5,
      // New signups start unconfirmed: they must pick a plan (and later pay)
      // before going live. The column default is 'active' only so pre-existing
      // rows stay untouched by the migration; we override it explicitly here.
      subscription_status: "pending",
    });

    // 3. Create profile record (links auth user to broker)
    await profileModel.create({
      id: userId,
      broker_id: broker.id,
      full_name: `${firstName} ${lastName}`,
      email,
      phone_number: phone || null,
    });

    const { data: signInData, error: signInError } =
      await anonAuthClient.auth.signInWithPassword({
        email,
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
      },
    });
  } catch (error) {
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
