export type DeploymentInfo = {
  address: string;
  deployBlock: number;
  timestamp: number;
  network: string;
};

const cache: Record<string, DeploymentInfo> = {};

const chainIdToNetworkName: Record<number, string> = {
  31337: 'localhost',
  11155111: 'sepolia',
};

export function networkNameFromChainId(chainId: number | null | undefined) {
  if (!chainId) return '';
  return chainIdToNetworkName[chainId] || '';
}

export async function loadDeployment(networkName: string): Promise<DeploymentInfo | null> {
  if (!networkName) return null;
  if (cache[networkName]) return cache[networkName];

  try {
    const res = await fetch(`/deployments/${networkName}.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as DeploymentInfo;
    if (!data?.address) return null;
    cache[networkName] = data;
    return data;
  } catch {
    return null;
  }
}
