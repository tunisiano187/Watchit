'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';

interface PreviewArticle {
  title: string;
  url: string;
  publishedDate: string | null;
  summary: string | null;
}

interface Labels {
  name: string;
  topic: string;
  preview: string;
  create: string;
  previewLoading: string;
  backToEdit: string;
  noPreviewResults: string;
}

export default function NewFeedWizard({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [articles, setArticles] = useState<PreviewArticle[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isCreating, startCreate] = useTransition();

  function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !topic.trim()) return;
    setPreviewError(null);

    startPreview(async () => {
      const res = await fetch('/api/feeds/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) {
        setPreviewError('Preview failed. Please try again.');
        return;
      }
      const data: PreviewArticle[] = await res.json();
      setArticles(data);
      setStep('preview');
    });
  }

  function handleCreate() {
    startCreate(async () => {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, topic }),
      });
      if (!res.ok) return;
      const feed = await res.json();
      router.push(`/feeds/${feed.id}`);
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db',
    borderRadius: 6, boxSizing: 'border-box', marginBottom: 16,
  };
  const btnPrimary: React.CSSProperties = {
    padding: '8px 20px', fontSize: 14, fontWeight: 600, border: 'none',
    borderRadius: 6, background: '#111', color: '#fff', cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px', fontSize: 14, border: '1px solid #d1d5db',
    borderRadius: 6, background: '#fff', cursor: 'pointer',
  };

  if (step === 'preview') {
    return (
      <div style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 20, fontSize: 13, color: '#6b7280' }}>
          <strong style={{ color: '#111' }}>{name}</strong>
          {' · '}
          <span>{topic}</span>
        </div>

        {articles.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14 }}>{labels.noPreviewResults}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {articles.map((a, i) => (
              <div key={i} style={{ padding: 14, border: '1px solid #e5e5e5', borderRadius: 8 }}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 14, fontWeight: 600, color: '#111', textDecoration: 'none' }}
                >
                  {a.title}
                </a>
                {a.publishedDate && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(a.publishedDate).toLocaleDateString()}
                  </div>
                )}
                {a.summary && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                    {a.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            style={{ ...btnPrimary, opacity: isCreating ? 0.6 : 1, cursor: isCreating ? 'not-allowed' : 'pointer' }}
          >
            {labels.create}
          </button>
          <button onClick={() => setStep('form')} style={btnSecondary}>
            {labels.backToEdit}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePreview} style={{ maxWidth: 440 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        {labels.name}
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={inputStyle}
        autoFocus
      />

      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        {labels.topic}
      </label>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        required
        style={inputStyle}
      />

      {previewError && (
        <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{previewError}</p>
      )}

      <button
        type="submit"
        disabled={isPreviewing}
        style={{ ...btnPrimary, opacity: isPreviewing ? 0.6 : 1, cursor: isPreviewing ? 'not-allowed' : 'pointer' }}
      >
        {isPreviewing ? labels.previewLoading : labels.preview}
      </button>
    </form>
  );
}
