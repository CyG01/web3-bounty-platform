const DEFAULT_TEMPLATE = 'https://sepolia.etherscan.io/tx/{txHash}';

export function explorerTxUrl(txHash: string, chainId?: number | null) {
  if (!txHash) return '';

  const templateFromEnv = String(import.meta.env.VITE_EXPLORER_TX_URL_TEMPLATE || '').trim();
  const template = templateFromEnv || DEFAULT_TEMPLATE;

  if (template.includes('{chainId}')) {
    return template.replace('{txHash}', txHash).replace('{chainId}', String(chainId || ''));
  }

  return template.replace('{txHash}', txHash);
}
