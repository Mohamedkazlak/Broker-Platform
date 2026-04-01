import { supabaseAdmin } from '../config/supabase.js';

/**
 * Property database operations.
 * Public reads use supabaseAdmin. Broker-scoped writes are filtered by broker_id.
 */

/** List view: omit description (large TEXT) to reduce payload and IO. Detail uses findById. */
const PROPERTY_LIST_COLUMNS = [
  'id',
  'broker_id',
  'property_code',
  'title',
  'property_type',
  'status',
  'price',
  'currency',
  'price_negotiable',
  'contract_duration',
  'location',
  'city',
  'country',
  'building_type',
  'apartment_level',
  'villa_levels',
  'finishing',
  'bedrooms',
  'bathrooms',
  'area_sqft',
  'furnished',
  'amenities',
  'featured',
  'image_url',
  'image_urls',
  'video_urls',
  'created_at',
  'updated_at',
].join(',');

export const propertyModel = {
  async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('properties')
      .select(PROPERTY_LIST_COLUMNS)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.broker_id) query = query.eq('broker_id', filters.broker_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.property_type) query = query.eq('property_type', filters.property_type);
    if (filters.building_type) query = query.eq('building_type', filters.building_type);
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.minPrice) query = query.gte('price', filters.minPrice);
    if (filters.maxPrice) query = query.lte('price', filters.maxPrice);

    // Text search across title, description, and location
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
      );
    }

    // Pagination
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const offset = parseInt(filters.offset) || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(propertyData) {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .insert(propertyData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, brokerId, updates) {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('broker_id', brokerId)   // Ensure broker can only update their own
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id, brokerId) {
    const { error } = await supabaseAdmin
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('broker_id', brokerId);   // Ensure broker can only delete their own

    if (error) throw error;
  },

  async countByBroker(brokerId) {
    const { count, error } = await supabaseAdmin
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', brokerId);

    if (error) throw error;
    return count;
  },
};
