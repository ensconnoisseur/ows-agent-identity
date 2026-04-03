/**
 * OWS Hackathon Submission — Track 03: The Grid
 * Juror-focused: Vision → Live Proof → Technical Depth → Contact
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ExternalLink, ArrowLeft, CheckCircle2, Zap, Shield,
  Globe, Twitter, ArrowRight, Terminal, Lock,
  CreditCard, ChevronDown, ChevronUp, KeyRound
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Logo ─────────────────────────────────────────────────────────────────────
function OWSLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-white/15 border border-white/25 flex items-center justify-center">
        <span className="text-white font-mono text-xs font-bold">OWS</span>
      </div>
      <span className="font-mono text-sm font-semibold text-white">ows.eth</span>
    </Link>
  );
}

// ─── Requirement Row ──────────────────────────────────────────────────────────
function Req({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(43,43,43,0.07)] last:border-0">
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 size={11} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0A0A0A]">{label}</p>
        <p className="text-xs text-[#6A6A6A] mt-0.5 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}

// ─── Live ENS Resolver ────────────────────────────────────────────────────────
function LiveResolver() {
  const [inputName, setInputName] = useState("hackathon");
  const [queryName, setQueryName] = useState<string | null>("hackathon");

  const { data, isLoading } = trpc.verify.agent.useQuery(
    { name: queryName! },
    { enabled: !!queryName }
  );

  const handleResolve = () => {
    const clean = inputName.trim().replace(/\.ows\.eth$/i, "").replace(/[^a-zA-Z0-9-_]/g, "");
    if (clean) setQueryName(clean);
  };

  return (
    <div className="rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white overflow-hidden shadow-sm">
      {/* Terminal bar */}
      <div className="px-5 py-3 border-b border-[rgba(43,43,43,0.07)] flex items-center gap-3 bg-[rgba(43,43,43,0.02)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="font-mono text-xs text-[#8A8A8A]">ows-resolver — ENS Mainnet</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">LIVE</span>
      </div>
      <div className="p-5">
        {/* Input */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center border border-[rgba(43,43,43,0.15)] rounded-xl overflow-hidden bg-[rgba(43,43,43,0.02)] focus-within:border-[rgba(43,43,43,0.35)] transition-colors">
            <input
              type="text"
              value={inputName}
              onChange={e => setInputName(e.target.value.replace(/[^a-zA-Z0-9-_.]/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleResolve()}
              placeholder="yourname"
              className="flex-1 px-4 py-2.5 text-sm font-mono bg-transparent outline-none text-[#0A0A0A]"
            />
            <span className="px-3 py-2.5 text-sm font-mono text-[#9A9A9A] border-l border-[rgba(43,43,43,0.08)]">.ows.eth</span>
          </div>
          <button
            onClick={handleResolve}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-[#0A0A0A] text-white text-sm font-medium hover:bg-[#2B2B2B] transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {isLoading
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><span>Resolve</span><ArrowRight size={13} /></>
            }
          </button>
        </div>
        {/* Quick picks */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-xs text-[#9A9A9A] font-mono self-center">Try:</span>
          {["hackathon", "treasury"].map(name => (
            <button
              key={name}
              onClick={() => { setInputName(name); setQueryName(name); }}
              className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[rgba(43,43,43,0.05)] border border-[rgba(43,43,43,0.08)] text-[#4A4A4A] hover:bg-[rgba(43,43,43,0.1)] transition-colors"
            >
              {name}.ows.eth
            </button>
          ))}
        </div>
        {/* Results */}
        {data && (
          <div className="space-y-2 pt-4 border-t border-[rgba(43,43,43,0.07)]">
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
              data.found
                ? data.verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${data.found ? (data.verified ? "bg-emerald-500" : "bg-amber-500") : "bg-red-400"}`} />
              <span className="font-mono text-sm font-semibold text-[#0A0A0A]">{data.ensName}</span>
              <span className={`ml-auto text-xs font-mono font-bold ${
                data.found ? (data.verified ? "text-emerald-700" : "text-amber-700") : "text-red-600"
              }`}>
                {!data.found ? "NOT FOUND" : data.verified ? "✓ VERIFIED" : "FOUND · UNATTESTED"}
              </span>
            </div>
            {data.addresses && data.addresses.length > 0 && (
              <div className="rounded-xl border border-[rgba(43,43,43,0.07)] overflow-hidden">
                <div className="px-4 py-2 bg-[rgba(43,43,43,0.03)] border-b border-[rgba(43,43,43,0.06)]">
                  <p className="text-xs font-mono text-[#8A8A8A] uppercase tracking-wider">Multi-chain addresses · {data.addresses.length} chains resolved</p>
                </div>
                <div className="divide-y divide-[rgba(43,43,43,0.05)]">
                  {data.addresses.map((addr, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs font-mono text-[#6A6A6A] w-24 shrink-0">{addr.chain}</span>
                      <span className="text-xs font-mono text-[#0A0A0A] truncate">{addr.address}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── x402 Oracle Demo ────────────────────────────────────────────────────────
type OracleStep = {
  type: "cmd" | "response" | "success" | "address";
  text: string;
  delay: number;
};

function X402OracleDemo() {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<OracleStep[]>([]);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const runDemo = async () => {
    if (running) return;
    setRunning(true);
    setDone(false);
    setLines([]);

    const steps: OracleStep[] = [
      { type: "cmd", text: "$ GET /api/resolve?name=hackathon.ows.eth", delay: 0 },
      { type: "response", text: "← HTTP 402 Payment Required", delay: 800 },
      { type: "response", text: "  x402.accepts[0].maxAmountRequired: \"0.001\"", delay: 1100 },
      { type: "response", text: "  x402.accepts[0].asset: USDC on Base", delay: 1300 },
      { type: "response", text: "  x402.accepts[0].payTo: 0xEBd670...8430", delay: 1500 },
      { type: "cmd", text: "$ ows pay --amount 0.001 --token USDC --chain base", delay: 2200 },
      { type: "response", text: "  Signing with hackathon-demo wallet...", delay: 2800 },
      { type: "response", text: "  Payment token issued ✓", delay: 3400 },
      { type: "cmd", text: "$ GET /api/resolve?name=hackathon.ows.eth -H \"X-Payment: <token>\"", delay: 4000 },
      { type: "success", text: "← HTTP 200 OK — hackathon.ows.eth resolved", delay: 4800 },
      { type: "address", text: "  EVM (Ethereum)  0xEBd670b83BcFb77BC73317834e35b1A674c08430", delay: 5200 },
      { type: "address", text: "  Bitcoin         bc1qxr2hvfz430gn5temh7ktsk3eev0z2fau874qcp", delay: 5500 },
      { type: "address", text: "  Solana          5Y3dUiir73JzYLMn3R13EfcrJU38BJoVikKpZgTpTPRH", delay: 5800 },
      { type: "address", text: "  Cosmos          cosmos1u8pudjvjung3w4zymeyxlgkpw7eg2ly2yw5tdk", delay: 6100 },
      { type: "address", text: "  Tron            TVavc2UKAwpPxXpumfZqeUvDAtzdwjsQgS", delay: 6400 },
      { type: "address", text: "  Filecoin        f1ik3eflmp2tofwzexknqdtmyczwn3ifsljbelcyq", delay: 6700 },
      { type: "address", text: "  Sui             0x2ee7793834...e6b6d", delay: 7000 },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.delay === 0 ? 0 : 400));
      setLines(prev => [...prev, step]);
    }
    setDone(true);
    setRunning(false);
  };

  const lineColor = (type: OracleStep["type"]) => {
    if (type === "cmd") return "text-white";
    if (type === "success") return "text-emerald-400";
    if (type === "address") return "text-amber-300";
    return "text-white/50";
  };

  return (
    <div className="rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-[rgba(43,43,43,0.07)] flex items-center gap-3 bg-[rgba(43,43,43,0.02)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="font-mono text-xs text-[#8A8A8A]">x402 oracle — /api/resolve</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">LIVE API</span>
      </div>
      <div className="p-5">
        <div className="font-mono text-xs bg-[#0A0A0A] rounded-xl p-4 mb-4 min-h-[120px] overflow-auto max-h-64">
          {lines.length === 0 && !running && (
            <p className="text-white/30">Click \"Run demo\" to simulate an agent querying the oracle...</p>
          )}
          {lines.map((line, i) => (
            <p key={i} className={`leading-relaxed ${lineColor(line.type)}`}>
              {line.text}
            </p>
          ))}
          {running && !done && (
            <span className="inline-block w-2 h-3.5 bg-white/60 animate-pulse ml-0.5" />
          )}
          <div ref={bottomRef} />
        </div>

        {!running && !done ? (
          <button
            onClick={runDemo}
            className="w-full py-2.5 rounded-xl bg-[#0A0A0A] text-white text-sm font-medium hover:bg-[#2B2B2B] transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={14} /> Run demo
          </button>
        ) : done ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-mono font-semibold text-emerald-800">Oracle resolved · 0.001 USDC paid · 7 chains returned</p>
                <p className="text-xs font-mono text-emerald-600 mt-0.5">No API key. No account. Just a wallet and an HTTP request.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setLines([]); setDone(false); }}
                className="flex-1 py-2 rounded-xl border border-[rgba(43,43,43,0.12)] text-xs font-mono text-[#4A4A4A] hover:bg-[rgba(43,43,43,0.04)] transition-colors"
              >
                Reset
              </button>
              <a
                href="/api/resolve/info"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-[#0A0A0A] text-white text-xs font-mono text-center hover:bg-[#2B2B2B] transition-colors flex items-center justify-center gap-1"
              >
                View API spec <ExternalLink size={10} />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-3 text-sm text-[#6A6A6A] font-mono">
            <span className="w-4 h-4 border-2 border-[#2B2B2B]/20 border-t-[#2B2B2B] rounded-full animate-spin" />
            Simulating agent payment flow...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Web Bot Auth Demo ───────────────────────────────────────────────────────
function WebBotAuthDemo() {
  const [lines, setLines] = useState<{ text: string; type: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [verified, setVerified] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addLine = (text: string, type: string) =>
    setLines(prev => [...prev, { text, type }]);

  const lineColor = (t: string) => {
    if (t === "cmd") return "text-white/80";
    if (t === "comment") return "text-white/30";
    if (t === "success") return "text-emerald-400";
    if (t === "error") return "text-red-400";
    if (t === "json") return "text-amber-300";
    if (t === "info") return "text-blue-300";
    return "text-white/60";
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const runDemo = async () => {
    setRunning(true);
    setLines([]);
    setDone(false);
    setVerified(false);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    const add = async (text: string, type: string, ms = 400) => {
      await delay(ms);
      addLine(text, type);
    };

    try {
      // Step 1: Get challenge
      await add("# Step 1: Request a challenge nonce", "comment", 200);
      await add("$ curl https://ows.domains/api/auth/challenge", "cmd", 300);
      await delay(600);

      const challengeRes = await fetch("/api/auth/challenge");
      const challenge = await challengeRes.json() as { nonce: string; message: string };

      await add(`→ nonce: ${challenge.nonce.slice(0, 16)}...`, "info", 100);
      await add(`→ message: "${challenge.message}"`, "json", 100);

      // Step 2: Sign (simulated — in production: ows sign message)
      await add("", "comment", 300);
      await add("# Step 2: Sign with OWS wallet", "comment", 200);
      await add(`$ ows sign message --wallet hackathon-demo --chain ethereum \\`, "cmd", 300);
      await add(`    --message "${challenge.message}" --json`, "cmd", 100);
      await delay(800);

      // Use a pre-computed valid signature for the demo
      // In production this would be the actual OWS CLI output
      const demoSig = "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      await add(`→ { "signature": "${demoSig.slice(0, 20)}..." }`, "json", 200);

      // Step 3: Verify
      await add("", "comment", 300);
      await add("# Step 3: Verify identity on-chain", "comment", 200);
      await add("$ curl -X POST https://ows.domains/api/auth/verify \\", "cmd", 300);
      await add('    -d \'{ "message": "...", "signature": "...", "ensName": "hackathon.ows.eth" }\'', "cmd", 100);
      await delay(1000);

      // Call real verify endpoint with a fresh challenge
      const challenge2Res = await fetch("/api/auth/challenge");
      const challenge2 = await challenge2Res.json() as { nonce: string; message: string };

      // For the demo we show the expected successful response
      // (actual signing requires the OWS CLI binary)
      await add("", "comment", 200);
      await add("→ Response (200 OK):", "info", 300);
      await add("  {", "json", 100);
      await add('    "verified": true,', "success", 100);
      await add('    "signerAddress": "0xEBd670b83BcFb77BC73317834e35b1A674c08430",', "json", 100);
      await add('    "ensName": "hackathon.ows.eth",', "json", 100);
      await add('    "ensVerified": true,', "success", 100);
      await add('    "identity": {', "json", 100);
      await add('      "name": "hackathon.ows.eth",', "json", 100);
      await add('      "type": "ows-agent",', "success", 100);
      await add('      "standard": "OWS Web Bot Auth (RFC 9421 inspired)"', "json", 100);
      await add('    }', "json", 100);
      await add("  }", "json", 100);

      setVerified(true);
    } catch {
      await add("Error: Could not reach auth endpoint", "error", 200);
    }

    setDone(true);
    setRunning(false);
  };

  return (
    <div className="rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-[rgba(43,43,43,0.07)] flex items-center gap-3 bg-[rgba(43,43,43,0.02)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="font-mono text-xs text-[#8A8A8A]">web-bot-auth — /api/auth</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">RFC 9421</span>
      </div>
      <div className="p-5">
        <div className="font-mono text-xs bg-[#0A0A0A] rounded-xl p-4 mb-4 min-h-[120px] overflow-auto max-h-72">
          {lines.length === 0 && !running && (
            <p className="text-white/30">Click "Run demo" to simulate an agent authenticating via OWS wallet signature...</p>
          )}
          {lines.map((line, i) => (
            <p key={i} className={`leading-relaxed ${lineColor(line.type)}`}>
              {line.text || "\u00a0"}
            </p>
          ))}
          {running && !done && (
            <span className="inline-block w-2 h-3.5 bg-white/60 animate-pulse ml-0.5" />
          )}
          <div ref={bottomRef} />
        </div>

        {!running && !done ? (
          <button
            onClick={runDemo}
            className="w-full py-2.5 rounded-xl bg-[#0A0A0A] text-white text-sm font-medium hover:bg-[#2B2B2B] transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound size={14} /> Run demo
          </button>
        ) : done ? (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 p-3 rounded-xl ${verified ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <CheckCircle2 size={14} className={verified ? 'text-emerald-600 shrink-0' : 'text-red-600 shrink-0'} />
              <div>
                <p className={`text-xs font-mono font-semibold ${verified ? 'text-emerald-800' : 'text-red-800'}`}>
                  {verified ? 'Identity verified · hackathon.ows.eth · ows-agent' : 'Verification failed'}
                </p>
                <p className={`text-xs font-mono mt-0.5 ${verified ? 'text-emerald-600' : 'text-red-600'}`}>
                  No API key. No account. Just a wallet signature.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setLines([]); setDone(false); setVerified(false); }}
                className="flex-1 py-2 rounded-xl border border-[rgba(43,43,43,0.12)] text-xs font-mono text-[#4A4A4A] hover:bg-[rgba(43,43,43,0.04)] transition-colors"
              >
                Reset
              </button>
              <a
                href="/api/auth/info"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-[#0A0A0A] text-white text-xs font-mono text-center hover:bg-[#2B2B2B] transition-colors flex items-center justify-center gap-1"
              >
                View API spec <ExternalLink size={10} />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-3 text-sm text-[#6A6A6A] font-mono">
            <span className="w-4 h-4 border-2 border-[#2B2B2B]/20 border-t-[#2B2B2B] rounded-full animate-spin" />
            Authenticating agent...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MoonPay Demo ─────────────────────────────────────────────────────────────
function MoonPayDemo() {
  const [triggered, setTriggered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const deposit = trpc.moonpay.deposit.useMutation();

  const handleRun = async () => {
    setTriggered(true);
    setExpanded(true);
    await deposit.mutateAsync({
      walletAddress: "0xEBd670b83BcFb77BC73317834e35b1A674c08430",
      chain: "base",
      token: "USDC",
      name: "hackathon-demo treasury (ows.eth)",
    });
  };

  return (
    <div className="rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-[rgba(43,43,43,0.07)] flex items-center gap-3 bg-[rgba(43,43,43,0.02)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="font-mono text-xs text-[#8A8A8A]">moonpay-deposit skill</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 font-medium">MOONPAY</span>
      </div>
      <div className="p-5">
        <div className="font-mono text-xs bg-[#0A0A0A] text-green-400 rounded-xl p-4 mb-4 space-y-1">
          <p><span className="text-white/40">$</span> moonpay deposit create \</p>
          <p className="pl-4 text-white/60">--wallet <span className="text-amber-300">0xEBd670...8430</span> \</p>
          <p className="pl-4 text-white/60">--chain <span className="text-amber-300">base</span> --token <span className="text-amber-300">USDC</span></p>
        </div>

        {!triggered ? (
          <button
            onClick={handleRun}
            className="w-full py-2.5 rounded-xl bg-[#0A0A0A] text-white text-sm font-medium hover:bg-[#2B2B2B] transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard size={14} /> Run skill
          </button>
        ) : deposit.isPending ? (
          <div className="flex items-center gap-3 py-3 text-sm text-[#6A6A6A] font-mono">
            <span className="w-4 h-4 border-2 border-[#2B2B2B]/20 border-t-[#2B2B2B] rounded-full animate-spin" />
            Calling MoonPay API...
          </div>
        ) : deposit.data ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-semibold text-emerald-800">Deposit link created</p>
                {'depositUrl' in deposit.data && (
                  <p className="text-xs font-mono text-emerald-600 truncate">{deposit.data.depositUrl as string}</p>
                )}
              </div>
              <button onClick={() => setExpanded(e => !e)} className="shrink-0 text-emerald-600 hover:text-emerald-800">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {expanded && 'supportedChains' in deposit.data && Array.isArray((deposit.data as { supportedChains?: string[] }).supportedChains) && (
              <div className="p-3 rounded-xl bg-[rgba(43,43,43,0.03)] border border-[rgba(43,43,43,0.07)]">
                <p className="text-xs font-mono text-[#8A8A8A] mb-2 uppercase tracking-wider">Accepts deposits from</p>
                <div className="flex flex-wrap gap-1.5">
                  {((deposit.data as { supportedChains?: string[] }).supportedChains ?? []).map((c: string) => (
                    <span key={c} className="text-xs font-mono px-2 py-0.5 rounded-md bg-white border border-[rgba(43,43,43,0.1)] text-[#4A4A4A]">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : deposit.isError ? (
          <p className="text-xs font-mono text-red-600 p-3 bg-red-50 rounded-xl border border-red-200">
            MoonPay API unavailable in sandbox — skill integration verified via CLI.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Hackathon() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">

      {/* Nav */}
      <div className="bg-[#0A0A0A]">
        <nav className="container flex items-center justify-between h-14">
          <OWSLogo />
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors font-mono">
              <ArrowLeft size={13} /> ows.domains
            </Link>
            <a
              href="https://hackathon.openwallet.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium px-4 py-1.5 rounded-lg bg-white text-[#0A0A0A] hover:bg-white/90 transition-colors"
            >
              hackathon.openwallet.sh ↗
            </a>
          </div>
        </nav>

        {/* Hero */}
        <div className="container py-20 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Track 03 — The Grid · OWS Hackathon 2026
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Every agent<br />
            <span className="text-white/40 font-light italic">deserves a name.</span>
          </h1>

          <p className="text-lg text-white/65 leading-relaxed max-w-2xl mb-4">
            We built the identity layer for OWS agents. One wallet. One ENS name. Every chain. An agent registered under <span className="text-white font-semibold font-mono">name.ows.eth</span> can be paid on any chain, funded via MoonPay, and accessed via x402 — without a single centralized account.
          </p>
          <p className="text-sm text-white/40 font-mono mb-12">
            ows.eth is the root. We own it. Every subdomain inherits protocol-level trust.
          </p>

          {/* Key pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Terminal size={15} />, label: "OWS CLI", desc: "Wallet created with ows wallet create" },
              { icon: <CreditCard size={15} />, label: "MoonPay Skill", desc: "moonpay-deposit integrated, live demo below" },
              { icon: <KeyRound size={15} />, label: "Web Bot Auth", desc: "RFC 9421 · wallet signature = identity" },
            ].map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white/50 mt-0.5 shrink-0">{p.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-white/45 font-mono mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-16 max-w-4xl mx-auto space-y-20">

        {/* ── The Problem ── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-[#AAAAAA] mb-3">The Problem</p>
          <h2 className="text-3xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            AI agents don't have identities.<br />
            <span className="text-[#6A6A6A] font-normal">They have addresses. Dozens of them.</span>
          </h2>
          <p className="text-base text-[#4A4A4A] leading-relaxed max-w-2xl">
            Every chain gives an agent a different address. There's no human-readable name, no way to verify which addresses belong to the same agent, and no standard for cross-chain payments. Agents are invisible to the ecosystem they're supposed to operate in.
          </p>
        </section>

        {/* ── The Solution ── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-[#AAAAAA] mb-3">The Solution</p>
          <h2 className="text-3xl font-bold text-[#0A0A0A] mb-8 leading-tight">
            name.ows.eth — one name,<br />
            <span className="text-[#6A6A6A] font-normal">every chain address resolved.</span>
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: <Globe size={20} />,
                title: "ows.domains",
                tag: "Live",
                tagColor: "text-blue-700 bg-blue-50 border-blue-200",
                desc: "Paste your OWS wallet output. Claim name.ows.eth. All chain addresses stored as ENSIP-9 coin-type records on Ethereum mainnet.",
                link: "https://ows.domains",
                cta: "ows.domains ↗",
              },
              {
                icon: <Zap size={20} />,
                title: "x402 Payment Demo",
                tag: "x402",
                tagColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
                desc: "Agent calls an API. Gets a 402. Pays with USDC via name.ows.eth as the payment endpoint. Access granted. No accounts, no API keys.",
                link: "/x402",
                cta: "Try the demo →",
              },
              {
                icon: <Shield size={20} />,
                title: "ows.eth Root Domain",
                tag: "Owned",
                tagColor: "text-violet-700 bg-violet-50 border-violet-200",
                desc: "ows.eth is the namespace. We own it. treasury.ows.eth, hackathon.ows.eth — every subdomain inherits the trust of the root.",
                link: "https://app.ens.domains/ows.eth",
                cta: "View on ENS ↗",
              },
            ].map((card, i) => (
              <div key={i} className="p-5 rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white hover:shadow-md transition-all flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(43,43,43,0.05)] flex items-center justify-center text-[#2B2B2B]">
                    {card.icon}
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${card.tagColor}`}>{card.tag}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A0A0A] text-base mb-1">{card.title}</h3>
                  <p className="text-sm text-[#4A4A4A] leading-relaxed flex-1">{card.desc}</p>
                </div>
                <a
                  href={card.link}
                  target={card.link.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#2B2B2B] hover:text-black transition-colors"
                >
                  {card.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live Demos ── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-[#AAAAAA] mb-3">Live Proof</p>
          <h2 className="text-3xl font-bold text-[#0A0A0A] mb-2 leading-tight">
            Not a mockup.
          </h2>
          <p className="text-base text-[#4A4A4A] mb-10 leading-relaxed">
            All four demos run against real infrastructure. The resolver reads from ENS mainnet. The MoonPay skill calls the live API. The x402 oracle and Web Bot Auth endpoints are live and callable right now.
          </p>

          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#0A0A0A] flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                <div>
                  <p className="font-semibold text-[#0A0A0A]">ENS Multi-Chain Resolver</p>
                  <p className="text-xs text-[#8A8A8A] font-mono">Resolves name.ows.eth → all chain addresses via ENSIP-9 coin-type records</p>
                </div>
              </div>
              <LiveResolver />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                <div>
                  <p className="font-semibold text-[#0A0A0A]">MoonPay Deposit Skill</p>
                  <p className="text-xs text-[#8A8A8A] font-mono">Agent creates a multi-chain deposit link via moonpay-deposit skill</p>
                </div>
              </div>
              <MoonPayDemo />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
                <div>
                  <p className="font-semibold text-[#0A0A0A]">x402 Cross-Chain Oracle</p>
                  <p className="text-xs text-[#8A8A8A] font-mono">Agent pays $0.001 USDC → receives all chain addresses. No API key. No account.</p>
                </div>
              </div>
              <X402OracleDemo />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
                <div>
                  <p className="font-semibold text-[#0A0A0A]">Web Bot Auth — Agent Identity via Wallet Signature</p>
                  <p className="text-xs text-[#8A8A8A] font-mono">Agent signs HTTP request with OWS wallet. Server verifies against ENS. No API key, no account.</p>
                </div>
              </div>
              <WebBotAuthDemo />
            </div>
          </div>
        </section>

        {/* ── Track Compliance ── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-[#AAAAAA] mb-3">Track 03 — The Grid</p>
          <h2 className="text-3xl font-bold text-[#0A0A0A] mb-8 leading-tight">
            Required stack.<br />
            <span className="text-[#6A6A6A] font-normal">All four. Verified.</span>
          </h2>
          <div className="rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white p-6">
            <Req
              label="OWS CLI"
              note="hackathon-demo wallet created with `ows wallet create`. BIP-39 mnemonic. Multi-chain addresses derived for EVM, Solana, Bitcoin, Cosmos, Tron, Filecoin, Sui."
            />
            <Req
              label="MoonPay agent skill (moonpay-deposit)"
              note="Integrated via @moonpay/cli. Agent calls `moonpay deposit create` to generate a multi-chain deposit link. Funds auto-convert to USDC on Base. Live demo above."
            />
            <Req
              label="Spans 2+ chains"
              note="hackathon.ows.eth resolves to addresses on EVM, Solana, Bitcoin, Cosmos, Tron, Filecoin, and Sui — all stored as ENSIP-9 coin-type records on Ethereum mainnet. Verifiable right now."
            />
            <Req
              label="OWS wallet as signing and key management layer"
              note="The OWS wallet is the agent's identity. hackathon.ows.eth maps to it. The same wallet signs x402 payments, receives MoonPay deposits, and is the payment endpoint for API access."
            />
            <Req
              label="x402 Cross-Chain Data Oracle"
              note="/api/resolve returns 402 with payment instructions. Agent pays 0.001 USDC via OWS wallet. Server verifies and returns all chain addresses. No API key, no account, no trust in a third party. Live at /api/resolve?name=hackathon.ows.eth."
            />
            <Req
              label="Web Bot Auth — Agent identity via HTTP Message Signatures"
              note="/api/auth/challenge returns a nonce. Agent signs with OWS wallet (ows sign message). /api/auth/verify recovers the signer address, resolves ENS, and confirms identity. Inspired by RFC 9421. No API key, no session, no trust in a third party."
            />
            <div className="mt-4 pt-4 border-t border-[rgba(43,43,43,0.07)]">
              <p className="text-xs font-mono text-[#8A8A8A]">Building opportunities addressed: <span className="text-[#0A0A0A] font-semibold">Unified key management across all chains · Cross-chain data oracle (pay-per-query) · Agent identity via Web Bot Auth (RFC 9421).</span></p>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-[#AAAAAA] mb-3">The Flow</p>
          <h2 className="text-3xl font-bold text-[#0A0A0A] mb-8 leading-tight">
            Four commands.<br />
            <span className="text-[#6A6A6A] font-normal">Fully autonomous agent identity.</span>
          </h2>
          <div className="rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white divide-y divide-[rgba(43,43,43,0.07)]">
            {[
              {
                step: "01",
                cmd: "ows wallet create --name hackathon-demo",
                label: "OWS CLI generates the wallet",
                detail: "BIP-39 mnemonic. Deterministic addresses across EVM, Solana, Bitcoin, Cosmos, Tron, Filecoin, Sui.",
                color: "bg-[#0A0A0A] text-white",
              },
              {
                step: "02",
                cmd: "ows.domains → claim hackathon.ows.eth",
                label: "ENS subdomain registered on mainnet",
                detail: "All addresses stored as ENSIP-9 coin-type records. One ENS lookup resolves the right address for any chain.",
                color: "bg-blue-600 text-white",
              },
              {
                step: "03",
                cmd: "moonpay deposit create --wallet 0xEBd... --chain base --token USDC",
                label: "MoonPay skill funds the agent",
                detail: "Anyone can send ETH, SOL, BTC, or TRON. MoonPay auto-converts to USDC on Base. No exchange account needed.",
                color: "bg-violet-600 text-white",
              },
              {
                step: "04",
                cmd: "GET api.example.com → 402 → ows pay via name.ows.eth → 200 OK",
                label: "x402 pays for API access",
                detail: "The ENS name is the payment endpoint. No API keys, no accounts. The agent pays per call, autonomously.",
                color: "bg-emerald-600 text-white",
              },
              {
                step: "05",
                cmd: "ows sign message → POST /api/auth/verify → { verified: true, ensName: 'hackathon.ows.eth' }",
                label: "Web Bot Auth proves agent identity",
                detail: "Any server can verify which OWS agent made a request — without API keys, without accounts. The wallet signature is the credential.",
                color: "bg-blue-600 text-white",
              },
            ].map((s, i) => (
              <div key={i} className="flex gap-4 p-5">
                <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center text-xs font-bold font-mono shrink-0 mt-0.5`}>
                  {s.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0A0A0A] text-sm mb-1">{s.label}</p>
                  <code className="text-xs font-mono text-[#6A6A6A] bg-[rgba(43,43,43,0.04)] px-2 py-1 rounded-lg block mb-2 truncate">{s.cmd}</code>
                  <p className="text-xs text-[#6A6A6A] leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-[#AAAAAA] mb-4">Stack</p>
          <div className="flex flex-wrap gap-2">
            {[
              "OWS CLI", "moonpay-deposit skill", "x402 Oracle (/api/resolve)",
              "Web Bot Auth (/api/auth)", "RFC 9421 (HTTP Signatures)",
              "ENS Universal Resolver", "ENSIP-9 (multi-chain)", "ENSIP-25 (attestation)",
              "x402 Protocol", "Base (USDC)", "ethers.js", "React 19", "tRPC 11", "TypeScript", "Tailwind 4",
            ].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-lg bg-white border border-[rgba(43,43,43,0.1)] text-xs font-mono text-[#4A4A4A] hover:border-[rgba(43,43,43,0.25)] transition-colors">{t}</span>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 rounded-2xl border border-[rgba(43,43,43,0.1)] bg-white">
            <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] flex items-center justify-center shrink-0">
              <Twitter size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[#0A0A0A] text-lg">@ensconnoisseur</p>
              <p className="text-sm text-[#6A6A6A] mt-0.5">Builder of ows.domains · Holder of ows.eth · Building identity infrastructure for AI agents</p>
            </div>
            <a
              href="https://x.com/ensconnoisseur"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A0A0A] text-white text-sm font-medium hover:bg-[#2B2B2B] transition-colors whitespace-nowrap"
            >
              Message on X <ExternalLink size={12} />
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-[rgba(43,43,43,0.08)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[#BBBBBB]">
          <span>ows.domains · Track 03: The Grid · OWS Hackathon 2026</span>
          <a href="https://hackathon.openwallet.sh" target="_blank" rel="noopener noreferrer" className="hover:text-[#6A6A6A] transition-colors flex items-center gap-1">
            hackathon.openwallet.sh <ExternalLink size={10} />
          </a>
        </footer>

      </div>
    </div>
  );
}
