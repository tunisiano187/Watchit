import { getTranslations } from 'next-intl/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { topicPreferences } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

export default async function PreferencesPage() {
  const t = await getTranslations('Preferences');
  const user = await getCurrentUser();

  const preferences = user
    ? await db
        .select()
        .from(topicPreferences)
        .where(eq(topicPreferences.userId, user.id))
        .orderBy(desc(topicPreferences.score))
    : [];

  return (
    <main>
      <h1>{t('title')}</h1>
      <p style={{ color: '#555' }}>{t('description')}</p>

      {preferences.length === 0 ? (
        <p>{t('noData')}</p>
      ) : (
        <div style={{ maxWidth: 480 }}>
          {preferences.map((pref) => {
            const widthPercent = Math.abs(pref.score) * 50; // score in [-1, 1] -> bar half-width
            const isPositive = pref.score >= 0;
            return (
              <div key={pref.topic} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ width: 140, fontSize: 13 }}>{pref.topic}</span>
                <div style={{ flex: 1, position: 'relative', height: 14, background: '#eee' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: isPositive ? '50%' : `${50 - widthPercent}%`,
                      width: `${widthPercent}%`,
                      height: '100%',
                      background: isPositive ? '#2e7d32' : '#c62828',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
