USE ghana_pos;

INSERT INTO categories (name, description) VALUES
  ('Beverages', 'Cold and hot drinks'),
  ('Snacks', 'Snacks and quick bites'),
  ('Household', 'Household essentials'),
  ('Personal Care', 'Toiletries and personal care');

INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES
  ('System Administrator', 'admin@ghpos.local', '$2a$10$0vYQm1aWq/wrmPbVf8r7nOHiqKxZa.S5Skd6BgIAs0e.1sJ02Y1vC', 'admin', 1);

INSERT INTO products (category_id, name, barcode, description, price, cost_price, stock, low_stock_threshold, is_active) VALUES
  (1, 'Mineral Water 500ml', '100001', 'Packaged drinking water', 2.50, 1.20, 45, 10, 1),
  (1, 'Coca-Cola 350ml', '100002', 'Soft drink', 4.00, 1.60, 30, 8, 1),
  (2, 'Plantain Chips', '100003', 'Salted plantain chips', 3.50, 1.40, 18, 6, 1),
  (2, 'Ghanaian Bread', '100004', 'Fresh bread loaf', 8.00, 4.20, 12, 5, 1),
  (3, 'Laundry Detergent', '100005', 'Laundry detergent 1kg', 15.00, 9.00, 9, 5, 1),
  (4, 'Toothpaste', '100006', 'Family toothpaste 100ml', 6.50, 3.20, 14, 6, 1);
