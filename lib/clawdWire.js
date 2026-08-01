/** ClawdWire — CLAWD-only lab pulse (separate Dune query from The Wire). */
export const CLAWD_TOKEN_ADDRESS = "0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07";

/** Set in Vercel after you create the query from docs/dune-CLAWDWIRE-paste-this.sql */
export function getClawdWireQueryId() {
  return process.env.CLAWD_WIRE_QUERY_ID || "";
}
