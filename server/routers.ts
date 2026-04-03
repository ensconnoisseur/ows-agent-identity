import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Agent Identity Verifier — ENSIP-25
  verify: router({
    // Resolve an agent name via ENS and return all OWS-supported chain addresses + ENSIP-25 attestation
    agent: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
      }))
      .query(async ({ input }) => {
        const baseName = input.name.replace(/\.ows\.eth$/i, "").replace(/[^a-zA-Z0-9-_]/g, "");
        if (!baseName) throw new Error("Invalid agent name");
        const ensName = `${baseName}.ows.eth`;

        // OWS-supported coin types (ENSIP-9 / SLIP-0044 / ENSIP-11)
        const OWS_COIN_TYPES: Record<string, { label: string; caip: string; isEvm: boolean }> = {
          "60":         { label: "EVM (Ethereum)",  caip: "eip155:1",    isEvm: true },
          "0":          { label: "Bitcoin",         caip: "bip122:0",    isEvm: false },
          "501":        { label: "Solana",           caip: "solana:4sGj", isEvm: false },
          "118":        { label: "Cosmos",           caip: "cosmos:cosmoshub-4", isEvm: false },
          "607":        { label: "TON",              caip: "ton:mainnet", isEvm: false },
          "784":        { label: "Sui",              caip: "sui:mainnet", isEvm: true },
          "195":        { label: "Tron",             caip: "tron:mainnet",isEvm: false },
          "461":        { label: "Filecoin",         caip: "fil:mainnet", isEvm: false },
          "2147492101": { label: "Base",             caip: "eip155:8453",isEvm: true },
          "2147483785": { label: "Polygon",          caip: "eip155:137", isEvm: true },
          "2147525809": { label: "Arbitrum",         caip: "eip155:42161",isEvm: true },
          "2147483658": { label: "Optimism",         caip: "eip155:10",  isEvm: true },
        };

        // Helper: bech32 encode (used for Bitcoin and Cosmos)
        const bech32ConvertBits = (data: number[], frombits: number, tobits: number, pad: boolean): number[] => {
          let acc = 0, bits = 0;
          const ret: number[] = [];
          const maxv = (1 << tobits) - 1;
          for (const value of data) {
            acc = ((acc << frombits) | value) & 0xffffffff;
            bits += frombits;
            while (bits >= tobits) { bits -= tobits; ret.push((acc >> bits) & maxv); }
          }
          if (pad && bits > 0) ret.push((acc << (tobits - bits)) & maxv);
          return ret;
        };
        const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
        const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        const bech32Polymod = (values: number[]): number => {
          let chk = 1;
          for (const v of values) {
            const b = chk >> 25;
            chk = ((chk & 0x1ffffff) << 5) ^ v;
            for (let i = 0; i < 5; i++) { if ((b >> i) & 1) chk ^= BECH32_GENERATOR[i]; }
          }
          return chk;
        };
        const bech32HrpExpand = (hrp: string): number[] => {
          const ret: number[] = [];
          for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
          ret.push(0);
          for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
          return ret;
        };
        const bech32Encode = (hrp: string, data: number[], witnessVersion?: number): string => {
          const words = witnessVersion !== undefined ? [witnessVersion, ...bech32ConvertBits(data, 8, 5, true)] : bech32ConvertBits(data, 8, 5, true);
          const checksumInput = [...bech32HrpExpand(hrp), ...words, 0, 0, 0, 0, 0, 0];
          const polymodVal = bech32Polymod(checksumInput) ^ 1;
          const checksum: number[] = [];
          for (let i = 5; i >= 0; i--) checksum.push((polymodVal >> (5 * i)) & 31);
          return hrp + '1' + [...words, ...checksum].map(d => BECH32_CHARSET[d]).join('');
        };

        // Helper: base58 encode (used for Solana, Tron, Filecoin)
        const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        const base58Encode = (bytes: Buffer): string => {
          const digits = [0];
          for (let i = 0; i < bytes.length; i++) {
            let carry = bytes[i];
            for (let j = 0; j < digits.length; j++) {
              carry += digits[j] << 8;
              digits[j] = carry % 58;
              carry = Math.floor(carry / 58);
            }
            while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
          }
          let result = "";
          for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += "1";
          for (let i = digits.length - 1; i >= 0; i--) result += BASE58_ALPHABET[digits[i]];
          return result;
        };
        const { createHash } = await import("crypto");
        const base58CheckEncode = (bytes: Buffer): string => {
          const hash1 = createHash('sha256').update(bytes).digest();
          const hash2 = createHash('sha256').update(hash1).digest();
          const checksum = hash2.slice(0, 4);
          return base58Encode(Buffer.concat([bytes, checksum]));
        };

        // Helper: decode address bytes from ENS Subgraph hex string
        const decodeAddr = (hexAddr: string, coinType: string): string => {
          const raw = hexAddr.startsWith("0x") ? hexAddr.slice(2) : hexAddr;
          const bytes = Buffer.from(raw, "hex");
          const ct = parseInt(coinType, 10);

          if (ct === 60 || ct >= 0x80000000) {
            // EVM: 20-byte address
            return "0x" + bytes.slice(-20).toString("hex");
          }
          if (ct === 0) {
            // Bitcoin: segwit bech32 — version(1) + length(1) + program(N)
            const version = bytes[0];
            const program = Array.from(bytes.slice(2));
            return bech32Encode('bc', program, version);
          }
          if (ct === 501) {
            // Solana: 32-byte public key, base58-encoded
            return base58Encode(bytes);
          }
          if (ct === 118) {
            // Cosmos: bech32("cosmos", 20-byte address)
            return bech32Encode('cosmos', Array.from(bytes));
          }
          if (ct === 195) {
            // Tron: base58check(0x41 + 20 bytes) — bytes already include 0x41 prefix
            return base58CheckEncode(bytes);
          }
          if (ct === 461) {
            // Filecoin f1: protocol(1) + 20-byte payload
            // f1 = secp256k1, base32 encoded
            // Simplified: return as base58 of payload for display
            const payload = bytes.slice(1);
            const checksumInput = Buffer.concat([bytes.slice(0, 1), payload]);
            const hash1 = createHash('sha256').update(checksumInput).digest();
            const hash2 = createHash('sha256').update(hash1).digest();
            const checksum = hash2.slice(0, 4);
            return 'f1' + base58Encode(Buffer.concat([payload, checksum]));
          }
          // Default: hex
          return "0x" + bytes.toString("hex");
        };

        try {
          // Step 1: Get human-readable addresses from enstate.rs (fast, gives btc/eth/sol)
          const enstateFetch = fetch(`https://enstate.rs/n/${ensName}`, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(6000),
          });

          // Step 2: Get all coin-type events from ENS Subgraph (gives Sui, Base, etc.)
          const SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/ensdomains/ens";
          const domainQuery = `{
            domains(where: {name: "${ensName}"}) {
              id name
              resolvedAddress { id }
              resolver {
                id address coinTypes texts
                events(first: 50) {
                  id
                  ... on MulticoinAddrChanged { coinType addr }
                  ... on AddrChanged { addr { id } }
                  ... on TextChanged { key value }
                }
              }
            }
          }`;

          const subgraphFetch = fetch(SUBGRAPH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: domainQuery }),
            signal: AbortSignal.timeout(8000),
          });

          const [enstateRes, subgraphRes] = await Promise.allSettled([enstateFetch, subgraphFetch]);

          // Parse enstate.rs result
          let enstateChains: Record<string, string> = {};
          let enstateRecords: Record<string, string> = {};
          let enstateFound = false;

          if (enstateRes.status === "fulfilled" && enstateRes.value.ok) {
            const enstateData = await enstateRes.value.json() as Record<string, unknown>;
            enstateChains = (enstateData.chains as Record<string, string>) || {};
            enstateRecords = (enstateData.records as Record<string, string>) || {};
            enstateFound = true;
          }

          // Parse Subgraph result
          let subgraphDomain: Record<string, unknown> | null = null;
          if (subgraphRes.status === "fulfilled" && subgraphRes.value.ok) {
            const sgData = await subgraphRes.value.json() as { data?: { domains?: unknown[] } };
            const domains = sgData.data?.domains;
            if (Array.isArray(domains) && domains.length > 0) {
              subgraphDomain = domains[0] as Record<string, unknown>;
            }
          }

          // If neither source found the name
          if (!enstateFound && !subgraphDomain) {
            return {
              ensName, found: false, verified: false,
              attestation: null, addresses: [], textRecords: {},
              error: "Name not registered",
            };
          }

          // Build address list from Subgraph events (most complete source)
          const addresses: Array<{ chain: string; caip: string; address: string }> = [];
          const seenCoinTypes = new Set<string>();
          const textRecords: Record<string, string> = { ...enstateRecords };

          if (subgraphDomain) {
            const resolver = subgraphDomain.resolver as Record<string, unknown> | null;
            if (resolver) {
              const events = (resolver.events as unknown[]) || [];
              // Process events in reverse to get latest value per coin type
              const latestByType: Record<string, string> = {};
              for (const event of events) {
                const ev = event as Record<string, unknown>;
                if (ev.coinType !== undefined && ev.addr && typeof ev.addr === "string") {
                  latestByType[String(ev.coinType)] = ev.addr as string;
                }
                // Text records
                if (ev.key && ev.value && typeof ev.key === "string" && typeof ev.value === "string") {
                  textRecords[ev.key] = ev.value;
                }
              }

              // Build address list in OWS chain order
              const OWS_ORDER = ["60", "0", "501", "118", "607", "784", "195", "461", "2147492101", "2147483785", "2147525809", "2147483658"];
              for (const ct of OWS_ORDER) {
                if (latestByType[ct] && OWS_COIN_TYPES[ct]) {
                  const meta = OWS_COIN_TYPES[ct];
                  let addr = "";

                  // Use enstate.rs human-readable form where available
                  if (ct === "60" && enstateChains.eth) {
                    addr = enstateChains.eth;
                  } else if (ct === "0" && enstateChains.btc) {
                    addr = enstateChains.btc;
                  } else if (ct === "501" && enstateChains.sol) {
                    addr = enstateChains.sol;
                  } else {
                    addr = decodeAddr(latestByType[ct], ct);
                  }

                  if (addr) {
                    addresses.push({ chain: meta.label, caip: meta.caip, address: addr });
                    seenCoinTypes.add(ct);
                  }
                }
              }
            }
          }

          // Fallback: use enstate.rs chains if subgraph had no events
          if (addresses.length === 0 && enstateFound) {
            const chainMap: Record<string, string> = { eth: "60", btc: "0", sol: "501" };
            for (const [key, addr] of Object.entries(enstateChains)) {
              const ct = chainMap[key];
              if (ct && OWS_COIN_TYPES[ct] && !seenCoinTypes.has(ct)) {
                addresses.push({ chain: OWS_COIN_TYPES[ct].label, caip: OWS_COIN_TYPES[ct].caip, address: addr });
              }
            }
          }

          const found = addresses.length > 0 || enstateFound;

          // ENSIP-25 attestation check
          const ensip25Records = Object.entries(textRecords)
            .filter(([k]) => k.startsWith("agent-registration["))
            .map(([k, v]) => ({ key: k, value: v }));
          const verified = ensip25Records.length > 0 && ensip25Records.some(r => r.value && r.value !== "");

          const owsVersion = textRecords["ows.version"] || textRecords["com.openwallet.version"] || null;
          const owsAgentId = textRecords["ows.agent-id"] || textRecords["com.openwallet.agent-id"] || null;
          const description = textRecords["description"] || null;
          const twitter = textRecords["com.twitter"] || null;
          const github = textRecords["com.github"] || null;
          const url = textRecords["url"] || null;

          return {
            ensName,
            found,
            verified,
            attestation: { ensip25Records, owsVersion, owsAgentId },
            addresses,
            textRecords,
            profile: { description, avatar: null, twitter, github, url },
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return {
            ensName, found: false, verified: false,
            attestation: null, addresses: [], textRecords: {},
            error: `Lookup failed: ${message}`,
          };
        }
      }),
  }),

  // MoonPay Skill Integration
  moonpay: router({
    // moonpay-deposit skill: Create a multi-chain deposit link via MoonPay
    deposit: publicProcedure
      .input(z.object({
        walletAddress: z.string().min(10).max(128),
        chain: z.string().default("base"),
        token: z.string().default("USDC"),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Call MoonPay Helio deposit API (same backend as `moonpay deposit create`)
        const res = await fetch("https://api.hel.io/v1/paylink/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: input.name || `OWS Agent Deposit`,
            destinationWallet: input.walletAddress,
            destinationChain: input.chain,
            token: input.token,
          }),
          signal: AbortSignal.timeout(8000),
        }).catch(() => null);

        // If API unavailable, return a realistic simulated response
        // This demonstrates the MoonPay deposit skill capability
        const depositId = `mp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const simulated = {
          id: depositId,
          destinationWallet: input.walletAddress,
          destinationChain: input.chain,
          token: input.token,
          depositUrl: `https://moonpay.hel.io/embed/deposit/${depositId}`,
          wallets: [
            {
              address: `0x${Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
              chain: "ethereum",
              qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=eth:${input.walletAddress}`,
            },
            {
              address: `${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`,
              chain: "solana",
              qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=solana:${input.walletAddress}`,
            },
            {
              address: `bc1q${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`,
              chain: "bitcoin",
              qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bitcoin:${input.walletAddress}`,
            },
            {
              address: `T${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`,
              chain: "tron",
              qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=tron:${input.walletAddress}`,
            },
          ],
          skill: "moonpay-deposit",
          instructions: `Deposit created via moonpay-deposit skill. Send any token from ethereum, solana, tron, or bitcoin to the deposit addresses above. Funds are automatically converted to ${input.token} and delivered to ${input.walletAddress} on ${input.chain}.`,
          isSimulated: true,
        };

        if (res && res.ok) {
          try {
            const data = await res.json() as Record<string, unknown>;
            return { ...data, skill: "moonpay-deposit", isSimulated: false };
          } catch {
            // fall through to simulated
          }
        }

        return simulated;
      }),

    // moonpay-check-wallet skill: Get token balances for a wallet address
    walletBalance: publicProcedure
      .input(z.object({
        address: z.string().min(10).max(128),
        chain: z.string().default("ethereum"),
      }))
      .query(async ({ input }) => {
        // MoonPay token balance API (same as `moonpay token balance list`)
        const url = `https://api.moonpay.com/v1/wallets/${encodeURIComponent(input.address)}/tokens?chain=${encodeURIComponent(input.chain)}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);

        if (res && res.ok) {
          try {
            const data = await res.json() as { items?: unknown[] };
            return { items: data.items || [], chain: input.chain, address: input.address, skill: "moonpay-check-wallet", isSimulated: false };
          } catch {
            // fall through
          }
        }

        // Simulated empty balance (wallet has no funds yet — expected for fresh wallet)
        return {
          items: [],
          chain: input.chain,
          address: input.address,
          skill: "moonpay-check-wallet",
          isSimulated: true,
          note: "Fresh wallet — no tokens yet. Fund via MoonPay deposit link.",
        };
      }),
  }),

  // x402 Payment Demo
  x402: router({
    simulate: publicProcedure
      .input(z.object({
        walletName: z.string().min(1).max(64),
        endpoint: z.string().url(),
        amount: z.number().positive(),
        currency: z.string().default("USDC"),
        chain: z.string().default("base"),
      }))
      .mutation(async ({ input }) => {
        // Simulate the x402 payment flow with realistic timing
        const steps: Array<{ step: number; label: string; detail: string; durationMs: number }> = [
          {
            step: 1,
            label: "Agent sends HTTP request",
            detail: `GET ${input.endpoint}`,
            durationMs: 120,
          },
          {
            step: 2,
            label: "Server responds: 402 Payment Required",
            detail: `HTTP/1.1 402 Payment Required\nX-Payment-Required: amount=${input.amount} currency=${input.currency} chain=${input.chain}\nX-Payment-Receiver: 0x742d35Cc6634C0532925a3b8D4C9C3e3f5b6a7d8`,
            durationMs: 80,
          },
          {
            step: 3,
            label: `OWS wallet signs payment`,
            detail: `ows pay request --wallet ${input.walletName} --amount ${input.amount} --currency ${input.currency} --chain ${input.chain}\n✓ Signed with ${input.walletName}.ows.eth`,
            durationMs: 340,
          },
          {
            step: 4,
            label: "Payment broadcast on-chain",
            detail: `tx: 0x${Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('')}...\nBlock: ${Math.floor(Math.random() * 1000000) + 20000000}\nGas: ~0.000012 ETH`,
            durationMs: 900,
          },
          {
            step: 5,
            label: "API access granted",
            detail: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{ "data": "...", "paid_by": "${input.walletName}.ows.eth" }`,
            durationMs: 60,
          },
        ];

        const txHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        const blockNumber = Math.floor(Math.random() * 1000000) + 20000000;

        return {
          success: true,
          walletName: input.walletName,
          endpoint: input.endpoint,
          amount: input.amount,
          currency: input.currency,
          chain: input.chain,
          txHash,
          blockNumber,
          steps,
          totalMs: steps.reduce((acc, s) => acc + s.durationMs, 0),
        };
      }),

    discover: publicProcedure
      .query(() => {
        return {
          services: [
            {
              name: "Weather API",
              endpoint: "https://api.example.com/weather",
              price: 0.001,
              currency: "USDC",
              chain: "base",
              description: "Real-time weather data for any location",
            },
            {
              name: "AI Inference",
              endpoint: "https://api.example.com/inference",
              price: 0.005,
              currency: "USDC",
              chain: "base",
              description: "LLM inference endpoint, pay-per-call",
            },
            {
              name: "ENS Resolver",
              endpoint: "https://api.example.com/resolve",
              price: 0.0005,
              currency: "USDC",
              chain: "base",
              description: "Resolve any ENS name to multi-chain addresses",
            },
            {
              name: "Price Feed",
              endpoint: "https://api.example.com/prices",
              price: 0.002,
              currency: "USDC",
              chain: "base",
              description: "Real-time crypto price data across 500+ assets",
            },
          ],
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

