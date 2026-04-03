/**
 * x402 Cross-Chain ENS Resolver
 * 
 * A pay-per-query API that resolves *.ows.eth names to chain addresses.
 * Implements the x402 payment protocol: agent sends request, gets 402,
 * pays with USDC on Base via OWS wallet, receives chain addresses.
 * 
 * This is the "Cross-chain data oracle" from Track 03 — The Grid.
 * No API keys. No accounts. Just a wallet and an HTTP request.
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

// Payment config
const PAYMENT_AMOUNT_USDC = "0.001"; // $0.001 per query
const PAYMENT_CHAIN = "base";
const PAYMENT_TOKEN = "USDC";
const PAYMENT_RECEIVER = "0xEBd670b83BcFb77BC73317834e35b1A674c08430"; // hackathon.ows.eth EVM address
const PAYMENT_EXPIRY_SECONDS = 300; // 5 minutes

// Simple HMAC-based payment token (in production: verify on-chain tx)
const PAYMENT_SECRET = process.env.JWT_SECRET || "ows-x402-demo-secret";

function generatePaymentChallenge(name: string): string {
  const payload = `${name}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  return Buffer.from(payload).toString("base64url");
}

function generatePaymentToken(challenge: string, amount: string): string {
  const data = `${challenge}:${amount}:${PAYMENT_RECEIVER}`;
  const hmac = crypto.createHmac("sha256", PAYMENT_SECRET).update(data).digest("hex");
  const token = `${challenge}.${hmac}`;
  return Buffer.from(token).toString("base64url");
}

function verifyPaymentToken(token: string, amount: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return false;
    const challenge = decoded.slice(0, lastDot);
    const providedHmac = decoded.slice(lastDot + 1);
    const data = `${challenge}:${amount}:${PAYMENT_RECEIVER}`;
    const expectedHmac = crypto.createHmac("sha256", PAYMENT_SECRET).update(data).digest("hex");
    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(providedHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}

// ENS resolution logic (reused from routers.ts)
async function resolveEnsName(ensName: string): Promise<{
  found: boolean;
  addresses: Array<{ chain: string; caip: string; address: string }>;
  error?: string;
}> {
  const OWS_COIN_TYPES: Record<string, { label: string; caip: string }> = {
    "60":         { label: "EVM (Ethereum)",  caip: "eip155:1" },
    "0":          { label: "Bitcoin",         caip: "bip122:0" },
    "501":        { label: "Solana",           caip: "solana:4sGjMW1sJ9LLHMnMeNsNDpMBJLMnMeNs" },
    "118":        { label: "Cosmos",           caip: "cosmos:cosmoshub-4" },
    "784":        { label: "Sui",              caip: "sui:mainnet" },
    "195":        { label: "Tron",             caip: "tron:mainnet" },
    "461":        { label: "Filecoin",         caip: "fil:mainnet" },
    "2147492101": { label: "Base",             caip: "eip155:8453" },
  };

  try {
    // Query ENS Subgraph
    const namehash = computeNamehash(ensName);
    const subgraphQuery = {
      query: `{
        domains(where: { id: "${namehash}" }) {
          name
          resolver {
            events(orderBy: blockNumber, orderDirection: desc) {
              ... on AddrChanged { coinType addr }
              ... on MulticoinAddrChanged { coinType addr }
            }
          }
        }
      }`
    };

    const sgRes = await fetch("https://api.thegraph.com/subgraphs/name/ensdomains/ens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subgraphQuery),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    // Also try enstate.rs for ETH/BTC/SOL
    const enstateRes = await fetch(`https://enstate.rs/n/${ensName}`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    let enstateChains: Record<string, string> = {};
    if (enstateRes?.ok) {
      const data = await enstateRes.json() as { chains?: Record<string, string> };
      enstateChains = data.chains || {};
    }

    const addresses: Array<{ chain: string; caip: string; address: string }> = [];
    const seenCoinTypes = new Set<string>();

    if (sgRes?.ok) {
      const sgData = await sgRes.json() as { data?: { domains?: Array<{ resolver?: { events?: unknown[] } }> } };
      const domains = sgData.data?.domains;
      if (Array.isArray(domains) && domains.length > 0) {
        const resolver = domains[0].resolver;
        if (resolver?.events) {
          const latestByType: Record<string, string> = {};
          for (const event of resolver.events) {
            const ev = event as Record<string, unknown>;
            if (ev.coinType !== undefined && ev.addr && typeof ev.addr === "string") {
              const ct = String(ev.coinType);
              if (!latestByType[ct]) latestByType[ct] = ev.addr as string;
            }
          }

          const OWS_ORDER = ["60", "0", "501", "118", "784", "195", "461", "2147492101"];
          for (const ct of OWS_ORDER) {
            if (latestByType[ct] && OWS_COIN_TYPES[ct]) {
              let addr = "";
              if (ct === "60" && enstateChains.eth) addr = enstateChains.eth;
              else if (ct === "0" && enstateChains.btc) addr = enstateChains.btc;
              else if (ct === "501" && enstateChains.sol) addr = enstateChains.sol;
              else addr = decodeAddrSimple(latestByType[ct], ct);
              if (addr) {
                addresses.push({ chain: OWS_COIN_TYPES[ct].label, caip: OWS_COIN_TYPES[ct].caip, address: addr });
                seenCoinTypes.add(ct);
              }
            }
          }
        }
      }
    }

    // Fallback: enstate.rs
    if (addresses.length === 0 && Object.keys(enstateChains).length > 0) {
      const chainMap: Record<string, { ct: string; label: string; caip: string }> = {
        eth: { ct: "60", label: "EVM (Ethereum)", caip: "eip155:1" },
        btc: { ct: "0", label: "Bitcoin", caip: "bip122:0" },
        sol: { ct: "501", label: "Solana", caip: "solana:4sGjMW1sJ9LLHMnMeNsNDpMBJLMnMeNs" },
      };
      for (const [key, addr] of Object.entries(enstateChains)) {
        const meta = chainMap[key];
        if (meta && !seenCoinTypes.has(meta.ct)) {
          addresses.push({ chain: meta.label, caip: meta.caip, address: addr });
        }
      }
    }

    return { found: addresses.length > 0, addresses };
  } catch (err) {
    return { found: false, addresses: [], error: String(err) };
  }
}

// Minimal address decoder (hex bytes → human-readable)
function decodeAddrSimple(hexAddr: string, coinType: string): string {
  if (!hexAddr || !hexAddr.startsWith("0x")) return hexAddr;
  const hex = hexAddr.slice(2);
  const bytes = Buffer.from(hex, "hex");

  if (coinType === "60" || coinType.startsWith("214748")) {
    // EVM: last 20 bytes
    if (bytes.length >= 20) {
      const addr = "0x" + bytes.slice(-20).toString("hex");
      return addr.slice(0, 2) + addr.slice(2).replace(/./g, (c, i) =>
        parseInt(addr.slice(2), 16).toString(16)[i]?.toUpperCase() === c.toUpperCase() ? c.toUpperCase() : c.toLowerCase()
      );
    }
  }
  if (coinType === "118") {
    // Cosmos: bech32 with "cosmos" prefix
    return decodeCosmosBech32(bytes);
  }
  if (coinType === "195") {
    // Tron: Base58Check
    return decodeTronBase58(bytes);
  }
  if (coinType === "461") {
    // Filecoin: f1... address
    return decodeFilecoin(bytes);
  }
  return hexAddr;
}

function decodeCosmosBech32(bytes: Buffer): string {
  try {
    const data = Array.from(bytes);
    const converted = convertBits(data, 8, 5, true);
    if (!converted) return "0x" + bytes.toString("hex");
    return bech32Encode("cosmos", converted);
  } catch { return "0x" + bytes.toString("hex"); }
}

function decodeTronBase58(bytes: Buffer): string {
  try {
    // Tron address is 21 bytes: 0x41 + 20 bytes address
    const addr = bytes.length === 21 ? bytes : bytes.slice(-21);
    const checksum = Buffer.from(crypto.createHash("sha256").update(
      Buffer.from(crypto.createHash("sha256").update(addr).digest())
    ).digest()).slice(0, 4) as Buffer;
    const full = Buffer.concat([Buffer.from(addr), checksum]);
    return base58Encode(full);
  } catch { return "0x" + bytes.toString("hex"); }
}

function decodeFilecoin(bytes: Buffer): string {
  try {
    // f1 address: protocol byte 0x01 + payload
    if (bytes[0] === 0x01) {
      const payload = bytes.slice(1);
      const checksum = blake2bChecksum(payload);
      const data = Buffer.concat([payload, checksum]);
      return "f1" + base32Encode(data).toLowerCase().replace(/=/g, "");
    }
    return "0x" + bytes.toString("hex");
  } catch { return "0x" + bytes.toString("hex"); }
}

// Minimal Blake2b for Filecoin checksum (4 bytes)
function blake2bChecksum(data: Buffer): Buffer {
  // Simplified: use SHA256 as placeholder (real impl needs blake2b)
  return Buffer.from(crypto.createHash("sha256").update(data).digest()).slice(0, 4) as Buffer;
}

// Base32 encoding
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(data: Buffer): string {
  let bits = 0, value = 0, output = "";
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  while (output.length % 8 !== 0) output += "=";
  return output;
}

// Base58 encoding
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(data: Buffer): string {
  // Convert buffer to big number using string arithmetic
  const bytes = Array.from(data);
  let num: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = num.length - 1; i >= 0; i--) {
      carry += num[i] * 256;
      num[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      num.unshift(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = num.map(n => BASE58_ALPHABET[n]).join("");
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0) break;
    result = "1" + result;
  }
  return result;
}

// Bech32 encoding
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) { if ((b >> i) & 1) chk ^= BECH32_GENERATOR[i]; }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = [...bech32HrpExpand(hrp), ...data];
  const checksum = bech32Polymod([...combined, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksumWords: number[] = [];
  for (let i = 0; i < 6; i++) checksumWords.push((checksum >> (5 * (5 - i))) & 31);
  return hrp + "1" + [...data, ...checksumWords].map(d => BECH32_CHARSET[d]).join("");
}

function convertBits(data: number[], frombits: number, tobits: number, pad: boolean): number[] | null {
  let acc = 0, bits = 0;
  const ret: number[] = [];
  const maxv = (1 << tobits) - 1;
  for (const value of data) {
    acc = ((acc << frombits) | value) & 0xffffffff;
    bits += frombits;
    while (bits >= tobits) { bits -= tobits; ret.push((acc >> bits) & maxv); }
  }
  if (pad && bits > 0) ret.push((acc << (tobits - bits)) & maxv);
  else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) return null;
  return ret;
}

// Minimal namehash
function computeNamehash(name: string): string {
  let node = Buffer.alloc(32);
  if (name === "") return "0x" + node.toString("hex");
  const labels = name.split(".").reverse();
  for (const label of labels) {
    const labelHash = crypto.createHash("sha256").update(label).digest();
    node = Buffer.from(crypto.createHash("sha256").update(Buffer.concat([Buffer.from(node), Buffer.from(labelHash)])).digest());
  }
  return "0x" + node.toString("hex");
}

/**
 * GET /api/resolve
 * 
 * Query params:
 *   name    - ENS name (e.g. hackathon.ows.eth)
 *   chain   - optional chain filter (e.g. solana, bitcoin, evm)
 *   payment - payment token (from prior 402 response)
 * 
 * Flow:
 *   1. No payment token → 402 with payment instructions
 *   2. Valid payment token → 200 with chain addresses
 */
router.get("/resolve", async (req: Request, res: Response) => {
  const name = (req.query.name as string || "").trim();
  const chainFilter = (req.query.chain as string || "").toLowerCase();
  const paymentToken = req.headers["x-payment"] as string || req.query.payment as string || "";

  // Validate name
  if (!name) {
    return res.status(400).json({
      error: "Missing required parameter: name",
      example: "/api/resolve?name=hackathon.ows.eth",
    });
  }

  const ensName = name.includes(".") ? name : `${name}.ows.eth`;

  // Step 1: No payment → return 402
  if (!paymentToken) {
    const challenge = generatePaymentChallenge(ensName);
    const token = generatePaymentToken(challenge, PAYMENT_AMOUNT_USDC);

    return res.status(402).json({
      error: "Payment Required",
      x402: {
        version: "1.0",
        accepts: [{
          scheme: "exact",
          network: PAYMENT_CHAIN,
          maxAmountRequired: PAYMENT_AMOUNT_USDC,
          resource: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
          description: `Resolve ${ensName} cross-chain addresses via OWS ENS Oracle`,
          mimeType: "application/json",
          payTo: PAYMENT_RECEIVER,
          maxTimeoutSeconds: PAYMENT_EXPIRY_SECONDS,
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
          extra: {
            name: "OWS ENS Cross-Chain Oracle",
            version: "1.0",
          },
        }],
        // For demo: include a pre-signed token so agents can proceed immediately
        demoPaymentToken: token,
      },
      instructions: [
        `1. Pay ${PAYMENT_AMOUNT_USDC} USDC to ${PAYMENT_RECEIVER} on ${PAYMENT_CHAIN}`,
        `2. Include the payment token in your next request:`,
        `   Header: X-Payment: <token>`,
        `   Or query param: ?payment=<token>`,
        `3. For demo purposes, use the demoPaymentToken from this response`,
      ],
    });
  }

  // Step 2: Verify payment token
  const isValid = verifyPaymentToken(paymentToken, PAYMENT_AMOUNT_USDC);
  if (!isValid) {
    return res.status(402).json({
      error: "Invalid or expired payment token",
      x402: { version: "1.0" },
    });
  }

  // Step 3: Resolve ENS name
  const result = await resolveEnsName(ensName);

  if (!result.found) {
    return res.status(404).json({
      error: `Name not found: ${ensName}`,
      ensName,
    });
  }

  // Filter by chain if requested
  let addresses = result.addresses;
  if (chainFilter) {
    addresses = addresses.filter(a =>
      a.chain.toLowerCase().includes(chainFilter) ||
      a.caip.toLowerCase().includes(chainFilter)
    );
  }

  // Return resolved addresses
  return res.status(200).json({
    ensName,
    resolved: true,
    addresses,
    payment: {
      amount: PAYMENT_AMOUNT_USDC,
      token: PAYMENT_TOKEN,
      chain: PAYMENT_CHAIN,
      receiver: PAYMENT_RECEIVER,
    },
    meta: {
      protocol: "x402",
      oracle: "OWS ENS Cross-Chain Oracle",
      source: "ENS Mainnet (ENSIP-9 coin-type records)",
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/resolve/info
 * Returns oracle info without payment
 */
router.get("/resolve/info", (_req: Request, res: Response) => {
  return res.json({
    name: "OWS ENS Cross-Chain Oracle",
    description: "Pay-per-query API that resolves *.ows.eth names to multi-chain addresses",
    protocol: "x402",
    pricing: {
      amount: PAYMENT_AMOUNT_USDC,
      token: PAYMENT_TOKEN,
      chain: PAYMENT_CHAIN,
      receiver: PAYMENT_RECEIVER,
    },
    supportedChains: ["EVM (Ethereum)", "Bitcoin", "Solana", "Cosmos", "Sui", "Tron", "Filecoin", "Base"],
    usage: {
      endpoint: "GET /api/resolve?name=<ens-name>",
      payment: "Include X-Payment header with payment token after receiving 402",
      demo: "Use demoPaymentToken from 402 response for immediate access",
    },
    examples: [
      "GET /api/resolve?name=hackathon.ows.eth",
      "GET /api/resolve?name=treasury.ows.eth&chain=solana",
    ],
  });
});

export { router as x402ResolverRouter };
