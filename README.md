# OWS Agent Identity

**The naming layer for OWS agents.**

One ENS name. Every chain. Resolved on-chain, no backend, no trust required.

Built for the **OWS Hackathon 2026 — Track 03: The Grid** and **Track: Agent Spend Governance & Identity**.

🌐 **Live demo:** [ows.domains/hackathon](https://ows.domains/hackathon)

---

## What it does

AI agents have a different address on every chain — no shared identity, no way to say "this is me" across EVM, Solana, Bitcoin, Cosmos.

`name.ows.eth` solves this: one ENS subdomain maps to all chain addresses via ENSIP-9 coin-type records, stored on Ethereum mainnet.

### Live demos

| Demo | Description |
|------|-------------|
| **ENS Multi-Chain Resolver** | Resolves `hackathon.ows.eth` → all chain addresses in real time from ENS mainnet |
| **MoonPay Deposit Skill** | `moonpay-deposit` skill generates live multi-chain deposit links |
| **x402 Cross-Chain Oracle** | `/api/resolve` returns 402 → agent pays $0.001 USDC → receives all chain addresses |
| **Web Bot Auth** | Agent signs with OWS wallet → server verifies identity via ENS (RFC 9421 inspired) |

---

## Track 03 Compliance

| Requirement | Status |
|-------------|--------|
| OWS CLI (`ows wallet create`) | ✅ `hackathon-demo` wallet created |
| MoonPay agent skill | ✅ `moonpay-deposit` integrated |
| Spans 2+ chains | ✅ EVM, Solana, Bitcoin, Cosmos, Tron, Filecoin, Sui |
| OWS wallet as signing layer | ✅ Signs x402 payments + Web Bot Auth |

---

## Stack

- **OWS CLI** — `ows wallet create --name hackathon-demo`
- **ENS Universal Resolver** — ENSIP-9 coin-type records on Ethereum mainnet
- **x402 Protocol** — pay-per-query API access
- **MoonPay Skill** — `moonpay-deposit` for multi-chain USDC deposits
- **Web Bot Auth** — RFC 9421-inspired HTTP message signatures
- **ethers.js** — signature verification
- **React 19 + tRPC 11 + TypeScript + Tailwind 4**

---

## The namespace

`ows.eth` is the root. We own it. Every subdomain inherits protocol-level trust.

`hackathon.ows.eth` → resolves to 7 chains, verifiable on [ENS](https://app.ens.domains/hackathon.ows.eth)

---

## Contact

**[@ensconnoisseur](https://x.com/ensconnoisseur)** on X  
Builder of ows.domains · Holder of ows.eth
