-- OPTIONAL demo seed for a development project. Do not run against production.
-- Neutral placeholder items without photos. Replace with your own inventory via the Excel import.
insert into public.items (item_id, title, category, price, condition, description, brand, model, accessories, status, featured, date_added) values
  ('DEMO-001', 'Example: cordless drill kit', 'Tools', 129.99, 'Excellent', 'Example listing. Replace with real inventory.', 'Example Brand', 'D-100', 'Battery, charger', 'available', true, current_date - 3),
  ('DEMO-002', 'Example: 14K gold chain, 22 in', 'Jewelry', 850.00, 'Excellent', 'Example listing. Replace with real inventory.', '', '', '', 'available', false, current_date - 2),
  ('DEMO-003', 'Example: electric guitar', 'Musical Instruments', 475.00, 'Good', 'Example listing. Replace with real inventory.', '', '', 'Gig bag', 'available', false, current_date - 1),
  ('DEMO-004', 'Example: game console (sold)', 'Electronics', 399.99, 'Excellent', 'Example sold listing.', '', '', '', 'sold', false, current_date - 10),
  ('DEMO-005', 'Example: watch (draft, hidden)', 'Collectibles', 3450.00, 'Good', 'Draft listings are never public.', '', '', '', 'draft', false, current_date)
on conflict (item_id) do nothing;
