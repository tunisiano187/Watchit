import { readFileSync } from 'fs';
import { join } from 'path';
import { getLatestRelease, type GithubRelease } from './github';

export function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    return String(pkg.version ?? '0.0.0');
  } catch {
    return '0.0.0';
  }
}

function semverCompare(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export interface VersionStatus {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  release: GithubRelease | null;
}

export async function checkForUpdates(): Promise<VersionStatus> {
  const current = getCurrentVersion();
  const release = await getLatestRelease();
  const latest = release?.tag_name.replace(/^v/, '') ?? null;
  const updateAvailable = latest ? semverCompare(latest, current) > 0 : false;
  return { current, latest, updateAvailable, release };
}
