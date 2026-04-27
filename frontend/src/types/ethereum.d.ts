interface EthereumProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on(event: 'accountsChanged', listener: (accounts: string[]) => void): void;
  on(event: 'chainChanged', listener: (chainId: string) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}
