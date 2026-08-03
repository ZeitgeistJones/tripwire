"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** @deprecated Header owns wallet chrome; kept for stray imports. */
export default function GateButton({ hasAccess }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", marginBottom: "12px" }}>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            background: hasAccess ? "#E1F5EE" : "#FAECE7",
            color: hasAccess ? "#085041" : "#712B13",
            fontWeight: 600,
          }}
        >
          {hasAccess ? "✓ Trip ClawdWire unlocked" : "Connected — 10M CLAWD to Trip ClawdWire"}
        </span>
        <span style={{ color: "#888" }}>{shortAddress(address)}</span>
        <button
          onClick={() => disconnect()}
          style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: "12px" }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      style={{
        padding: "8px 16px",
        borderRadius: "6px",
        border: "1px solid #333",
        background: "#333",
        color: "#fff",
        cursor: isPending ? "not-allowed" : "pointer",
        fontWeight: 600,
        fontSize: "13px",
        marginBottom: "12px",
      }}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
