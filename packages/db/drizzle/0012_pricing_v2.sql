-- Pricing version 2: the rate card the admin prototype's Pricing screen edits
-- and the booking prototype prices with. Every amount includes VAT.
-- Rates an office already set under the same key are kept; the version-1
-- keys the engine no longer reads are removed.
INSERT INTO "price_settings" ("key", "label", "value", "unit") VALUES
  ('km', 'Distance', '1.90', 'EUR'),
  ('m3', 'Transport volume', '14.00', 'EUR'),
  ('hour', 'Mover, per hour', '32.00', 'EUR'),
  ('floor_move', 'Stairs without elevator', '15.00', 'EUR'),
  ('floor_large', 'Large items by stairs', '8.00', 'EUR'),
  ('pack', 'Packing service', '8.00', 'EUR'),
  ('move_min', 'Minimum moving order', '0.00', 'EUR'),
  ('clean_m2', 'Moving clean', '4.90', 'EUR'),
  ('clean_min', 'Minimum cleaning order', '99.00', 'EUR'),
  ('win_standard', 'Standard window', '11.00', 'EUR'),
  ('win_patio', 'Balcony / patio door', '12.00', 'EUR'),
  ('win_large', 'Large / floor-to-ceiling glass', '0.00', 'EUR'),
  ('win_roof', 'Roof window / skylight', '0.00', 'EUR'),
  ('asm_dis', 'Dismantling', '10.00', 'EUR'),
  ('asm_re', 'Assembly', '12.00', 'EUR'),
  ('asm_both', 'Dismantling + assembly', '20.00', 'EUR'),
  ('sp_piano', 'Piano', '150.00', 'EUR'),
  ('sp_safe', 'Safe / strongbox', '120.00', 'EUR'),
  ('sp_aquarium', 'Aquarium / vivarium', '90.00', 'EUR'),
  ('sp_gym', 'Gym equipment', '60.00', 'EUR'),
  ('sp_heavy', 'Very heavy items (over 100 kg)', '80.00', 'EUR'),
  ('sp_artwork', 'Fragile artwork & mirrors', '25.00', 'EUR'),
  ('sat_move', 'Saturday · moving', '50.00', 'EUR'),
  ('sat_other', 'Saturday · cleaning & renovation', '40.00', 'EUR'),
  ('holiday', 'Public holiday', '60.00', 'EUR'),
  ('transport_insurance', 'Transport insurance', '45.00', 'EUR')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
DELETE FROM "price_settings" WHERE "key" IN (
  'base_rate_moving', 'base_rate_disposal', 'base_rate_cleaning',
  'per_sqm_moving', 'per_sqm_disposal', 'per_sqm_cleaning',
  'per_km', 'per_km_long_distance', 'long_distance_from_km',
  'floor_surcharge_percent', 'packing_service', 'transport_insurance_percent',
  'crew_of_three_surcharge', 'second_van_surcharge', 'saturday_surcharge_percent',
  'business_discount_percent', 'minimum_order_value', 'hours_per_sqm', 'hours_base'
);
