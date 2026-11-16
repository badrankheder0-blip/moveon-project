# Content patches

One-off changes to the live website copy (`content_blocks`) that the dashboard
cannot express, kept here so each change is in git next to the matching edit of
the seed (`src/pages-content.ts`) and can be read back or reverted.

Apply one with:

    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f content-patches/<file>.sql

Each patch runs in a transaction. Its header says how to undo it.
