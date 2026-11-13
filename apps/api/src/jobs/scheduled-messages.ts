import { logger } from "../lib/logger.js";
import { redis } from "../lib/redis.js";
import { runScheduledMessages } from "../modules/messages/messages.service.js";

/**
 * The clock behind Customer messages: the day-before reminder, the review
 * request, the payment reminder and notifications scheduled for later.
 *
 * Every 15 minutes, which is plenty for messages measured in days. Each run
 * takes a short Redis lock first, so a second API process sharing the database
 * skips the run instead of racing it; the messages themselves are once per
 * order either way (see `runScheduledMessages`).
 */

const EVERY_MS = 15 * 60_000;
/** Shorter than the interval, so a crashed run never holds the next one back. */
const LOCK_SECONDS = 10 * 60;
const LOCK_KEY = "jobs:scheduled-messages";

let timer: NodeJS.Timeout | null = null;

async function tick(): Promise<void> {
  try {
    const locked = await redis.set(LOCK_KEY, String(process.pid), "EX", LOCK_SECONDS, "NX");
    if (locked !== "OK") return;

    const run = await runScheduledMessages(new Date());
    if (run.reminder || run.reviewRequest || run.paymentReminder || run.notifications) {
      logger.info(run, "Scheduled customer messages sent");
    }
  } catch (error) {
    logger.error({ err: error }, "Scheduled customer messages failed");
  }
}

export function startScheduledMessages(): void {
  if (timer) return;
  // A first run shortly after start, then on the interval.
  setTimeout(() => void tick(), 30_000).unref();
  timer = setInterval(() => void tick(), EVERY_MS);
  timer.unref();
}

export function stopScheduledMessages(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
