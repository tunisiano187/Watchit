import { asc } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { listServices } from '@/lib/docker/services';
import { digestQueue, preferenceQueue, cleanupQueue } from '@/lib/queue/jobs';
import { checkForUpdates } from '@/lib/updater/checker';
import { getUpdateStatus } from '@/lib/updater/trigger';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const user = await getCurrentUser();
  const t = await getTranslations('Admin');

  if (!user?.isAdmin) {
    return <p style={{ color: '#dc2626' }}>{t('accessDenied')}</p>;
  }

  const queuesRaw = [digestQueue, preferenceQueue, cleanupQueue];

  const [services, versionStatus, updateStatus, queueStats, userRows] = await Promise.all([
    listServices().catch(() => []),
    checkForUpdates(),
    getUpdateStatus(),
    Promise.all(
      queuesRaw.map(async (q) => {
        const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        return {
          name: q.name,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        };
      }),
    ).catch((): { name: string; waiting: number; active: number; completed: number; failed: number; delayed: number }[] => []),
    db
      .select({ id: users.id, email: users.email, name: users.name, isAdmin: users.isAdmin, createdAt: users.createdAt })
      .from(users)
      .orderBy(asc(users.createdAt))
      .catch(() => []),
  ]);

  const serializedUsers = userRows.map((u) => ({
    ...u,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  }));

  const labels = {
    containers: t('containers'),
    update: t('update'),
    service: t('service'),
    state: t('state'),
    image: t('image'),
    actions: t('actions'),
    start: t('start'),
    stop: t('stop'),
    restart: t('restart'),
    logs: t('logs'),
    closeLogs: t('closeLogs'),
    currentVersion: t('currentVersion'),
    latestVersion: t('latestVersion'),
    upToDate: t('upToDate'),
    updateAvailable: t('updateAvailable'),
    updateNow: t('updateNow'),
    updating: t('updating'),
    updateSuccess: t('updateSuccess'),
    updateError: t('updateError'),
    checkForUpdates: t('checkForUpdates'),
    changelog: t('changelog'),
    noRelease: t('noRelease'),
    queues: t('queues'),
    queueName: t('queueName'),
    waiting: t('waiting'),
    active: t('active'),
    completed: t('completed'),
    failed: t('failed'),
    delayed: t('delayed'),
    users: t('users'),
    email: t('email'),
    adminRole: t('adminRole'),
    makeAdmin: t('makeAdmin'),
    removeAdmin: t('removeAdmin'),
    noUsers: t('noUsers'),
    cannotChangeSelf: t('cannotChangeSelf'),
  };

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: 24, fontSize: 22, fontWeight: 700 }}>{t('title')}</h1>
      <AdminDashboard
        currentUserId={user.id}
        initialServices={services}
        initialVersionStatus={versionStatus}
        initialUpdateStatus={updateStatus}
        initialQueues={queueStats}
        initialUsers={serializedUsers}
        labels={labels}
      />
    </div>
  );
}
