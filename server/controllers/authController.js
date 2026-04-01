import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase.js';
import { brokerModel } from '../models/brokerModel.js';
import { profileModel } from '../models/profileModel.js';

/**
 * POST /api/auth/register
 * Registers a new broker: creates Auth user → broker row → profile row → returns session.
 */
export const register = async (req, res, next) => {
  try {
    const { formData } = req.body;

    if (!formData) {
      return res.status(400).json({ status: 'error', error: 'Missing form data' });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      platformName,
      subdomain,
      phone,
      whatsapp,
    } = formData;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !platformName || !subdomain) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: email, password, firstName, lastName, platformName, subdomain',
      });
    }

    // Check if subdomain is already taken
    const existingBroker = await brokerModel.findBySubdomain(subdomain);
    if (existingBroker) {
      return res.status(409).json({
        status: 'error',
        error: 'This subdomain is already taken',
      });
    }

    // Check if email is already used
    const existingEmail = await brokerModel.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        status: 'error',
        error: 'An account with this email already exists',
      });
    }

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Create broker record (default package: free; user can change on /subscription)
    const pkg = formData.package || 'free';
    const packageLimits = { free: 5, plus: 10, pro: 50, ultra: 100 };
    const broker = await brokerModel.create({
      first_name: firstName,
      last_name: lastName,
      platform_name: platformName,
      subdomain: subdomain.toLowerCase(),
      email,
      phone_number: phone || '',
      whatsapp_number: whatsapp || '',
      password: 'managed-by-supabase-auth', // Auth is handled by Supabase
      package: pkg,
      package_limit: packageLimits[pkg] ?? 5,
    });

    // 3. Create profile record (links auth user to broker)
    await profileModel.create({
      id: userId,
      broker_id: broker.id,
      full_name: `${firstName} ${lastName}`,
      email,
      phone_number: phone || null,
    });

    // 4. Generate a session for immediate login
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    // Sign in to get actual session tokens
    // Create a temporary anon client to avoid mutating the global supabaseAdmin singleton
    const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
    
    const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    res.status(201).json({
      status: 'success',
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
        status: 'error',
        error: 'Email and password are required',
      });
    }

    const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });

    const { data, error } = await tempClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        status: 'error',
        error: 'Invalid email or password',
      });
    }

    // Fetch broker info for subdomain redirect
    let broker = null;
    try {
      const profileData = await profileModel.findBrokerIdByUserId(data.user.id);

      if (profileData?.broker_id) {
        const brokerData = await brokerModel.findById(profileData.broker_id);
        if (brokerData) {
          broker = {
            id: brokerData.id,
            platform_name: brokerData.platform_name,
            subdomain: brokerData.subdomain,
          };
        }
      }
    } catch (brokerErr) {
      console.error('Error fetching broker for login redirect:', brokerErr);
      // Non-fatal — login still succeeds without broker redirect info
    }

    res.json({
      status: 'success',
      session: data.session,
      user: data.user,
      broker,
    });
  } catch (error) {
    next(error);
  }
};
