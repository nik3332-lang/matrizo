-- Minimal local-dev seed data: enough to exercise the catalog and
-- serviceability routes end-to-end. Not meant for the real remote DB.

INSERT INTO categories (id, slug, name, icon, sort_order) VALUES
  ('cat_cement', 'cement', 'Cement & Concrete', '🧱', 1),
  ('cat_plumbing', 'plumbing', 'Plumbing', '🚰', 2),
  ('cat_electrical', 'electrical', 'Electrical', '🔌', 3);

INSERT INTO products (id, sku, slug, category_id, name, description, unit, base_price, active) VALUES
  ('prod_opc53', 'CEM-OPC53-50', 'ultratech-opc-53-grade-cement', 'cat_cement', 'UltraTech OPC 53 Grade Cement', '53-grade ordinary portland cement, 50kg bag', 'bag', 420, true),
  ('prod_ppc', 'CEM-PPC-50', 'ambuja-ppc-cement', 'cat_cement', 'Ambuja PPC Cement', 'Portland pozzolana cement, 50kg bag', 'bag', 380, true),
  ('prod_pvc-pipe', 'PLB-PVC-2IN', 'pvc-pipe-2-inch', 'cat_plumbing', 'PVC Pipe 2 inch', 'Schedule 40 PVC pipe, 3m length', 'piece', 240, true),
  ('prod_wire-1p5', 'ELC-WIRE-1P5', 'copper-wire-1-5mm', 'cat_electrical', 'Copper Wire 1.5mm', 'FR-grade copper wire, 90m coil', 'coil', 1150, true);

INSERT INTO bulk_pricing_tiers (id, product_id, min_qty, price_per_unit) VALUES
  ('tier_opc53_15', 'prod_opc53', 15, 400),
  ('tier_opc53_50', 'prod_opc53', 50, 385),
  ('tier_ppc_15', 'prod_ppc', 15, 365);

INSERT INTO stores (id, name, line1, city, state, pincode, lat, lng, active) VALUES
  ('store_hsr', 'Matrizo Dark Store - HSR Layout', '27th Main Road, HSR Layout Sector 2', 'Bengaluru', 'Karnataka', '560102', 12.9121, 77.6446, true),
  ('store_whitefield', 'Matrizo Dark Store - Whitefield', 'ITPL Main Road', 'Bengaluru', 'Karnataka', '560066', 12.9698, 77.7500, true);

INSERT INTO store_service_pincodes (store_id, pincode, eta_minutes) VALUES
  ('store_hsr', '560102', 45),
  ('store_hsr', '560103', 60),
  ('store_whitefield', '560066', 40),
  ('store_whitefield', '560103', 75);

INSERT INTO inventory (store_id, product_id, stock_qty) VALUES
  ('store_hsr', 'prod_opc53', 200),
  ('store_hsr', 'prod_ppc', 150),
  ('store_hsr', 'prod_pvc-pipe', 80),
  ('store_whitefield', 'prod_opc53', 120),
  ('store_whitefield', 'prod_wire-1p5', 60);
