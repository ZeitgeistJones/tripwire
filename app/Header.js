"use client";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import ThemePicker from "./ThemePicker";

const GATE_ADDRESS = "0xc22B7b983EC81523c969753c2385106835E8CfCE";
const GATE_ABI = [
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

function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ConnectButton({ compact = false }) {
  const { connectors, connect, isPending } = useConnect();
  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      style={{
        padding: compact ? "4px 12px" : "8px 16px",
        borderRadius: "6px",
        border: "none",
        background: "var(--btn-active-bg)",
        color: "var(--btn-active-text)",
        cursor: isPending ? "not-allowed" : "pointer",
        fontWeight: 700,
        fontSize: compact ? "12px" : "13px",
        opacity: isPending ? 0.7 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

/** Slim site chrome — board is public; only ClawdWire Trip needs 10M CLAWD. */
export default function Header() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: hasAccessRaw } = useReadContract({
    address: GATE_ADDRESS,
    abi: GATE_ABI,
    functionName: "hasAccess",
    args: address ? [address, 1] : undefined,
    chainId: base.id,
    query: { enabled: !!address },
  });
  const canTrip = !!hasAccessRaw;

  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "14px", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
            Tripwire
          </h1>
          <span className="tw-holder-subtitle" style={{ fontSize: "13px", color: "var(--text-faint)" }}>
            Community dashboard · Dune + CoinGecko · DYOR
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <ThemePicker compact />
          {isConnected ? (
            <>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: canTrip ? "var(--gate-ok-bg)" : "var(--bg-muted)",
                  color: canTrip ? "var(--gate-ok-text)" : "var(--text-faint)",
                }}
                title={
                  canTrip
                    ? "10M+ CLAWD — ClawdWire Trip unlocked"
                    : "Board is open. ClawdWire Trip needs 10M CLAWD."
                }
              >
                {canTrip ? "✓ Trip ready" : "Viewing · Trip needs 10M"}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>{shortAddress(address)}</span>
              <button
                className="tw-disconnect-btn"
                onClick={disconnect}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-muted)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>
                Open to browse · 10M CLAWD to Trip ClawdWire
              </span>
              <ConnectButton compact />
            </>
          )}
        </div>
      </div>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: "11px",
          color: "var(--text-xfaint)",
          lineHeight: "1.6",
          borderTop: "1px solid var(--border)",
          paddingTop: "10px",
        }}
      >
        Built by a community member. Not affiliated with CLAWD. Data from Dune Analytics and CoinGecko — best-effort, not guaranteed. Not financial advice.
      </p>
    </div>
  );
}
