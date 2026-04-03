/**
 * Web Bot Auth — OWS Agent Identity via HTTP Message Signatures
 *
 * Inspired by RFC 9421 (HTTP Message Signatures) adapted for OWS wallets.
 * An agent signs a canonical request string with its OWS wallet (EIP-191).
 * The server verifies the signature and resolves the signer's ENS identity.
 *
 * Flow:
 *   1. GET /api/auth/challenge  → returns a nonce
 *   2. Agent signs: "OWS-Auth {method} {path} {nonce}" with ows sign message
 *   3. POST /api/auth/verify    → verifies sig, resolves ENS, returns identity
 *   4. Protected endpoints check OWS-Signature header on every request
 */

import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import crypto from "crypto";

// In-memory nonce store (TTL: 5 minutes)
const nonceStore = new Map<string, { createdAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000;

// Clean up expired nonces every minute
setInterval(() => {
  const now = Date.now();
  const toDelete: string[] = [];
  nonceStore.forEach(({ createdAt }, nonce) => {
    if (now - createdAt > NONCE_TTL_MS) toDelete.push(nonce);
  });
  toDelete.forEach(n => nonceStore.delete(n));
}, 60_000);

// ENS Subgraph query to resolve ENS name from EVM address
async function resolveEnsName(address: string): Promise<string | null> {
  try {
    const query = `{
      domains(where: { resolvedAddress: "${address.toLowerCase()}" }, first: 1) {
        name
      }
    }`;
    const res = await fetch("https://api.thegraph.com/subgraphs/name/ensdomains/ens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { data?: { domains?: { name: string }[] } };
    return data?.data?.domains?.[0]?.name ?? null;
  } catch {
    return null;
  }
}

// Verify that an ENS name's ETH address matches the signer
async function verifyEnsOwnership(ensName: string, signerAddress: string): Promise<boolean> {
  try {
    const query = `{
      domains(where: { name: "${ensName}" }, first: 1) {
        resolvedAddress { id }
      }
    }`;
    const res = await fetch("https://api.thegraph.com/subgraphs/name/ensdomains/ens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { data?: { domains?: { resolvedAddress?: { id: string } }[] } };
    const ensAddress = data?.data?.domains?.[0]?.resolvedAddress?.id;
    if (!ensAddress) return false;
    return ensAddress.toLowerCase() === signerAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function createWebBotAuthRouter(): Router {
  const router = Router();

  /**
   * GET /api/auth/challenge
   * Returns a fresh nonce for the agent to sign.
   * Response: { nonce: string, message: string, expiresIn: number }
   */
  router.get("/challenge", (_req: Request, res: Response) => {
    const nonce = crypto.randomBytes(16).toString("hex");
    nonceStore.set(nonce, { createdAt: Date.now() });

    const timestamp = Math.floor(Date.now() / 1000);
    const message = `OWS-Auth nonce=${nonce} timestamp=${timestamp}`;

    res.json({
      nonce,
      message,
      timestamp,
      expiresIn: 300,
      instructions: {
        sign: `ows sign message --wallet <your-wallet> --chain ethereum --message "${message}" --json`,
        then: "POST /api/auth/verify with { message, signature, ensName (optional) }",
      },
    });
  });

  /**
   * POST /api/auth/verify
   * Verifies an OWS wallet signature and returns the agent's identity.
   * Body: { message: string, signature: string, ensName?: string }
   * Response: { verified: boolean, address: string, ensName?: string, identity: object }
   */
  router.post("/verify", async (req: Request, res: Response) => {
    const { message, signature, ensName } = req.body as {
      message?: string;
      signature?: string;
      ensName?: string;
    };

    if (!message || !signature) {
      res.status(400).json({
        verified: false,
        error: "message and signature are required",
      });
      return;
    }

    // Extract nonce from message
    const nonceMatch = message.match(/nonce=([a-f0-9]+)/);
    const nonce = nonceMatch?.[1];

    if (!nonce || !nonceStore.has(nonce)) {
      res.status(401).json({
        verified: false,
        error: "Invalid or expired nonce. Request a fresh challenge first.",
      });
      return;
    }

    // Check nonce age
    const { createdAt } = nonceStore.get(nonce)!;
    if (Date.now() - createdAt > NONCE_TTL_MS) {
      nonceStore.delete(nonce);
      res.status(401).json({
        verified: false,
        error: "Nonce expired. Request a fresh challenge.",
      });
      return;
    }

    // Consume nonce (one-time use)
    nonceStore.delete(nonce);

    // Normalize signature (add 0x prefix if missing)
    const normalizedSig = signature.startsWith("0x") ? signature : `0x${signature}`;

    // Recover signer address
    let signerAddress: string;
    try {
      signerAddress = ethers.verifyMessage(message, normalizedSig);
    } catch {
      res.status(401).json({
        verified: false,
        error: "Invalid signature. Could not recover signer address.",
      });
      return;
    }

    // Resolve ENS name from address (reverse lookup)
    let resolvedEnsName = ensName ?? null;
    let ensVerified = false;

    if (ensName) {
      // Verify that the claimed ENS name resolves to the signer
      ensVerified = await verifyEnsOwnership(ensName, signerAddress);
      if (!ensVerified) {
        res.status(401).json({
          verified: false,
          error: `ENS name ${ensName} does not resolve to ${signerAddress}`,
          signerAddress,
        });
        return;
      }
    } else {
      // Try reverse lookup
      resolvedEnsName = await resolveEnsName(signerAddress);
    }

    res.json({
      verified: true,
      signerAddress,
      ensName: resolvedEnsName,
      ensVerified,
      identity: {
        address: signerAddress,
        name: resolvedEnsName ?? signerAddress,
        type: resolvedEnsName?.endsWith(".ows.eth") ? "ows-agent" : "wallet",
        network: "ethereum",
        standard: "OWS Web Bot Auth (RFC 9421 inspired)",
      },
      issuedAt: new Date().toISOString(),
    });
  });

  /**
   * GET /api/auth/info
   * Returns API documentation for Web Bot Auth.
   */
  router.get("/info", (_req: Request, res: Response) => {
    res.json({
      name: "OWS Web Bot Auth",
      description:
        "Authenticate HTTP requests using an OWS wallet signature. No API keys, no accounts — just a wallet.",
      standard: "Inspired by RFC 9421 HTTP Message Signatures",
      endpoints: {
        "GET /api/auth/challenge": "Get a nonce to sign",
        "POST /api/auth/verify": "Verify a signed message and get agent identity",
      },
      flow: [
        "1. GET /api/auth/challenge → receive { nonce, message }",
        "2. Sign: ows sign message --wallet <name> --chain ethereum --message '<message>' --json",
        "3. POST /api/auth/verify with { message, signature, ensName? }",
        "4. Receive { verified: true, signerAddress, ensName, identity }",
      ],
      example: {
        challenge: "OWS-Auth nonce=abc123 timestamp=1743649200",
        signCommand:
          "ows sign message --wallet hackathon-demo --chain ethereum --message 'OWS-Auth nonce=abc123 timestamp=1743649200' --json",
        verify: {
          message: "OWS-Auth nonce=abc123 timestamp=1743649200",
          signature: "0x51c892...",
          ensName: "hackathon.ows.eth",
        },
      },
    });
  });

  return router;
}
