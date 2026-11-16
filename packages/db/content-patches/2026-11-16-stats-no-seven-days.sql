-- Stats (homepage and Über uns share them): "7 Tage Service" is wrong — m.on
-- does not work seven days a week. It is removed until the client gives the
-- figure that replaces it; 1,000+ Umzüge and 98% pünktlich stay. The office
-- can add, edit or remove stats under Inhalte bearbeiten → Startseite →
-- Zahlen.
--
-- Undo: re-insert home stats.3.value / stats.3.label from git history.
BEGIN;
DELETE FROM content_blocks WHERE section = 'home' AND slot IN ('stats.3.value', 'stats.3.label');
COMMIT;
