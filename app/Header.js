"use client";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import ThemeToggle from "./ThemeToggle";

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

function ConnectButton() {
  const { connectors, connect, isPending } = useConnect();
  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      style={{
        padding: "12px 24px",
        borderRadius: "8px",
        border: "none",
        background: "var(--btn-active-bg)",
        color: "var(--btn-active-text)",
        cursor: isPending ? "not-allowed" : "pointer",
        fontWeight: 700,
        fontSize: "15px",
        letterSpacing: "0.01em",
        width: "100%",
        maxWidth: "280px",
        opacity: isPending ? 0.7 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

// ── State 1: public landing — two-column layout ───────────────────────────────
function PublicHeader() {
  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "48px",
        alignItems: "start",
        marginBottom: "20px",
      }}
      className="header-grid"
      >
        {/* Left column */}
        <div>
          <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Tripwire
          </h1>
          <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text)", lineHeight: "1.6" }}>
            Community-built intelligence for CLAWD holders on Base. Track AI agent tokens with on-chain behavioral scores, wallet stats, and real-time pulse checks.
          </p>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>
              Access requires 10,000,000 CLAWD.
            </p>
            <ConnectButton />
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-faint)", lineHeight: "1.6" }}>
            What you get: behavioral scoring across momentum, sustainability &amp; opportunity · wallet growth, retention &amp; buyer/seller flow · The Wire pulse check across 15m, 1h, 6h &amp; 24h windows · price signal and concentration risk.
          </p>
        </div>
      </div>

      {/* Full-width disclaimer */}
      <p style={{
        margin: 0,
        fontSize: "11px",
        color: "var(--text-xfaint)",
        lineHeight: "1.6",
        borderTop: "1px solid var(--border)",
        paddingTop: "12px",
      }}>
        Built by a community member. Not affiliated with CLAWD. Data from Dune Analytics and CoinGecko — best-effort, not guaranteed. Not financial advice. Formulas are not scientifically backed. Token gate built with LeftClaw researchers.
      </p>

      <style>{`
        @media (max-width: 640px) {
          .header-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </div>
  );
}

// ── State 2: holder — single slim bar ────────────────────────────────────────
function HolderHeader({ address, disconnect }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      justifyContent: "space-between",
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "14px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
          Tripwire
        </h1>
        <span className="tw-holder-subtitle" style={{ fontSize: "13px", color: "var(--text-faint)" }}>
          Community dashboard for CLAWD holders · Dune + CoinGecko · DYOR
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{
          fontSize: "12px", fontWeight: 600,
          padding: "4px 10px", borderRadius: "6px",
          background: "var(--gate-ok-bg)", color: "var(--gate-ok-text)",
        }}>
          ✓ Unlocked
        </span>
        <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>{shortAddress(address)}</span>
        <button
          className="tw-disconnect-btn"
          onClick={disconnect}
          style={{
            padding: "4px 10px", borderRadius: "6px",
            border: "1px solid var(--border)", background: "var(--bg-muted)",
            color: "var(--text-muted)", cursor: "pointer", fontSize: "12px",
          }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

// ── State 2b: connected but not a holder ────────────────────────────────────
function ConnectedNotHolder({ address, disconnect }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      justifyContent: "space-between",
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "14px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
          Tripwire
        </h1>
        <span style={{ fontSize: "13px", color: "var(--text-faint)" }}>
          Requires 10,000,000 CLAWD to unlock
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{
          fontSize: "12px", fontWeight: 600,
          padding: "4px 10px", borderRadius: "6px",
          background: "var(--gate-fail-bg)", color: "var(--gate-fail-text)",
        }}>
          Insufficient CLAWD
        </span>
        <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>{shortAddress(address)}</span>
        <button
          className="tw-disconnect-btn"
          onClick={disconnect}
          style={{
            padding: "4px 10px", borderRadius: "6px",
            border: "1px solid var(--border)", background: "var(--bg-muted)",
            color: "var(--text-muted)", cursor: "pointer", fontSize: "12px",
          }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
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
  const hasAccess = !!hasAccessRaw;

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <ThemeToggle />
      </div>

      {!isConnected && <PublicHeader />}
      {isConnected && hasAccess && <HolderHeader address={address} disconnect={disconnect} />}
      {isConnected && !hasAccess && <ConnectedNotHolder address={address} disconnect={disconnect} />}
    </div>
  );
}
