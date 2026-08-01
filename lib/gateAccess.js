import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { isWireTester } from "@/lib/wireAccess";

/** Same gate contract as Header / DashboardTable. */
export const GATE_ADDRESS = "0xc22B7b983EC81523c969753c2385106835E8CfCE";

export const GATE_ABI = [
  {
    name: "hasAccess",
    type: "function",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "tier", type: "uint8" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
];

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/** On-chain Tripwire holder check (tier 1), same as the site unlock. */
export async function walletHasTripwireAccess(address) {
  if (!address) return false;
  try {
    const ok = await publicClient.readContract({
      address: GATE_ADDRESS,
      abi: GATE_ABI,
      functionName: "hasAccess",
      args: [address, 1],
    });
    return !!ok;
  } catch {
    return false;
  }
}

/** ClawdWire: Tripwire holders + legacy tester wallet. */
export async function canUseClawdWire(address) {
  if (!address) return false;
  const wallet = String(address).toLowerCase();
  if (isWireTester(wallet)) return true;
  return walletHasTripwireAccess(wallet);
}
