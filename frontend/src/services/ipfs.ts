type IpfsJson = Record<string, unknown>;

const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

function normalizeGatewayBase(base: string) {
  return base.replace(/\/+$/, '') + '/';
}

function getGatewayBases(gatewayBase?: string) {
  const fromArg = gatewayBase ? [gatewayBase] : [];
  const fromList = String(import.meta.env.VITE_IPFS_GATEWAYS || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const fromSingle = import.meta.env.VITE_IPFS_GATEWAY
    ? [String(import.meta.env.VITE_IPFS_GATEWAY)]
    : [];
  const bases = [...fromArg, ...fromList, ...fromSingle, DEFAULT_GATEWAY]
    .map(normalizeGatewayBase)
    .filter(Boolean);
  return Array.from(new Set(bases));
}

export function ipfsToHttp(uri: string, gatewayBase?: string) {
  const base = normalizeGatewayBase(
    gatewayBase || import.meta.env.VITE_IPFS_GATEWAY || DEFAULT_GATEWAY
  );
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

async function fetchWithTimeout(url: string, timeoutMs: number, accept: string) {
  const controller = new globalThis.AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await globalThis.fetch(url, {
      signal: controller.signal,
      headers: { accept },
    });
    if (!res.ok) throw new Error(`IPFS gateway HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchIpfsJson<T extends IpfsJson = IpfsJson>(
  uri: string,
  opts?: { timeoutMs?: number; gatewayBase?: string }
) {
  const timeoutMs = opts?.timeoutMs ?? 12_000;

  let lastErr: unknown;
  for (const base of getGatewayBases(opts?.gatewayBase)) {
    try {
      const url = ipfsToHttp(uri, base);
      const res = await fetchWithTimeout(url, timeoutMs, 'application/json');
      return (await res.json()) as T;
    } catch (e: unknown) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Failed to load IPFS JSON');
}

export async function fetchIpfsText(
  uri: string,
  opts?: { timeoutMs?: number; gatewayBase?: string }
) {
  const timeoutMs = opts?.timeoutMs ?? 12_000;

  let lastErr: unknown;
  for (const base of getGatewayBases(opts?.gatewayBase)) {
    try {
      const url = ipfsToHttp(uri, base);
      const res = await fetchWithTimeout(url, timeoutMs, 'text/plain,*/*');
      return await res.text();
    } catch (e: unknown) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Failed to load IPFS text');
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

type UploadPayload = {
  title: string;
  markdown: string;
  images?: string[];
};

type PinataResponse = {
  IpfsHash: string;
};

export async function uploadToIpfs(payload: UploadPayload) {
  const jwt = import.meta.env.VITE_PINATA_JWT || '';
  if (!jwt) {
    throw new Error('VITE_PINATA_JWT is not configured');
  }

  const body = {
    pinataMetadata: {
      name: `bounty-${Date.now()}.json`,
    },
    pinataContent: {
      title: payload.title,
      markdown: payload.markdown,
      images: payload.images || [],
    },
  };

  const res = await globalThis.fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as PinataResponse;
  if (!json.IpfsHash) throw new Error('Pinata did not return CID');
  return {
    cid: json.IpfsHash,
    uri: `ipfs://${json.IpfsHash}`,
  };
}
