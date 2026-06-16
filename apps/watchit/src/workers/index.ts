import { startDigestWorker } from './digestWorker';
import { startPreferenceWorker } from './preferenceWorker';
import { startCleanupWorker, registerCleanupJobs } from './cleanupWorker';
import { startSchedulerWorker, registerScheduler } from './scheduler';

async function main() {
  await registerScheduler();
  await registerCleanupJobs();

  startDigestWorker();
  startPreferenceWorker();
  startCleanupWorker();
  startSchedulerWorker();

  console.log('Watchit worker started: digest, preference-update, cleanup, scheduler queues active.');
}

main().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});
