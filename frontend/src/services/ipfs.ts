type IpfsJson = Record<string, unknown>;

const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export function ipfsToHttp(uri: string, gatewayBase?: string) {
  const base =
    (gatewayBase || import.meta.env.VITE_IPFS_GATEWAY || DEFAULT_GATEWAY).replace(/\/+$/, '') + '/';
  if (!uri) return uri;

  if (uri.startsWith('ipfs://')) {
    const rest = uri.slice('ipfs://'.length).replace(/^\/+/, '');
    return base + rest;
  }

  if (uri.startsWith('ipfs/')) {
    const rest = uri.replace(/^ipfs\/+/, '');
    return base + rest;
  }

  return uri;
}

export async function fetchIpfsJson<T extends IpfsJson = IpfsJson>(
  uri: string,
  opts?: { timeoutMs?: number }
) {
  const url = ipfsToHttp(uri);
  const timeoutMs = opts?.timeoutMs ?? 12_000;

  const controller = new globalThis.AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await globalThis.fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`IPFS gateway HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchIpfsText(uri: string, opts?: { timeoutMs?: number }) {
  const url = ipfsToHttp(uri);
  const timeoutMs = opts?.timeoutMs ?? 12_000;

  const controller = new globalThis.AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await globalThis.fetch(url, {
      signal: controller.signal,
      headers: { accept: 'text/plain,*/*' },
    });
    if (!res.ok) throw new Error(`IPFS gateway HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export type BountyDescription = {
  title?: string;
  markdown?: string;
  images?: string[];
};

export async function loadBountyDescription(uri: string): Promise<BountyDescription | null> {
  if (!uri) return null;

  // If it's an IPFS/HTTP JSON, parse; otherwise treat as plain text/markdown link.
  try {
    const json = await fetchIpfsJson<BountyDescription>(uri);
    const images = Array.isArray(json.images) ? json.images.map((x) => String(x)) : undefined;
    return {
      title: json.title ? String(json.title) : undefined,
      markdown: json.markdown ? String(json.markdown) : undefined,
      images,
    };
  } catch {
    // Fallback: try as text (markdown)
    try {
      const text = await fetchIpfsText(uri);
      return { markdown: text };
    } catch {
      return null;
    }
  }
}

export async function uploadToIpfs() {
  throw new Error('Not implemented');
}
