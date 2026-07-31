/** The Wire — closed beta while under construction. Only these wallets can run it. */
export const WIRE_TESTER_ADDRESSES = [
  "0xf2c44af68ae2a983d1331b2d3aef3c516ae4a0fc",
];

export function isWireTester(address) {
  if (!address) return false;
  return WIRE_TESTER_ADDRESSES.includes(String(address).toLowerCase());
}
