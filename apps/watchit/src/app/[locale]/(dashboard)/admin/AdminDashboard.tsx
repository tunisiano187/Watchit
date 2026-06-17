'use client';

import { useState, useCallback } from 'react';
import type { ServiceInfo } from '@/lib/docker/services';
import type { VersionStatus } from '@/lib/updater/checker';
import type { UpdateState } from '@/lib/updater/trigger';

interface UpdateStatus {
  state: UpdateState;
  message: string;
  updatedAt: string | null;
}

interface Props {
  initialServices: ServiceInfo[];
  initialVersionStatus: VersionStatus;
  initialUpdateStatus: UpdateStatus;
  labels: {
    containers: string;
    update: string;
    service: string;
    state: string;
    image: string;
    actions: string;
    start: string;
    stop: string;
    restart: string;
    logs: string;
    closeLogs: string;
    currentVersion: string;
    latestVersion: string;
    upToDate: string;
    updateAvailable: string;
    updateNow: string;
    updating: string;
    updateSuccess: string;
    updateError: string;
    checkForUpdates: string;
    changelog: string;
    noRelease: string;
  };
}

const stateColors: Record<string, string> = {
  running: '#16a34a',
  exited: '#dc2626',
  paused: '#d97706',
  restarting: '#2563eb',
  dead: '#7f1d1d',
};

export default function AdminDashboard({ initialServices, initialVersionStatus, initialUpdateStatus, labels }: Props) {
  const [tab, setTab] = useState<'containers' | 'update'>('containers');
  const [services, setServices] = useState<ServiceInfo[]>(initialServices);
  const [versionStatus, setVersionStatus] = useState<VersionStatus>(initialVersionStatus);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(initialUpdateStatus);
  const [logsService, setLogsService] = useState<string | null>(null);
  const [logsContent, setLogsContent] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [triggeringUpdate, setTriggeringUpdate] = useState(false);

  const refreshServices = useCallback(async () => {
    const res = await fetch('/api/admin/containers');
    if (res.ok) setServices(await res.json());
  }, []);

  const handleControl = useCallback(
    async (service: string, action: 'start' | 'stop' | 'restart') => {
      setActionLoading(`${service}-${action}`);
      try {
        await fetch(`/api/admin/containers/${service}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        await refreshServices();
      } finally {
        setActionLoading(null);
      }
    },
    [refreshServices]
  );

  const handleShowLogs = useCallback(async (service: string) => {
    setLogsService(service);
    setLogsContent('');
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/containers/${service}/logs?tail=200`);
      if (res.ok) setLogsContent(await res.text());
      else setLogsContent('Failed to load logs.');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setCheckingUpdates(true);
    try {
      const res = await fetch('/api/admin/update');
      if (res.ok) {
        const data = await res.json();
        setVersionStatus({ current: data.current, latest: data.latest, updateAvailable: data.updateAvailable, release: data.release });
        setUpdateStatus(data.updateStatus);
      }
    } finally {
      setCheckingUpdates(false);
    }
  }, []);

  const handleUpdate = useCallback(async () => {
    setTriggeringUpdate(true);
    try {
      const res = await fetch('/api/admin/update', { method: 'POST' });
      if (res.ok) {
        setUpdateStatus({ state: 'running', message: labels.updating, updatedAt: new Date().toISOString() });
      }
    } finally {
      setTriggeringUpdate(false);
    }
  }, [labels.updating]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: active ? '2px solid #111' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e5e5', marginBottom: 24 }}>
        <button style={tabStyle(tab === 'containers')} onClick={() => setTab('containers')}>
          {labels.containers}
        </button>
        <button style={tabStyle(tab === 'update')} onClick={() => setTab('update')}>
          {labels.update}
        </button>
      </div>

      {tab === 'containers' && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e5e5' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{labels.service}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{labels.state}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{labels.image}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{svc.service || svc.name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: `${stateColors[svc.state] ?? '#6b7280'}22`,
                        color: stateColors[svc.state] ?? '#6b7280',
                      }}
                    >
                      {svc.state}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: '#555' }}>
                    {svc.image}
                  </td>
                  <td style={{ padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['start', 'stop', 'restart'] as const).map((action) => (
                      <button
                        key={action}
                        disabled={actionLoading === `${svc.service}-${action}`}
                        onClick={() => handleControl(svc.service || svc.id, action)}
                        style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          background: '#fff',
                          cursor: 'pointer',
                          opacity: actionLoading === `${svc.service}-${action}` ? 0.5 : 1,
                        }}
                      >
                        {labels[action]}
                      </button>
                    ))}
                    <button
                      onClick={() => handleShowLogs(svc.service || svc.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        border: '1px solid #d1d5db',
                        borderRadius: 4,
                        background: '#f9fafb',
                        cursor: 'pointer',
                      }}
                    >
                      {labels.logs}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logsService && (
            <div
              style={{
                marginTop: 24,
                border: '1px solid #e5e5e5',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#f9fafb',
                  borderBottom: '1px solid #e5e5e5',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{logsService}</span>
                <button
                  onClick={() => setLogsService(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  {labels.closeLogs}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  background: '#111',
                  color: '#d4d4d4',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: 400,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {logsLoading ? 'Loading…' : logsContent || '(no output)'}
              </pre>
            </div>
          )}
        </div>
      )}

      {tab === 'update' && (
        <div style={{ maxWidth: 640 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ padding: 16, border: '1px solid #e5e5e5', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{labels.currentVersion}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>
                v{versionStatus.current}
              </div>
            </div>
            <div style={{ padding: 16, border: '1px solid #e5e5e5', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{labels.latestVersion}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>
                {versionStatus.latest ? `v${versionStatus.latest}` : '—'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
            {versionStatus.updateAvailable ? (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 13,
                  background: '#fef3c7',
                  color: '#92400e',
                  fontWeight: 500,
                }}
              >
                {labels.updateAvailable}
              </span>
            ) : (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 13,
                  background: '#d1fae5',
                  color: '#065f46',
                  fontWeight: 500,
                }}
              >
                {labels.upToDate}
              </span>
            )}
            <button
              onClick={handleCheckUpdates}
              disabled={checkingUpdates}
              style={{
                padding: '4px 12px',
                fontSize: 13,
                border: '1px solid #d1d5db',
                borderRadius: 4,
                background: '#fff',
                cursor: checkingUpdates ? 'not-allowed' : 'pointer',
                opacity: checkingUpdates ? 0.5 : 1,
              }}
            >
              {labels.checkForUpdates}
            </button>
            {versionStatus.updateAvailable && (
              <button
                onClick={handleUpdate}
                disabled={triggeringUpdate || updateStatus.state === 'running'}
                style={{
                  padding: '4px 12px',
                  fontSize: 13,
                  border: 'none',
                  borderRadius: 4,
                  background: '#111',
                  color: '#fff',
                  cursor: triggeringUpdate || updateStatus.state === 'running' ? 'not-allowed' : 'pointer',
                  opacity: triggeringUpdate || updateStatus.state === 'running' ? 0.6 : 1,
                }}
              >
                {updateStatus.state === 'running' ? labels.updating : labels.updateNow}
              </button>
            )}
          </div>

          {updateStatus.state !== 'idle' && (
            <div
              style={{
                padding: 12,
                borderRadius: 6,
                marginBottom: 24,
                background:
                  updateStatus.state === 'success'
                    ? '#d1fae5'
                    : updateStatus.state === 'error'
                    ? '#fee2e2'
                    : '#dbeafe',
                color:
                  updateStatus.state === 'success'
                    ? '#065f46'
                    : updateStatus.state === 'error'
                    ? '#991b1b'
                    : '#1e40af',
                fontSize: 13,
              }}
            >
              {updateStatus.state === 'success'
                ? labels.updateSuccess
                : updateStatus.state === 'error'
                ? `${labels.updateError}: ${updateStatus.message}`
                : updateStatus.message || labels.updating}
            </div>
          )}

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{labels.changelog}</div>
            {versionStatus.release ? (
              <div
                style={{
                  padding: 16,
                  border: '1px solid #e5e5e5',
                  borderRadius: 6,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  background: '#f9fafb',
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {versionStatus.release.name || versionStatus.release.tag_name}
                </div>
                {versionStatus.release.body || '—'}
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: 13 }}>{labels.noRelease}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
