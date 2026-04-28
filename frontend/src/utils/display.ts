export function formatCompactAddress(address: string, chars = 4) {
  if (!address) return '';
  const value = String(address).trim();
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}...${value.slice(-chars)}`;
}

export function formatDisplayAmount(
  raw: string | number | bigint,
  opts?: { decimals?: number; maxFraction?: number }
) {
  const decimals = Number.isFinite(opts?.decimals) ? Math.max(0, Number(opts?.decimals)) : 18;
  const maxFraction = Number.isFinite(opts?.maxFraction)
    ? Math.max(0, Number(opts?.maxFraction))
    : 4;

  try {
    const value = typeof raw === 'bigint' ? raw : BigInt(String(raw || '0'));
    const divisor = 10n ** BigInt(decimals);
    const whole = value / divisor;
    const fractionRaw = (value % divisor).toString().padStart(decimals, '0');
    const trimmedFraction = fractionRaw.slice(0, maxFraction).replace(/0+$/, '');
    const body = trimmedFraction ? `${whole.toString()}.${trimmedFraction}` : whole.toString();
    return addThousands(body);
  } catch {
    return String(raw || '0');
  }
}

export function addThousands(value: string) {
  const [whole, fraction] = String(value).split('.');
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${formattedWhole}.${fraction}` : formattedWhole;
}
