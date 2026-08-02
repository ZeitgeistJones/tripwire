import tokens from "@/lib/tokens";

/** ClawdWire — live pulse. Same Dune query, one token per run. */
export const CLAWD_TOKEN_ADDRESS = "0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07";

/** Set in Vercel after you create the query from docs/dune-CLAWDWIRE-any-token.sql */
export function getClawdWireQueryId() {
  return process.env.CLAWD_WIRE_QUERY_ID || "";
}

export function normalizeAddress(address) {
  return String(address || "").trim().toLowerCase();
}

/**
 * Only tokens Tripwire already tracks may be pulsed.
 *
 * Every run costs Dune credits, so the address cannot be free-form input — an
 * arbitrary address would let one holder spend the budget on anything at all.
 * Resolving through this list also means the query's token_name comes from our
 * own data rather than whatever a caller typed.
 */
const BY_ADDRESS = new Map(
  tokens
    .filter((t) => t && t.address)
    .map((t) => [normalizeAddress(t.address), t])
);

/** @returns {{address,symbol,name,tag}|null} */
export function resolvePulseToken(address) {
  const addr = normalizeAddress(address);
  if (!addr) return null;
  const t = BY_ADDRESS.get(addr);
  if (!t) return null;
  return {
    address: addr,
    symbol: t.symbol || t.name || "TOKEN",
    name: t.name || t.symbol || "Token",
    tag: t.tag || null,
  };
}

export function isPulseTokenAllowed(address) {
  return resolvePulseToken(address) != null;
}

/** The token a request means when it does not say — ClawdWire's home coin. */
export function defaultPulseToken() {
  return (
    resolvePulseToken(CLAWD_TOKEN_ADDRESS) || {
      address: CLAWD_TOKEN_ADDRESS,
      symbol: "CLAWD",
      name: "CLAWD",
      tag: null,
    }
  );
}

/** Every tracked token, for the picker. */
export function listPulseTokens() {
  return Array.from(BY_ADDRESS.values()).map((t) => ({
    address: normalizeAddress(t.address),
    symbol: t.symbol || t.name,
    name: t.name || t.symbol,
    tag: t.tag || null,
  }));
}
