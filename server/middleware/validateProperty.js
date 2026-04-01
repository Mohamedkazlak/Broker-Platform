/**
 * Middleware to validate property data before sending to Supabase.
 * Enforces required fields for create; optional fields may be null/empty only when not required.
 */

const REQUIRED_FIELDS_CREATE = [
  'title',
  'description',
  'property_type',
  'status',
  'price',
  'currency',
  'location',
  'city',
  'building_type',
  'finishing',
  'bedrooms',
  'bathrooms',
  'area_sqft',
  'furnished',
  'amenities',
];

const NOT_NULL_FIELDS = [
  'title',
  'description',
  'property_type',
  'status',
  'price',
  'currency',
  'location',
  'city',
  'building_type',
  'finishing',
  'bedrooms',
  'bathrooms',
  'area_sqft',
  'furnished',
  'amenities',
  'price_negotiable',
  'featured',
];

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  // Allow empty array for amenities (field is present, no items selected)
  return false;
}

export const validatePropertyCreate = (req, res, next) => {
  const missing = [];

  for (const field of REQUIRED_FIELDS_CREATE) {
    const value = req.body[field];
    if (isEmpty(value)) {
      missing.push(field);
    }
  }

  // Conditional: apartment_level required when building_type is 'apartment'
  const buildingType = req.body.building_type;
  if (buildingType === 'apartment') {
    const level = req.body.apartment_level;
    if (level === undefined || level === null || level === '') {
      missing.push('apartment_level');
    }
  }

  // Conditional: villa_levels required when building_type is 'villa'
  if (buildingType === 'villa') {
    const levels = req.body.villa_levels;
    if (levels === undefined || levels === null || levels === '') {
      missing.push('villa_levels');
    }
  }

  if (missing.length > 0) {
    return res.status(400).json({
      status: 'error',
      error: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  next();
};

export const validatePropertyUpdate = (req, res, next) => {
  const invalid = [];

  // If client is sending a field to update, it cannot be null/empty if it's in the NOT NULL list
  for (const field of NOT_NULL_FIELDS) {
    if (Object.hasOwnProperty.call(req.body, field) && isEmpty(req.body[field])) {
      invalid.push(field);
    }
  }

  // Conditional: when building_type is 'apartment', apartment_level must be present and non-empty
  const buildingType = req.body.building_type;
  if (buildingType === 'apartment') {
    const level = req.body.apartment_level;
    if (level === undefined || level === null || level === '') {
      invalid.push('apartment_level');
    }
  }
  if (buildingType === 'villa') {
    const levels = req.body.villa_levels;
    if (levels === undefined || levels === null || levels === '') {
      invalid.push('villa_levels');
    }
  }

  if (invalid.length > 0) {
    return res.status(400).json({
      status: 'error',
      error: `These fields cannot be null or empty: ${invalid.join(', ')}`,
    });
  }

  next();
};
