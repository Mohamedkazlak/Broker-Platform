import { supabaseAdmin } from '../config/supabase.js';

/**
 * Profile database operations.
 * Profiles are linked to Supabase Auth users (auth.users).
 * Uses supabaseAdmin since profile creation happens during registration.
 */

export const profileModel = {
  /** Single-column read for auth checks (faster than select('*')). */
  async findBrokerIdByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('broker_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(profileData) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(userId, updates) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
