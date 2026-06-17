import { docker } from './client';

export interface ServiceInfo {
  id: string;
  name: string;
  service: string;
  status: string;
  state: string;
  image: string;
}

export async function listServices(): Promise<ServiceInfo[]> {
  const project = process.env.COMPOSE_PROJECT_NAME ?? 'watchit';
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: [`com.docker.compose.project=${project}`] }),
  });

  return containers.map((c) => ({
    id: c.Id,
    name: c.Names[0]?.replace(/^\//, '') ?? c.Id,
    service: c.Labels['com.docker.compose.service'] ?? '',
    status: c.Status,
    state: c.State,
    image: c.Image,
  }));
}

async function findContainer(serviceOrId: string) {
  const project = process.env.COMPOSE_PROJECT_NAME ?? 'watchit';
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: [`com.docker.compose.project=${project}`] }),
  });

  const match = containers.find(
    (c) =>
      c.Labels['com.docker.compose.service'] === serviceOrId ||
      c.Id === serviceOrId ||
      c.Id.startsWith(serviceOrId)
  );

  if (!match) throw new Error(`No container found for service/id: ${serviceOrId}`);
  return docker.getContainer(match.Id);
}

export async function controlService(
  serviceOrId: string,
  action: 'start' | 'stop' | 'restart'
): Promise<void> {
  const container = await findContainer(serviceOrId);
  try {
    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else await container.restart();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to ${action} service "${serviceOrId}": ${msg}`);
  }
}

export async function getServiceLogs(serviceOrId: string, tail: number): Promise<string> {
  const container = await findContainer(serviceOrId);
  try {
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: false,
    });
    // docker.logs returns a Buffer when follow is false
    const raw = stream as unknown as Buffer;
    // Strip the 8-byte Docker multiplexed stream header from each frame
    const lines: string[] = [];
    let offset = 0;
    while (offset + 8 <= raw.length) {
      const size = raw.readUInt32BE(offset + 4);
      const line = raw.subarray(offset + 8, offset + 8 + size).toString('utf8');
      lines.push(line);
      offset += 8 + size;
    }
    return lines.join('');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch logs for "${serviceOrId}": ${msg}`);
  }
}
