/**
 * OWS Agent Identity — Home Page
 * Design: Terminal Minimal (openwallet.sh-inspired)
 * Warm cream bg (#FAF7F2), dark buttons (#2B2B2B), JetBrains Mono for code
 * Layout: Nav → Hero (2-col) → How it works → Claim form → Footer
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, ChevronRight, Zap } from "lucide-react";
import { Link } from "wouter";

// ─── Typewriter Hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 55, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.15 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChainAddress {
  chain: string;
  caip: string;
  address: string;
  path: string;
  color: string;
  icon: string;
}

interface ParsedWallet {
  name: string;
  chains: ChainAddress[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHAIN_META: Record<string, { color: string; icon: string; label: string }> = {
  evm:      { color: "#627EEA", icon: "⬡", label: "EVM" },
  solana:   { color: "#9945FF", icon: "◎", label: "Solana" },
  bitcoin:  { color: "#F7931A", icon: "₿", label: "Bitcoin" },
  cosmos:   { color: "#2E3148", icon: "⚛", label: "Cosmos" },
  tron:     { color: "#EF0027", icon: "◈", label: "Tron" },
  ton:      { color: "#0088CC", icon: "◆", label: "TON" },
  sui:      { color: "#4DA2FF", icon: "◉", label: "Sui" },
  spark:    { color: "#FF9500", icon: "⚡", label: "Spark" },
  filecoin: { color: "#0090FF", icon: "⬡", label: "Filecoin" },
};

const SAMPLE_OUTPUT = `{
  "name": "agent-treasury",
  "chains": {
    "eip155:1": "0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb",
    "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "7Kz9...Bm4x",
    "bip122:000000000019d6689c085ae165831e93": "bc1q...8k4m",
    "cosmos:cosmoshub-4": "cosmos1...jxyz",
    "tron:mainnet": "TQn9Y...abc",
    "ton:mainnet": "EQBvI...def",
    "sui:mainnet": "0x4f3a...ghi",
    "spark:mainnet": "spark:1abc...jkl",
    "fil:mainnet": "f1abc...mno"
  }
}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function OWSLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2L26 8V20L14 26L2 20V8L14 2Z" stroke="#0A0A0A" strokeWidth="1.5" fill="none"/>
        <path d="M14 7L21 11V17L14 21L7 17V11L14 7Z" stroke="#0A0A0A" strokeWidth="1.5" fill="none"/>
        <circle cx="14" cy="14" r="2" fill="#0A0A0A"/>
      </svg>
      <span className="text-sm font-semibold tracking-tight text-foreground">ows.eth</span>
    </div>
  );
}

function TerminalWindow({ children, title = "terminal" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-dot" style={{ background: "#FF5F57" }} />
        <div className="terminal-dot" style={{ background: "#FEBC2E" }} />
        <div className="terminal-dot" style={{ background: "#28C840" }} />
        <span className="ml-3 text-xs text-[#6A6A6A] font-mono">{title}</span>
      </div>
      <div className="terminal-body">
        {children}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-[#6A6A6A] hover:text-white transition-colors p-1 rounded">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jsonInput, setJsonInput] = useState("");
  const [parsed, setParsed] = useState<ParsedWallet | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [subdomainError, setSubdomainError] = useState("");
  const [claimed, setClaimed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter for headline
  const { displayed: headline, done: headlineDone } = useTypewriter("Give your agent");

  // Scroll reveal
  useScrollReveal();

  // Animate terminal lines — loops after completion
  const runTerminal = useCallback(() => {
    const lines = [
      "$ ows wallet create --name agent-treasury",
      "✓ Created wallet agent-treasury",
      "",
      "  Chain          Address                    Path",
      "  ─────────────────────────────────────────────────────",
      "  eip155:1       0xab16...fcdb              m/44'/60'/0'/0/0",
      "  solana:...     7Kz9...Bm4x                m/44'/501'/0'/0'",
      "  bip122:...     bc1q...8k4m                m/84'/0'/0'/0/0",
      "  cosmos:...     cosmos1...jxyz             m/44'/118'/0'/0/0",
      "  ton:mainnet    EQBvI...def                m/44'/607'/0'",
      "  sui:mainnet    0x4f3a...ghi               m/44'/784'/0'/0'/0'",
    ];
    setTerminalLines([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setTerminalLines(prev => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
        // Loop after 3s pause
        terminalTimerRef.current = setTimeout(() => runTerminal(), 3000);
      }
    }, 130);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    runTerminal();
    return () => {
      if (terminalTimerRef.current) clearTimeout(terminalTimerRef.current);
    };
  }, [runTerminal]);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Parse OWS JSON output
  const parseOWSOutput = (input: string): ParsedWallet | null => {
    try {
      const data = JSON.parse(input);
      const chains: ChainAddress[] = [];

      const chainMap = data.chains || data.addresses || {};
      for (const [caip, address] of Object.entries(chainMap)) {
        const chainKey = caip.split(":")[0].toLowerCase()
          .replace("eip155", "evm")
          .replace("bip122", "bitcoin")
          .replace("solana", "solana")
          .replace("cosmos", "cosmos")
          .replace("tron", "tron")
          .replace("ton", "ton")
          .replace("sui", "sui")
          .replace("spark", "spark")
          .replace("fil", "filecoin");

        const meta = CHAIN_META[chainKey] || { color: "#6A6A6A", icon: "◈", label: chainKey };
        chains.push({
          chain: chainKey,
          caip: caip as string,
          address: address as string,
          path: "",
          color: meta.color,
          icon: meta.icon,
        });
      }

      return {
        name: data.name || "agent",
        chains,
      };
    } catch {
      return null;
    }
  };

  const handleParse = () => {
    if (!jsonInput.trim()) {
      toast.error("Please paste your OWS wallet output first.");
      return;
    }
    const result = parseOWSOutput(jsonInput);
    if (!result) {
      toast.error("Could not parse the output. Make sure it's valid JSON from `ows wallet list --json`.");
      return;
    }
    setParsed(result);
    setSubdomain(result.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
    setStep(2);
    toast.success(`Parsed ${result.chains.length} chain addresses.`);
  };

  const handleUseSample = () => {
    setJsonInput(SAMPLE_OUTPUT);
    toast.info("Sample output loaded. Click Parse to continue.");
  };

  const validateSubdomain = (value: string) => {
    if (!value) return "Subdomain is required.";
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)) return "Only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.";
    if (value.length < 2) return "At least 2 characters.";
    if (value.length > 32) return "Maximum 32 characters.";
    return "";
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(val);
    setSubdomainError(validateSubdomain(val));
  };

  const handleClaim = async () => {
    const err = validateSubdomain(subdomain);
    if (err) { setSubdomainError(err); return; }
    if (!parsed) return;

    setIsLoading(true);
    // Simulate processing
    await new Promise(r => setTimeout(r, 1800));
    setIsLoading(false);
    setClaimed(true);
    setStep(3);
  };

  const truncate = (addr: string, chars = 6) =>
    addr.length > chars * 2 + 3 ? `${addr.slice(0, chars)}...${addr.slice(-4)}` : addr;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FAF7F2 0%, #FDF5EE 50%, #FAF7F2 100%)" }}>

      {/* ── Nav ── */}
      <nav className="border-b border-[rgba(43,43,43,0.08)] bg-[rgba(250,247,242,0.8)] backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <OWSLogo />
          <div className="flex items-center gap-6">
            <a href="https://openwallet.sh" target="_blank" rel="noopener noreferrer"
              className="text-sm text-[#6A6A6A] hover:text-foreground transition-colors flex items-center gap-1">
              openwallet.sh <ExternalLink size={12} />
            </a>
            <a href="https://github.com/open-wallet-standard/core" target="_blank" rel="noopener noreferrer"
              className="text-sm text-[#6A6A6A] hover:text-foreground transition-colors flex items-center gap-1">
              GitHub <ExternalLink size={12} />
            </a>
            <Link href="/x402"
              className="text-sm text-[#6A6A6A] hover:text-foreground transition-colors flex items-center gap-1">
              <Zap size={12} className="text-amber-500" /> x402 Demo
            </Link>
            <Link href="/hackathon"
              className="text-sm font-medium text-[#6A6A6A] hover:text-foreground transition-colors flex items-center gap-1">
              🏆 Hackathon
            </Link>
            <a href="#claim"
              className="text-sm font-medium px-4 py-1.5 rounded-md bg-[#2B2B2B] text-white hover:bg-[#1A1A1A] transition-colors">
              Claim Name
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663361642700/gZskzeg2khtjvya4DrqMwa/ows-hero-bg-Ti8unkPHC9tGF3D3CF8uu7.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="container relative py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Copy */}
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(43,43,43,0.06)] border border-[rgba(43,43,43,0.1)] text-xs font-mono text-[#6A6A6A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Community Tool · ows.eth
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-mono font-semibold text-amber-700">
                  DEMO
                </div>
              </div>

              <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#0A0A0A] leading-[1.1] mb-5">
                <span className={headlineDone ? "" : "typewriter-cursor"}>{headline || "\u00A0"}</span><br />
                <span className="italic font-light">a name on-chain.</span>
              </h1>

              <p className="text-[#4A4A4A] text-lg leading-relaxed mb-8 max-w-md">
                OWS gives your agent a wallet on every chain. <strong className="font-medium text-[#0A0A0A]">ows.eth</strong> gives it an identity. Claim <span className="font-mono text-sm bg-[rgba(43,43,43,0.06)] px-1.5 py-0.5 rounded">yourname.ows.eth</span> and map all your multi-chain addresses to a single human-readable name.
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {Object.entries(CHAIN_META).map(([key, meta], idx) => (
                  <span
                    key={key}
                    className="chain-badge chain-badge-float"
                    style={{
                      borderColor: `${meta.color}30`,
                      color: meta.color,
                      background: `${meta.color}10`,
                      animationDuration: `${2.2 + idx * 0.3}s`,
                      animationDelay: `${idx * 0.15}s`,
                    }}
                  >
                    {meta.icon} {meta.label}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <a href="#claim"
                  className="btn-pulse inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#2B2B2B] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-all hover:shadow-lg">
                  Claim your name <ChevronRight size={14} />
                </a>
                <a href="https://openwallet.sh" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[rgba(43,43,43,0.2)] text-sm font-medium text-[#2B2B2B] hover:bg-[rgba(43,43,43,0.04)] transition-colors">
                  What is OWS?
                </a>
              </div>
            </div>

            {/* Right: Terminal */}
            <div className="animate-fade-in-up animate-delay-200">
              <TerminalWindow title="ows wallet create">
                <div ref={terminalRef} className="max-h-64 overflow-hidden">
                  {terminalLines.map((line, i) => (
                    <div key={i} className={
                      (line ?? "").startsWith("$") ? "terminal-prompt" :
                      (line ?? "").startsWith("✓") ? "text-green-400" :
                      (line ?? "").includes("eip155") || (line ?? "").includes("solana") || (line ?? "").includes("bip122") || (line ?? "").includes("cosmos") || (line ?? "").includes("ton") || (line ?? "").includes("sui") ? "terminal-address" :
                      (line ?? "").startsWith("  Chain") || (line ?? "").startsWith("  ─") ? "terminal-comment" :
                      "text-[#E5E5E5]"
                    }>
                      {line || "\u00A0"}
                    </div>
                  ))}
                  {terminalLines.length < 11 && (
                    <span className="terminal-prompt cursor-blink">█</span>
                  )}
                </div>
                {terminalLines.length >= 11 && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <div className="text-[#6A6A6A] text-xs mb-1"># Now claim your ENS identity</div>
                    <div className="terminal-prompt">$ <span className="text-white">claim </span><span className="terminal-chain">agent-treasury.ows.eth</span></div>
                    <div className="text-green-400">✓ agent-treasury.ows.eth → all chains registered</div>
                  </div>
                )}
              </TerminalWindow>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 border-t border-[rgba(43,43,43,0.06)]">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <p className="step-number mb-3">HOW IT WORKS</p>
            <h2 className="text-2xl lg:text-3xl font-semibold text-[#0A0A0A] tracking-tight">
              From wallet to identity in three steps.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "Create your OWS wallet",
                desc: "Run `ows wallet create --name my-agent` in your terminal. OWS generates addresses for all 9 supported chains from a single seed.",
                code: "ows wallet create --name my-agent",
              },
              {
                num: "02",
                title: "Export your addresses",
                desc: "Run `ows wallet list --json` and copy the output. This gives us all your multi-chain addresses in a single JSON object.",
                code: "ows wallet list --json",
              },
              {
                num: "03",
                title: "Claim your ENS name",
                desc: "Paste the JSON output below, choose a subdomain, and claim yourname.ows.eth. All addresses are stored in a single ENS name.",
                code: "yourname.ows.eth",
              },
            ].map((item, idx) => (
              <div key={item.num} className="group reveal" style={{ transitionDelay: `${idx * 0.15}s` }}>
                <div className="step-number mb-4">{item.num}</div>
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#6A6A6A] leading-relaxed mb-4">{item.desc}</p>
                <div className="flex items-center justify-between bg-[#1A1A1A] rounded-lg px-4 py-3">
                  <code className="text-xs text-[#93C5FD] font-mono">{item.code}</code>
                  <CopyButton text={item.code} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it matters ── */}
      <section className="py-16 bg-[rgba(43,43,43,0.02)] border-y border-[rgba(43,43,43,0.06)]">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🔒", title: "Brand Protection", desc: "Secure the canonical on-chain identity for your agent before someone else does." },
              { icon: "🌐", title: "Multi-Chain by Default", desc: "One ENS name resolves to all 9 OWS chains. EVM, Solana, Bitcoin, Cosmos and more." },
              { icon: "🧩", title: "Composable", desc: "Subdomains like docs.ows.eth, treasury.ows.eth, or agents.ows.eth — all from one root." },
              { icon: "⚡", title: "Zero Config", desc: "No smart contract deployment. No gas fees. Offchain ENS resolution via CCIP-Read." },
            ].map((item, idx) => (
              <div key={item.title} className="feature-card reveal p-5 rounded-xl border border-[rgba(43,43,43,0.08)] bg-white/60 backdrop-blur-sm" style={{ transitionDelay: `${idx * 0.1}s` }}>
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-semibold text-[#0A0A0A] mb-1.5">{item.title}</h3>
                <p className="text-xs text-[#6A6A6A] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Claim Form ── */}
      <section id="claim" className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="mb-10">
              <p className="step-number mb-3">CLAIM YOUR NAME</p>
              <h2 className="text-2xl lg:text-3xl font-semibold text-[#0A0A0A] tracking-tight mb-3">
                Register <span className="font-mono text-[1.6rem]">yourname.ows.eth</span>
              </h2>
              <p className="text-[#6A6A6A] text-sm leading-relaxed">
                Paste your OWS wallet JSON output below. All multi-chain addresses will be stored in your ENS subdomain.
              </p>
              {/* Demo disclaimer */}
              <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-amber-500 mt-0.5 text-base">⚠</span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong className="font-semibold">This is a concept demo.</strong> No subdomains are actually registered on-chain. This tool shows what ows.eth subdomains could look like. Built as a community initiative.
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-all ${
                    step >= s ? "bg-[#2B2B2B] text-white" : "bg-[rgba(43,43,43,0.08)] text-[#6A6A6A]"
                  }`}>
                    {step > s ? <Check size={12} /> : s}
                  </div>
                  {s < 3 && <div className={`h-px w-12 transition-all ${step > s ? "bg-[#2B2B2B]" : "bg-[rgba(43,43,43,0.12)]"}`} />}
                </div>
              ))}
              <span className="ml-2 text-xs text-[#6A6A6A] font-mono">
                {step === 1 ? "Paste output" : step === 2 ? "Choose name" : "Done!"}
              </span>
            </div>

            {/* Step 1: Paste JSON */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in-up">
                <div>
                  <label className="block text-xs font-mono font-medium text-[#6A6A6A] mb-2 uppercase tracking-wider">
                    OWS Wallet Output (JSON)
                  </label>
                  <div className="relative">
                    <textarea
                      value={jsonInput}
                      onChange={e => setJsonInput(e.target.value)}
                      placeholder={`Paste the output of:\n  ows wallet list --json\n\nor\n  ows wallet create --name my-agent`}
                      className="w-full h-48 px-4 py-3 rounded-xl border border-[rgba(43,43,43,0.12)] bg-[#1A1A1A] text-[#E5E5E5] font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(43,43,43,0.3)] placeholder-[#4A4A4A]"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[#6A6A6A]">
                      Run <code className="bg-[rgba(43,43,43,0.06)] px-1.5 py-0.5 rounded font-mono">ows wallet list --json</code> in your terminal
                    </p>
                    <button
                      onClick={handleUseSample}
                      className="text-xs text-[#6A6A6A] hover:text-[#0A0A0A] underline transition-colors"
                    >
                      Use sample
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleParse}
                  className="w-full py-3 rounded-xl bg-[#2B2B2B] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-all hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Parse Addresses <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Step 2: Choose subdomain */}
            {step === 2 && parsed && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Parsed addresses preview */}
                <div>
                  <label className="block text-xs font-mono font-medium text-[#6A6A6A] mb-3 uppercase tracking-wider">
                    Detected Addresses ({parsed.chains.length} chains)
                  </label>
                  <div className="rounded-xl border border-[rgba(43,43,43,0.08)] overflow-hidden">
                    {parsed.chains.map((c, i) => (
                      <div key={c.caip} className={`flex items-center justify-between px-4 py-3 ${i < parsed.chains.length - 1 ? "border-b border-[rgba(43,43,43,0.06)]" : ""} bg-white/40`}>
                        <div className="flex items-center gap-3">
                          <span className="text-base" style={{ color: c.color }}>{c.icon}</span>
                          <div>
                            <span className="text-xs font-mono font-medium text-[#0A0A0A]">{CHAIN_META[c.chain]?.label || c.chain}</span>
                            <span className="text-xs text-[#6A6A6A] ml-2 font-mono">{truncate(c.address, 8)}</span>
                          </div>
                        </div>
                        <Check size={12} className="text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subdomain input */}
                <div>
                  <label className="block text-xs font-mono font-medium text-[#6A6A6A] mb-2 uppercase tracking-wider">
                    Choose your subdomain
                  </label>
                  <div className="input-glow flex items-center justify-between rounded-xl border border-[rgba(43,43,43,0.12)] overflow-hidden bg-white/60">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={handleSubdomainChange}
                      placeholder="my-agent"
                      className="flex-1 px-4 py-3 text-sm font-mono bg-transparent focus:outline-none text-[#0A0A0A] placeholder-[#AAAAAA]"
                    />
                    <span className="px-4 py-3 text-sm font-mono text-[#6A6A6A] bg-[rgba(43,43,43,0.04)] border-l border-[rgba(43,43,43,0.08)]">
                      .ows.eth
                    </span>
                  </div>
                  {subdomainError && (
                    <p className="text-xs text-red-500 mt-1.5">{subdomainError}</p>
                  )}
                  {!subdomainError && subdomain && (
                    <p className="text-xs text-green-600 mt-1.5 font-mono">✓ {subdomain}.ows.eth looks good</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-xl border border-[rgba(43,43,43,0.12)] text-sm font-medium text-[#6A6A6A] hover:bg-[rgba(43,43,43,0.04)] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleClaim}
                    disabled={isLoading || !!subdomainError || !subdomain}
                    className="flex-1 py-3 rounded-xl bg-[#2B2B2B] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        Claim {subdomain || "yourname"}.ows.eth
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && claimed && parsed && (
              <div className="animate-fade-in-up text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
                  <Check size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-[#0A0A0A] mb-2">
                  <span className="font-mono">{subdomain}.ows.eth</span> is yours.
                </h3>
                <p className="text-sm text-[#6A6A6A] mb-6 max-w-sm mx-auto">
                  Your agent now has an on-chain identity across {parsed.chains.length} chains. Share it, use it in dApps, or point it to your agent's contracts.
                </p>

                <div className="bg-[#1A1A1A] rounded-xl p-4 text-left mb-6">
                  <div className="text-xs text-[#6A6A6A] font-mono mb-2"># Resolves to</div>
                  {parsed.chains.slice(0, 4).map(c => (
                    <div key={c.caip} className="text-xs font-mono">
                      <span className="text-[#FCD34D]">{CHAIN_META[c.chain]?.label || c.chain}</span>
                      <span className="text-[#6A6A6A]"> → </span>
                      <span className="text-[#93C5FD]">{truncate(c.address, 10)}</span>
                    </div>
                  ))}
                  {parsed.chains.length > 4 && (
                    <div className="text-xs text-[#6A6A6A] font-mono mt-1">+ {parsed.chains.length - 4} more chains</div>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <a
                    href={`https://app.ens.domains/${subdomain}.ows.eth`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2B2B2B] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-all"
                  >
                    View on ENS <ExternalLink size={13} />
                  </a>
                  <button
                    onClick={() => { setStep(1); setJsonInput(""); setParsed(null); setSubdomain(""); setClaimed(false); }}
                    className="px-5 py-2.5 rounded-xl border border-[rgba(43,43,43,0.12)] text-sm font-medium text-[#6A6A6A] hover:bg-[rgba(43,43,43,0.04)] transition-colors"
                  >
                    Claim another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(43,43,43,0.08)] py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <OWSLogo />
            <span className="text-xs text-[#AAAAAA]">— A community tool for the OWS ecosystem</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-[#AAAAAA]">
            <a href="https://openwallet.sh" target="_blank" rel="noopener noreferrer" className="hover:text-[#6A6A6A] transition-colors flex items-center gap-1">
              openwallet.sh <ExternalLink size={10} />
            </a>
            <a href="https://app.ens.domains/ows.eth" target="_blank" rel="noopener noreferrer" className="hover:text-[#6A6A6A] transition-colors flex items-center gap-1">
              ows.eth on ENS <ExternalLink size={10} />
            </a>
            <a href="https://github.com/open-wallet-standard/core" target="_blank" rel="noopener noreferrer" className="hover:text-[#6A6A6A] transition-colors flex items-center gap-1">
              GitHub <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
