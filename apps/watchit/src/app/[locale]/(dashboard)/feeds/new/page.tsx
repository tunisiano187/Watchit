import { getTranslations } from 'next-intl/server';
import NewFeedWizard from './NewFeedWizard';

export default async function NewFeedPage() {
  const t = await getTranslations('Feeds');

  const labels = {
    name: t('name'),
    topic: t('topic'),
    preview: t('preview'),
    create: t('create'),
    previewLoading: t('previewLoading'),
    backToEdit: t('backToEdit'),
    noPreviewResults: t('noPreviewResults'),
  };

  return (
    <main>
      <h1 style={{ marginTop: 0, marginBottom: 24, fontSize: 22, fontWeight: 700 }}>{t('newFeed')}</h1>
      <NewFeedWizard labels={labels} />
    </main>
  );
}
