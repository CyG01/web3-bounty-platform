/**
 * 截断 Web3 钱包地址
 * @param address 完整的 0x 钱包地址
 * @param chars 前后保留的字符数，默认为 4
 * @returns 格式化后的地址，例如 "0x1234...abcd"
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  const parsed = address.trim();
  if (parsed.length < 10) return parsed;
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(parsed.length - chars)}`;
}
