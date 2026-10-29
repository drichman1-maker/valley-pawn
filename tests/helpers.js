// Shared test helpers.
export const cell = (text) => (text === '' || text == null ? { kind: 'empty', text: '' } : { kind: 'string', text: String(text), raw: String(text) });
export const num = (n, extra = {}) => ({ kind: 'number', text: String(n), raw: n, ...extra });

export const fileFrom = (name, content) => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content);
  return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
};

export const item = (over = {}) => ({
  item_id: 'PL-1',
  title: 'Drill',
  category: 'Tools',
  price: 100,
  condition: 'Good',
  description: 'Works',
  brand: 'DeWalt',
  model: 'X1',
  status: 'available',
  featured: false,
  date_added: '2026-01-02',
  accessories: '',
  photos: [],
  ...over,
});
