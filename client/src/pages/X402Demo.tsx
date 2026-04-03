/**
 * OWS x402 Payment Demo
 * Shows how an OWS agent automatically pays for API access using the x402 protocol
 * Design: Terminal Minimal — same style as Home.tsx
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Zap, ChevronRight, ArrowLeft, CheckCircle2, Circle, Loader2, Copy, Check } from "lucide-react";
import { Link } from "wouter";

// ─── OWS Logo ────────────────────────────────────────────────────────────────
function OWSLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="#2B2B2B" strokeWidth="1.5" fill="none" />
        <path d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z" fill="#2B2B2B" />
      </svg>
      <span className="font-mono font-semibold text-[#0A0A0A] tracking-tight">ows.eth</span>
    </div>
  );
}

// ─── Terminal Window ──────────────────────────────────────────────────────────
function TerminalWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[rgba(43,43,43,0.12)] shadow-xl">
      <div className="bg-[#1A1A1A] px-4 py-3 flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)]">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-xs font-mono text-[#6A6A6A]">{title}</span>
      </div>
      <div className="bg-[#0D0D0D] p-5 font-mono text-sm text-[#E5E5E5] leading-relaxed min-h-[120px]">
        {children}
      </div>
    </div>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
interface Service {
  name: string;
  endpoint: string;
  price: number;
  currency: string;
  chain: string;
  description: string;
}

function ServiceCard({ service, selected, onClick }: { service: Service; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? "border-[#2B2B2B] bg-[rgba(43,43,43,0.06)] shadow-md"
          : "border-[rgba(43,43,43,0.12)] bg-white hover:border-[rgba(43,43,43,0.3)] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-[#0A0A0A] text-sm mb-1">{service.name}</div>
          <div className="text-xs text-[#6A6A6A] mb-2">{service.description}</div>
          <div className="font-mono text-xs text-[#4A4A4A] bg-[rgba(43,43,43,0.05)] px-2 py-0.5 rounded inline-block">
            {service.endpoint.replace("https://", "")}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-semibold text-[#0A0A0A] text-sm">{service.price} {service.currency}</div>
          <div className="text-xs text-[#6A6A6A] mt-0.5">per call · {service.chain}</div>
        </div>
      </div>
    </button>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step, label, status }: { step: number; label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-300 ${status === "pending" ? "opacity-40" : "opacity-100"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
        status === "done" ? "bg-green-500 text-white" :
        status === "active" ? "bg-[#2B2B2B] text-white" :
        "bg-[rgba(43,43,43,0.1)] text-[#6A6A6A]"
      }`}>
        {status === "done" ? <CheckCircle2 size={14} /> :
         status === "active" ? <Loader2 size={14} className="animate-spin" /> :
         <span className="text-xs font-mono">{step}</span>}
      </div>
      <span className={`text-sm font-medium ${status === "active" ? "text-[#0A0A0A]" : "text-[#4A4A4A]"}`}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function X402Demo() {
  const [walletName, setWalletName] = useState("agent-treasury");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [result, setResult] = useState<null | {
    txHash: string;
    blockNumber: number;
    totalMs: number;
    steps: Array<{ step: number; label: string; detail: string; durationMs: number }>;
  }>(null);
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { data: discoverData } = trpc.x402.discover.useQuery();
  const simulate = trpc.x402.simulate.useMutation();

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const addLine = (line: string) => {
    setTerminalLines(prev => [...prev, line]);
  };

  const runDemo = async () => {
    if (!selectedService || !walletName) return;

    setTerminalLines([]);
    setActiveStep(0);
    setResult(null);

    try {
      // Step 1
      setActiveStep(1);
      addLine(`$ ows pay request --wallet ${walletName} \\`);
      addLine(`    --endpoint ${selectedService.endpoint}`);
      await sleep(300);
      addLine("");

      // Step 2
      setActiveStep(2);
      addLine("→ Sending HTTP request...");
      await sleep(400);
      addLine("← HTTP/1.1 402 Payment Required");
      addLine(`   X-Payment-Required: amount=${selectedService.price} currency=${selectedService.currency}`);
      addLine(`   chain=${selectedService.chain}`);
      await sleep(300);
      addLine("");

      // Step 3
      setActiveStep(3);
      addLine(`→ OWS signing payment with ${walletName}.ows.eth...`);
      await sleep(500);

      // Call backend
      const res = await simulate.mutateAsync({
        walletName,
        endpoint: selectedService.endpoint,
        amount: selectedService.price,
        currency: selectedService.currency,
        chain: selectedService.chain,
      });

      addLine(`✓ Signed with ${walletName}.ows.eth`);
      await sleep(200);
      addLine("");

      // Step 4
      setActiveStep(4);
      addLine("→ Broadcasting payment on-chain...");
      await sleep(600);
      addLine(`✓ tx: ${res.txHash.slice(0, 20)}...`);
      addLine(`   Block: ${res.blockNumber}`);
      addLine(`   Gas: ~0.000012 ETH`);
      await sleep(300);
      addLine("");

      // Step 5
      setActiveStep(5);
      addLine("← HTTP/1.1 200 OK");
      addLine(`   paid_by: ${walletName}.ows.eth`);
      addLine(`   Content-Type: application/json`);
      await sleep(200);
      addLine("");
      addLine(`✓ API access granted in ${res.totalMs}ms`);

      setResult(res);
    } catch {
      addLine("✗ Error during simulation");
    }
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const copyHash = () => {
    if (result) {
      navigator.clipboard.writeText(result.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const steps = [
    "Agent sends HTTP request",
    "Server responds: 402 Payment Required",
    "OWS wallet signs payment",
    "Payment broadcast on-chain",
    "API access granted",
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FAF7F2 0%, #FDF5EE 50%, #FAF7F2 100%)" }}>

      {/* Nav */}
      <nav className="border-b border-[rgba(43,43,43,0.08)] bg-[rgba(250,247,242,0.8)] backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <OWSLogo />
          <div className="flex items-center gap-6">
            <Link href="/"
              className="text-sm text-[#6A6A6A] hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft size={12} /> Back to ows.domains
            </Link>
            <a href="https://www.x402.org" target="_blank" rel="noopener noreferrer"
              className="text-sm text-[#6A6A6A] hover:text-foreground transition-colors flex items-center gap-1">
              x402.org <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </nav>

      <div className="container py-16 max-w-5xl">

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(43,43,43,0.06)] border border-[rgba(43,43,43,0.1)] text-xs font-mono text-[#6A6A6A] mb-5">
            <Zap size={10} className="text-amber-500" />
            x402 · HTTP-native payments · powered by ows.eth
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#0A0A0A] leading-[1.1] mb-4">
            Pay-per-call APIs<br />
            <span className="italic font-light">for AI agents.</span>
          </h1>
          <p className="text-[#4A4A4A] text-lg leading-relaxed max-w-2xl">
            x402 is an open HTTP standard: a server responds with <span className="font-mono text-sm bg-[rgba(43,43,43,0.06)] px-1.5 py-0.5 rounded">402 Payment Required</span>, the agent pays with stablecoins, and access is granted instantly. No accounts, no API keys, no friction.
          </p>
        </div>

        {/* How it works — 3 boxes */}
        <div className="grid md:grid-cols-3 gap-4 mb-14">
          {[
            { icon: "01", title: "Agent calls API", body: "Any HTTP client sends a request. No account or API key needed." },
            { icon: "02", title: "Server says: 402", body: "The server responds with the price, currency, and payment address." },
            { icon: "03", title: "OWS pays & retries", body: "ows.eth signs the payment on-chain. Access granted in milliseconds." },
          ].map((item) => (
            <div key={item.icon} className="p-5 rounded-xl border border-[rgba(43,43,43,0.1)] bg-white/60">
              <div className="font-mono text-xs text-[#6A6A6A] mb-3">{item.icon}</div>
              <div className="font-semibold text-[#0A0A0A] mb-2">{item.title}</div>
              <div className="text-sm text-[#4A4A4A] leading-relaxed">{item.body}</div>
            </div>
          ))}
        </div>

        {/* Interactive Demo */}
        <div className="rounded-2xl border border-[rgba(43,43,43,0.12)] bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg mb-14">
          <div className="px-6 py-5 border-b border-[rgba(43,43,43,0.08)]">
            <h2 className="font-semibold text-[#0A0A0A] text-lg">Live Demo</h2>
            <p className="text-sm text-[#6A6A6A] mt-1">Select a service, set your wallet name, and watch the payment flow happen in real time.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[rgba(43,43,43,0.08)]">

            {/* Left: Config */}
            <div className="p-6">
              {/* Wallet name */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-[#6A6A6A] mb-2">WALLET NAME</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(43,43,43,0.15)] bg-[rgba(43,43,43,0.03)] font-mono text-sm">
                  <input
                    value={walletName}
                    onChange={e => setWalletName(e.target.value.replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 bg-transparent outline-none text-[#0A0A0A]"
                    placeholder="agent-treasury"
                    maxLength={32}
                  />
                  <span className="text-[#6A6A6A]">.ows.eth</span>
                </div>
              </div>

              {/* Service selection */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-[#6A6A6A] mb-2">SELECT x402 SERVICE</label>
                <div className="space-y-2">
                  {discoverData?.services.map((svc) => (
                    <ServiceCard
                      key={svc.endpoint}
                      service={svc}
                      selected={selectedService?.endpoint === svc.endpoint}
                      onClick={() => setSelectedService(svc)}
                    />
                  ))}
                </div>
              </div>

              {/* Run button */}
              <button
                onClick={runDemo}
                disabled={!selectedService || !walletName || simulate.isPending}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#2B2B2B] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {simulate.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Running payment flow...</>
                ) : (
                  <><Zap size={14} /> Run x402 Payment Demo</>
                )}
              </button>
            </div>

            {/* Right: Terminal + Steps */}
            <div className="p-6 flex flex-col gap-6">

              {/* Step indicators */}
              <div className="space-y-3">
                {steps.map((label, i) => (
                  <StepIndicator
                    key={i}
                    step={i + 1}
                    label={label}
                    status={activeStep > i + 1 ? "done" : activeStep === i + 1 ? "active" : "pending"}
                  />
                ))}
              </div>

              {/* Terminal output */}
              <TerminalWindow title="ows pay request">
                <div ref={terminalRef} className="max-h-56 overflow-y-auto space-y-0.5">
                  {terminalLines.length === 0 ? (
                    <div className="text-[#4A4A4A] italic">Select a service and click "Run" to start...</div>
                  ) : (
                    terminalLines.map((line, i) => (
                      <div key={i} className={
                        line.startsWith("$") ? "text-[#7DD3FC]" :
                        line.startsWith("✓") ? "text-green-400" :
                        line.startsWith("←") ? "text-amber-400" :
                        line.startsWith("→") ? "text-[#C084FC]" :
                        line.startsWith("✗") ? "text-red-400" :
                        line.startsWith("   ") ? "text-[#6A6A6A] pl-2" :
                        "text-[#E5E5E5]"
                      }>
                        {line || "\u00A0"}
                      </div>
                    ))
                  )}
                  {simulate.isPending && (
                    <span className="inline-block w-2 h-4 bg-[#E5E5E5] animate-pulse ml-0.5" />
                  )}
                </div>
              </TerminalWindow>

              {/* Result card */}
              {result && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-3">
                    <CheckCircle2 size={16} />
                    Payment successful · {result.totalMs}ms total
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600 font-mono">tx hash</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-green-800">{result.txHash.slice(0, 18)}...</span>
                        <button onClick={copyHash} className="text-green-600 hover:text-green-800 transition-colors">
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600 font-mono">block</span>
                      <span className="text-xs font-mono text-green-800">{result.blockNumber.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600 font-mono">paid by</span>
                      <span className="text-xs font-mono text-green-800">{walletName}.ows.eth</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="mb-14">
          <h2 className="font-semibold text-[#0A0A0A] text-xl mb-6">CLI Reference</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                cmd: "ows pay request",
                desc: "Make a paid HTTP request to any x402-enabled endpoint",
                example: "ows pay request --wallet agent-treasury \\\n  --endpoint https://api.example.com/data",
              },
              {
                cmd: "ows pay discover",
                desc: "Discover x402-enabled services and their prices",
                example: "ows pay discover\n# Lists available services with prices",
              },
            ].map((item) => (
              <div key={item.cmd} className="rounded-xl border border-[rgba(43,43,43,0.1)] overflow-hidden">
                <div className="px-4 py-3 bg-[rgba(43,43,43,0.04)] border-b border-[rgba(43,43,43,0.08)]">
                  <span className="font-mono text-sm font-semibold text-[#0A0A0A]">{item.cmd}</span>
                  <p className="text-xs text-[#6A6A6A] mt-0.5">{item.desc}</p>
                </div>
                <div className="bg-[#0D0D0D] p-4">
                  <pre className="font-mono text-xs text-[#7DD3FC] whitespace-pre-wrap">{item.example}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-[rgba(43,43,43,0.12)] bg-[rgba(43,43,43,0.03)] p-8 text-center">
          <h3 className="font-semibold text-[#0A0A0A] text-xl mb-3">Give your agent an identity on ows.eth</h3>
          <p className="text-[#4A4A4A] text-sm max-w-lg mx-auto mb-6">
            Every x402 payment is signed by your agent's wallet. With <strong>name.ows.eth</strong>, that identity is human-readable, multi-chain, and verifiable on-chain.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/#claim"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#2B2B2B] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-all">
              Claim your name <ChevronRight size={14} />
            </Link>
            <a href="https://www.x402.org" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[rgba(43,43,43,0.2)] text-sm font-medium text-[#2B2B2B] hover:bg-[rgba(43,43,43,0.04)] transition-colors">
              Learn about x402 <ExternalLink size={12} />
            </a>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-[rgba(43,43,43,0.08)] py-8 mt-8">
        <div className="container flex items-center justify-between">
          <OWSLogo />
          <p className="text-xs text-[#6A6A6A] font-mono">
            Community tool · not affiliated with OWS core team
          </p>
        </div>
      </footer>
    </div>
  );
}
