import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// Minimal tRPC context stub
const ctx = {
  user: null,
  req: {} as never,
  res: {} as never,
};

const caller = appRouter.createCaller(ctx);

describe("verify.agent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalises name by stripping .ows.eth suffix", async () => {
    // Mock fetch to return a 404 so we just test normalisation
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const result = await caller.verify.agent({ name: "treasury.ows.eth" });
    expect(result.ensName).toBe("treasury.ows.eth");
    expect(result.found).toBe(false);
  });

  it("returns found=false and error for 404 names", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const result = await caller.verify.agent({ name: "nonexistent-xyzabc" });
    expect(result.found).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.error).toContain("not registered");
  });

  it("returns found=true with addresses when ENS data is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: "0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb",
        addr60: "0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb",
        addr501: "7Kz9Bm4xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        records: {
          description: "OWS Agent Treasury",
        },
      }),
    }));

    const result = await caller.verify.agent({ name: "treasury" });
    expect(result.found).toBe(true);
    expect(result.ensName).toBe("treasury.ows.eth");
    expect(result.addresses.length).toBeGreaterThan(0);
    const evmAddr = result.addresses.find(a => a.caip === "coin:60");
    expect(evmAddr).toBeDefined();
    expect(evmAddr?.address).toBe("0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb");
  });

  it("detects ENSIP-25 attestation records and sets verified=true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: "0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb",
        records: {
          "agent-registration[0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432][42]": "1",
          description: "Verified OWS Agent",
        },
      }),
    }));

    const result = await caller.verify.agent({ name: "verified-agent" });
    expect(result.found).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.attestation?.ensip25Records.length).toBeGreaterThan(0);
    expect(result.attestation?.ensip25Records[0].value).toBe("1");
  });

  it("sets verified=false when no ENSIP-25 records present", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: "0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb",
        records: {
          description: "Regular OWS name, no agent attestation",
        },
      }),
    }));

    const result = await caller.verify.agent({ name: "regular-name" });
    expect(result.found).toBe(true);
    expect(result.verified).toBe(false);
  });

  it("handles fetch errors gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network timeout")));

    const result = await caller.verify.agent({ name: "timeout-test" });
    expect(result.found).toBe(false);
    expect(result.error).toContain("Network timeout");
  });

  it("rejects invalid names", async () => {
    await expect(caller.verify.agent({ name: "" })).rejects.toThrow();
  });
});
