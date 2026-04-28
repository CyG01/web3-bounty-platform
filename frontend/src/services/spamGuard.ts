const REPORT_PREFIX = 'bounty_reports_';
const HIDDEN_PREFIX = 'bounty_hidden_';
const HIDE_THRESHOLD = Number(import.meta.env.VITE_BOUNTY_REPORT_HIDE_THRESHOLD || 3);

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

export function isHiddenBounty(bountyId: number) {
  return getHiddenBountyIds().has(bountyId);
}

export function reportHideThreshold() {
  return HIDE_THRESHOLD;
}
