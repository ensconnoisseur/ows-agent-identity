import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      headers: { cookie: "" },
      header: () => "",
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("x402 router", () => {
  it("discover returns a list of services", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.x402.discover();
    expect(result.services).toBeDefined();
    expect(result.services.length).toBeGreaterThan(0);
    const svc = result.services[0];
    expect(svc).toHaveProperty("name");
    expect(svc).toHaveProperty("endpoint");
    expect(svc).toHaveProperty("price");
    expect(svc).toHaveProperty("currency");
    expect(svc).toHaveProperty("chain");
  });

  it("simulate returns a successful payment result", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.x402.simulate({
      walletName: "agent-treasury",
      endpoint: "https://api.example.com/weather",
      amount: 0.001,
      currency: "USDC",
      chain: "base",
    });
    expect(result.success).toBe(true);
    expect(result.walletName).toBe("agent-treasury");
    expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.blockNumber).toBeGreaterThan(0);
    expect(result.steps).toHaveLength(5);
    expect(result.totalMs).toBeGreaterThan(0);
  });

  it("simulate rejects invalid endpoint", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.x402.simulate({
        walletName: "agent-treasury",
        endpoint: "not-a-valid-url",
        amount: 0.001,
        currency: "USDC",
        chain: "base",
      })
    ).rejects.toThrow();
  });

  it("simulate rejects empty wallet name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.x402.simulate({
        walletName: "",
        endpoint: "https://api.example.com/weather",
        amount: 0.001,
        currency: "USDC",
        chain: "base",
      })
    ).rejects.toThrow();
  });
});
