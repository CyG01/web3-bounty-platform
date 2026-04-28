const REPORT_PREFIX = 'bounty_reports_';
const HIDDEN_PREFIX = 'bounty_hidden_';
const HIDE_THRESHOLD = Number(import.meta.env.VITE_BOUNTY_REPORT_HIDE_THRESHOLD || 3);

const SPAM_GUARD_API_URL = String(import.meta.env.VITE_SPAM_GUARD_API_URL || '').trim();

function reportKey(bountyId: number) {
  return `${REPORT_PREFIX}${bountyId}`;
}

function hiddenKey() {
  return HIDDEN_PREFIX;
}

export function getReportCount(bountyId: number) {
  const raw = globalThis.localStorage?.getItem(reportKey(bountyId));
  return raw ? Number(raw) || 0 : 0;
}

export function reportBounty(bountyId: number) {
  const next = getReportCount(bountyId) + 1;
  globalThis.localStorage?.setItem(reportKey(bountyId), String(next));

  if (next >= HIDE_THRESHOLD) {
    const hidden = getHiddenBountyIds();
    hidden.add(bountyId);
    globalThis.localStorage?.setItem(hiddenKey(), JSON.stringify(Array.from(hidden)));
  }

  return next;
}

export function getHiddenBountyIds() {
  try {
    const raw = globalThis.localStorage?.getItem(hiddenKey());
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(arr.filter((n) => Number.isFinite(n)).map((n) => Number(n)));
  } catch {
    return new Set<number>();
  }
}

export async function fetchHiddenBountyIdsRemote(): Promise<Set<number>> {
  if (!SPAM_GUARD_API_URL) return new Set<number>();
  const res = await globalThis.fetch(`${SPAM_GUARD_API_URL.replace(/\/+$/, '')}/hidden`, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`SpamGuard HTTP ${res.status}`);
  const json = (await res.json()) as { hidden?: number[] };
  const arr = Array.isArray(json.hidden) ? json.hidden : [];
  return new Set(arr.filter((n) => Number.isFinite(n)).map((n) => Number(n)));
}

export async function reportBountyRemote(
  bountyId: number
): Promise<{ next: number; threshold: number }> {
  if (!SPAM_GUARD_API_URL) {
    return { next: reportBounty(bountyId), threshold: reportHideThreshold() };
  }
  const res = await globalThis.fetch(`${SPAM_GUARD_API_URL.replace(/\/+$/, '')}/report`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ bountyId }),
  });
  if (!res.ok) throw new Error(`SpamGuard HTTP ${res.status}`);
  const json = (await res.json()) as { next?: number; threshold?: number; hidden?: number[] };

  if (Array.isArray(json.hidden)) {
    try {
      globalThis.localStorage?.setItem(hiddenKey(), JSON.stringify(json.hidden));
    } catch {
      // ignore storage errors
    }
  }

  return {
    next: Number(json.next || 0),
    threshold: Number(json.threshold || reportHideThreshold()),
  };
}

export function isHiddenBounty(bountyId: number) {
  return getHiddenBountyIds().has(bountyId);
}

export function reportHideThreshold() {
  return HIDE_THRESHOLD;
}
