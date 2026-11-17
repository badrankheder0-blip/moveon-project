-- Footer (chrome): the social icons are Instagram, TikTok, X/Twitter and
-- Facebook. The YouTube address rows become the X/Twitter ones (both were
-- empty); the four labels say the icon always shows and the address only makes
-- it a link. Order: Instagram, TikTok, X, Facebook.
--
-- Undo: rename footer.twitter back to footer.youtube and restore the labels
-- ("Footer — <name> address (empty hides the icon)", 72 insta, 73 youtube,
-- 74 facebook, 75 tiktok).
BEGIN;

UPDATE content_blocks SET slot = 'footer.twitter', updated_at = now()
WHERE section = 'chrome' AND slot = 'footer.youtube';

UPDATE content_blocks c SET label = v.label, sort_order = v.sort_order, updated_at = now()
FROM (VALUES
  ('footer.instagram', 'Footer — Instagram address (icon shows; empty = not a link yet)', 72),
  ('footer.tiktok', 'Footer — TikTok address (icon shows; empty = not a link yet)', 73),
  ('footer.twitter', 'Footer — X / Twitter address (icon shows; empty = not a link yet)', 74),
  ('footer.facebook', 'Footer — Facebook address (icon shows; empty = not a link yet)', 75)
) AS v(slot, label, sort_order)
WHERE c.section = 'chrome' AND c.slot = v.slot;

COMMIT;
