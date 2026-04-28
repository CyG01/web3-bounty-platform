const AUTH_API_URL = String(import.meta.env.VITE_AUTH_API_URL || '').trim();

function randomNonce(len = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export type SiweSession = {
  address: string;
  chainId: number;
  message: string;
  signature: string;
  token?: string;
  issuedAt: string;
};

export async function fetchNonce(address: string) {
  if (!AUTH_API_URL) return randomNonce();
  const res = await globalThis.fetch(
    `${AUTH_API_URL.replace(/\/+$/, '')}/nonce?address=${encodeURIComponent(address)}`,
    {
      method: 'GET',
      headers: { accept: 'application/json' },
    }
  );
  if (!res.ok) throw new Error(`Auth HTTP ${res.status}`);
  const json = (await res.json()) as { nonce?: string };
  return String(json.nonce || randomNonce());
}

export function buildSiweMessage(opts: {
  domain: string;
  address: string;
  uri: string;
  version?: string;
  chainId: number;
  nonce: string;
  statement?: string;
  issuedAt?: string;
}) {
  const version = opts.version || '1';
  const issuedAt = opts.issuedAt || new Date().toISOString();
  const statement = opts.statement ? `${opts.statement}\n` : '';

  return `${opts.domain} wants you to sign in with your Ethereum account:\n${opts.address}\n\n${statement}URI: ${opts.uri}\nVersion: ${version}\nChain ID: ${opts.chainId}\nNonce: ${opts.nonce}\nIssued At: ${issuedAt}`;
}

export async function signInWithEthereum(
  provider: unknown,
  opts: { address: string; chainId: number }
) {
  const p = provider as {
    getSigner?: () => Promise<{ signMessage: (msg: string) => Promise<string> }>;
  };
  if (!p?.getSigner) throw new Error('No provider available');

  const nonce = await fetchNonce(opts.address);
  const domain = globalThis.location?.host || 'localhost';
  const uri = globalThis.location?.origin || 'http://localhost:5173';

  const issuedAt = new Date().toISOString();
  const message = buildSiweMessage({
    domain,
    address: opts.address,
    uri,
    chainId: opts.chainId,
    nonce,
    statement: 'Sign in to Web3Bounty.',
    issuedAt,
  });

  const signer = await p.getSigner();
  const signature = await signer.signMessage(message);

  let token: string | undefined;
  if (AUTH_API_URL) {
    const res = await globalThis.fetch(`${AUTH_API_URL.replace(/\/+$/, '')}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ message, signature }),
    });
    if (!res.ok) throw new Error(`Auth HTTP ${res.status}`);
    const json = (await res.json()) as { token?: string };
    token = json.token ? String(json.token) : undefined;
  }

  const session: SiweSession = {
    address: opts.address,
    chainId: opts.chainId,
    message,
    signature,
    token,
    issuedAt,
  };
  return session;
}
