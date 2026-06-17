import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { listServices } from '@/lib/docker/services';
import { checkForUpdates } from '@/lib/updater/checker';
import { getUpdateStatus } from '@/lib/updater/trigger';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const user = await getCurrentUser();
  const t = await getTranslations('Admin');

  if (!user?.isAdmin) {
    return <p style={{ color: '#dc2626' }}>{t('accessDenied')}</p>;
  }

  const [services, versionStatus, updateStatus] = await Promise.all([
    listServices().catch(() => []),
    checkForUpdates(),
    getUpdateStatus(),
  ]);

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
  };

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: 24, fontSize: 22, fontWeight: 700 }}>{t('title')}</h1>
      <AdminDashboard
        initialServices={services}
        initialVersionStatus={versionStatus}
        initialUpdateStatus={updateStatus}
        labels={labels}
      />
    </div>
  );
}
