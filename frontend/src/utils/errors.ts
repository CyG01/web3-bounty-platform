export function humanizeWeb3Error(err: unknown) {
  const e = err as Record<string, unknown> | null | undefined;
  const eAny = e as unknown as {
    code?: string;
    message?: string;
    shortMessage?: string;
    reason?: string;
    data?: { message?: string };
    error?: { message?: string };
    info?: { error?: { message?: string; data?: { message?: string } } };
  };

  const candidates: Array<unknown> = [
    eAny?.info?.error?.message,
    eAny?.info?.error?.data?.message,
    eAny?.data?.message,
    eAny?.error?.message,
    eAny?.reason,
    eAny?.shortMessage,
    eAny?.message,
  ];

  let msg = candidates.find((x) => typeof x === 'string' && x.trim().length > 0) as
    | string
    | undefined;
  msg = msg?.trim();
  if (!msg) return 'Something went wrong. Please try again.';

  // Ethers / wallet rejections
  if (eAny?.code === 'ACTION_REJECTED' || /user rejected|rejected the request/i.test(msg)) {
    return 'Request rejected in wallet.';
  }

  // Strip common prefixes
  msg = msg.replace(/^execution reverted:\s*/i, '');
  msg = msg.replace(/^VM Exception while processing transaction:\s*/i, '');
  msg = msg.replace(/^Error:\s*/i, '');

  // Compress noisy RPC errors
  if (/rate limit|429|too many requests/i.test(msg)) {
    return 'RPC rate limited. Please retry in a moment.';
  }
  if (/network error|failed to fetch|timeout|ETIMEDOUT/i.test(msg)) {
    return 'Network/RPC error. Please check your connection and retry.';
  }

  return msg;
}
