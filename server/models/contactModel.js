import { supabaseAdmin } from '../config/supabase.js';

/**
 * Contact message database operations.
 * Public insert (anyone can send a message), broker-scoped reads.
 */

export const contactModel = {
  async findAll(brokerId) {
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .select(
        'id,broker_id,property_id,name,email,phone,subject,message,read,created_at',
      )
      .eq('broker_id', brokerId)
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

  async markAsRead(id, brokerId) {
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .update({ read: true })
      .eq('id', id)
      .eq('broker_id', brokerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id, brokerId) {
    const { error } = await supabaseAdmin
      .from('contact_messages')
      .delete()
      .eq('id', id)
      .eq('broker_id', brokerId);

    if (error) throw error;
  },

  async countUnread(brokerId) {
    const { count, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
      .eq('broker_id', brokerId);

    if (error) throw error;
    return count;
  },
};
