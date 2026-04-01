import { supabaseAdmin } from '../config/supabase.js';

/**
 * Contact message database operations.
 * Public insert (anyone can send a message), broker-scoped reads.
 */

export const contactModel = {
  async findAll() {
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(messageData) {
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsRead(id) {
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabaseAdmin
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async countUnread() {
    const { count, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (error) throw error;
    return count;
  },
};
