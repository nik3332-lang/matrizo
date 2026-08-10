-- Sample Matrizo catalog data (paints, sanitary & plumbing, hardware),
-- matching the categories carried over from the original coming-soon page.
-- Apply with:
--   npx wrangler d1 execute matrizo-db --local  --file=./seed.sql
--   npx wrangler d1 execute matrizo-db --remote --file=./seed.sql

INSERT INTO categories (id, slug, name, icon, parent_id, sort_order) VALUES
  ('cat_paints',   'paints',               'Paints',               '🎨', NULL, 1),
  ('cat_sanitary', 'sanitary-and-plumbing','Sanitary & Plumbing',  '🚿', NULL, 2),
  ('cat_hardware', 'hardware',             'Hardware',             '🔨', NULL, 3);

INSERT INTO products (id, slug, category_id, name, description, unit, base_price, image_url, active) VALUES
  ('prod_paint_tractor_emulsion', 'asian-paints-tractor-emulsion-20l', 'cat_paints',
    'Asian Paints Tractor Emulsion (20L)', 'Smooth matte interior wall emulsion, 20 litre drum.', 'per drum', 3200, NULL, 1),
  ('prod_paint_weathercoat', 'berger-weathercoat-exterior-10l', 'cat_paints',
    'Berger WeatherCoat Exterior Paint (10L)', 'All-weather exterior emulsion with anti-algal protection.', 'per drum', 2400, NULL, 1),
  ('prod_paint_primer', 'wall-primer-4l', 'cat_paints',
    'Wall Primer (4L)', 'Universal wall primer for interior and exterior surfaces.', 'per can', 650, NULL, 1),

  ('prod_pipe_cpvc_1in', 'cpvc-pipe-1-inch-3m', 'cat_sanitary',
    'CPVC Pipe 1 inch (3m length)', 'ASTM-rated CPVC pressure pipe for hot & cold water lines.', 'per piece', 320, NULL, 1),
  ('prod_wc_ewc_set', 'floor-mounted-ewc-commode-set', 'cat_sanitary',
    'Floor Mounted EWC Commode Set', 'Ceramic floor-mounted European water closet with seat cover.', 'per piece', 4500, NULL, 1),
  ('prod_tap_bib_cock', 'brass-bib-cock-tap', 'cat_sanitary',
    'Brass Bib Cock Tap', 'Corrosion-resistant solid brass bib cock with chrome finish.', 'per piece', 180, NULL, 1),

  ('prod_hinge_door_4in', 'stainless-steel-door-hinge-4-inch', 'cat_hardware',
    'Stainless Steel Door Hinge 4-inch', 'Heavy-duty ball-bearing door hinge, pack of 1.', 'per piece', 45, NULL, 1),
  ('prod_lock_mortise', 'mortise-door-lock-set', 'cat_hardware',
    'Mortise Door Lock Set', '3-key mortise lock set with handles, suitable for main doors.', 'per set', 850, NULL, 1),
  ('prod_screw_assorted_box', 'assorted-wood-screws-box-500', 'cat_hardware',
    'Assorted Wood Screws Box (500pcs)', 'Mixed-size wood screws for general carpentry use.', 'per box', 220, NULL, 1);

-- Bulk pricing tiers, matching the 15+/30+/50+ style tiers used by HomeRun.
INSERT INTO bulk_pricing_tiers (id, product_id, min_qty, price_per_unit) VALUES
  ('tier_pipe_15', 'prod_pipe_cpvc_1in', 15, 300),
  ('tier_pipe_30', 'prod_pipe_cpvc_1in', 30, 285),
  ('tier_pipe_50', 'prod_pipe_cpvc_1in', 50, 270),

  ('tier_tap_15', 'prod_tap_bib_cock', 15, 165),
  ('tier_tap_30', 'prod_tap_bib_cock', 30, 155),
  ('tier_tap_50', 'prod_tap_bib_cock', 50, 145),

  ('tier_hinge_15', 'prod_hinge_door_4in', 15, 40),
  ('tier_hinge_30', 'prod_hinge_door_4in', 30, 36),
  ('tier_hinge_50', 'prod_hinge_door_4in', 50, 32),

  ('tier_emulsion_5',  'prod_paint_tractor_emulsion', 5, 3100),
  ('tier_emulsion_10', 'prod_paint_tractor_emulsion', 10, 3000);

-- A few sample serviceable/unserviceable pincodes for the delivery-check endpoint.
INSERT INTO delivery_pincodes (pincode, serviceable, eta_minutes) VALUES
  ('560001', 1, 60),
  ('560100', 1, 90),
  ('110001', 0, 0);
