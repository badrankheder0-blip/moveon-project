-- Top bar "Buchung verwalten": shown only to signed-in customers (SiteHeader),
-- and pointing at the bookings themselves (/konto/auftraege) rather than the
-- account overview. A guest opening the address is sent to the sign-in page
-- and back afterwards (middleware.ts).
--
-- Undo: set chrome topbar.links.6.href back to '/konto'.
BEGIN;
UPDATE content_blocks SET value = '/konto/auftraege', updated_at = now()
WHERE section = 'chrome' AND slot = 'topbar.links.6.href' AND value = '/konto';
COMMIT;
