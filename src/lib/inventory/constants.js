// Shared inventory vocabulary. supabase/migrations enforces the same lists in SQL.

export const STATUSES = ['available', 'sold', 'draft', 'archived'];

// Only these statuses may be read by the public (enforced by row-level security).
export const PUBLIC_STATUSES = ['available', 'sold'];

// Canonical condition labels and accepted spellings (case-insensitive).
export const CONDITIONS = ['Brand New', 'Like New', 'Excellent', 'Good', 'Fair', 'For Parts'];
export const CONDITION_SYNONYMS = {
  'brand new': 'Brand New',
  new: 'Brand New',
  'new in box': 'Brand New',
  'like new': 'Like New',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  'for parts': 'For Parts',
  'parts only': 'For Parts',
};

export const TEXT_LIMITS = {
  item_id: 64,
  title: 200,
  category: 60,
  brand: 100,
  model: 100,
  description: 5000,
  accessories: 1000,
};

export const MAX_PRICE = 9_999_999.99;
export const MAX_PHOTOS_PER_ITEM = 12;

// Item fields compared when deciding whether an imported row changes an item.
export const COMPARED_FIELDS = [
  'title',
  'category',
  'price',
  'condition',
  'description',
  'brand',
  'model',
  'status',
  'featured',
  'date_added',
  'accessories',
  'photo_urls',
];

// Fields a blank cell may clear when the owner picks "blank cells clear the field".
export const CLEARABLE_FIELDS = ['condition', 'description', 'brand', 'model', 'accessories', 'featured', 'photo_urls'];

export const FIELD_LABELS = {
  item_id: 'Item number',
  title: 'Title',
  category: 'Category',
  price: 'Price',
  condition: 'Condition',
  description: 'Description',
  brand: 'Brand',
  model: 'Model',
  status: 'Status',
  featured: 'Featured',
  date_added: 'Date added',
  accessories: 'Accessories',
  photo_urls: 'Photo links',
};
