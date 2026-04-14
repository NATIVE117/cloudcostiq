import { useState, useEffect, useRef } from "react";
import { Cpu, HardDrive, Database, Container, Scale, DoorOpen, Zap, Globe, BarChart3, Bot, CircleDot, Server } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// CloudCostIQ — Compare cloud costs. Cut your bill.
// ═══════════════════════════════════════════════════════════════

// Pricing data: US-East region, on-demand, Linux. Sources: provider pricing pages + Vantage/CloudPrice (Apr 2026)
const CLOUD_SERVICES = {
  compute: {
    label: "Compute (VMs)",
    icon: Cpu,
    unit: "per hour",
    options: [
      { name: "Small (2 vCPU, 4GB)", aws: 0.0416, azure: 0.042, gcp: 0.0335, hetzner: 0.0066, ovh: 0.0120, scaleway: 0.0110 },
      { name: "Medium (4 vCPU, 16GB)", aws: 0.1664, azure: 0.166, gcp: 0.1340, hetzner: 0.0124, ovh: 0.0310, scaleway: 0.0300 },
      { name: "Large (8 vCPU, 32GB)", aws: 0.3328, azure: 0.332, gcp: 0.2680, hetzner: 0.0300, ovh: 0.0620, scaleway: 0.0580 },
      { name: "XL (16 vCPU, 64GB)", aws: 0.6656, azure: 0.664, gcp: 0.5360, hetzner: 0.0593, ovh: 0.1240, scaleway: 0.1160 },
    ],
  },
  blockStorage: {
    label: "Block Storage (Disks)",
    icon: HardDrive,
    unit: "per GB/month",
    options: [
      { name: "SSD (General Purpose)", aws: 0.08, azure: 0.075, gcp: 0.068, hetzner: 0.048, ovh: 0.044, scaleway: 0.056 },
      { name: "SSD (Provisioned IOPS)", aws: 0.125, azure: 0.12, gcp: 0.10, hetzner: null, ovh: null, scaleway: null },
      { name: "HDD (Standard)", aws: 0.045, azure: 0.04, gcp: 0.040, hetzner: null, ovh: 0.025, scaleway: null },
    ],
  },
  objectStorage: {
    label: "Object Storage",
    icon: Database,
    unit: "per GB/month",
    options: [
      { name: "Standard (first 50TB)", aws: 0.023, azure: 0.0208, gcp: 0.020, hetzner: 0.006, ovh: 0.007, scaleway: 0.009 },
      { name: "Infrequent Access", aws: 0.0125, azure: 0.010, gcp: 0.010, hetzner: null, ovh: 0.002, scaleway: 0.002 },
      { name: "Archive", aws: 0.004, azure: 0.002, gcp: 0.004, hetzner: null, ovh: 0.0012, scaleway: 0.001 },
    ],
  },
  database: {
    label: "Managed Database (SQL)",
    icon: Server,
    unit: "per hour",
    options: [
      { name: "Small (2 vCPU, 8GB)", aws: 0.096, azure: 0.098, gcp: 0.090, hetzner: null, ovh: 0.065, scaleway: 0.058 },
      { name: "Medium (4 vCPU, 16GB)", aws: 0.192, azure: 0.196, gcp: 0.180, hetzner: null, ovh: 0.130, scaleway: 0.116 },
      { name: "Large (8 vCPU, 32GB)", aws: 0.384, azure: 0.392, gcp: 0.360, hetzner: null, ovh: 0.260, scaleway: 0.232 },
      { name: "XL (16 vCPU, 64GB)", aws: 0.768, azure: 0.784, gcp: 0.720, hetzner: null, ovh: 0.520, scaleway: null },
    ],
  },
  cache: {
    label: "Managed Cache (Redis)",
    icon: CircleDot,
    unit: "per hour",
    options: [
      { name: "Small (1 node, 1.5GB)", aws: 0.034, azure: 0.034, gcp: 0.036, hetzner: null, ovh: null, scaleway: null },
      { name: "Medium (1 node, 6GB)", aws: 0.068, azure: 0.068, gcp: 0.072, hetzner: null, ovh: null, scaleway: null },
      { name: "Large (1 node, 13GB)", aws: 0.136, azure: 0.136, gcp: 0.144, hetzner: null, ovh: null, scaleway: null },
    ],
  },
  kubernetes: {
    label: "Kubernetes (Managed)",
    icon: Container,
    unit: "per cluster/hour",
    options: [
      { name: "Control Plane only", aws: 0.10, azure: 0.00, gcp: 0.10, hetzner: null, ovh: 0.00, scaleway: 0.00 },
      { name: "Control Plane + 3 Nodes (4vCPU)", aws: 0.244, azure: 0.123, gcp: 0.232, hetzner: null, ovh: 0.093, scaleway: 0.090 },
      { name: "Control Plane + 6 Nodes (4vCPU)", aws: 0.388, azure: 0.246, gcp: 0.364, hetzner: null, ovh: 0.186, scaleway: 0.180 },
    ],
  },
  loadBalancer: {
    label: "Load Balancer",
    icon: Scale,
    unit: "per hour",
    options: [
      { name: "Application LB (basic)", aws: 0.0225, azure: 0.025, gcp: 0.025, hetzner: 0.008, ovh: 0.012, scaleway: 0.009 },
      { name: "Application LB + 1 LCU/hr", aws: 0.030, azure: 0.032, gcp: 0.025, hetzner: 0.008, ovh: 0.012, scaleway: 0.009 },
      { name: "Network LB", aws: 0.0225, azure: 0.005, gcp: 0.025, hetzner: 0.008, ovh: 0.012, scaleway: 0.009 },
    ],
  },
  natGateway: {
    label: "NAT Gateway",
    icon: DoorOpen,
    unit: "per hour + per GB",
    options: [
      { name: "NAT Gateway (hourly)", aws: 0.045, azure: 0.045, gcp: 0.044, hetzner: null, ovh: null, scaleway: 0.012 },
      { name: "NAT Data Processing (per GB)", aws: 0.045, azure: 0.045, gcp: 0.045, hetzner: null, ovh: null, scaleway: 0.01 },
    ],
  },
  functions: {
    label: "Serverless Functions",
    icon: Zap,
    unit: "per 1M requests",
    options: [
      { name: "128MB, <1s exec", aws: 0.20, azure: 0.20, gcp: 0.40, hetzner: null, ovh: null, scaleway: 0.15 },
      { name: "256MB, <1s exec", aws: 0.40, azure: 0.40, gcp: 0.80, hetzner: null, ovh: null, scaleway: 0.30 },
      { name: "512MB, <1s exec", aws: 0.80, azure: 0.80, gcp: 1.60, hetzner: null, ovh: null, scaleway: 0.60 },
    ],
  },
  cdn: {
    label: "CDN / Egress",
    icon: Globe,
    unit: "per GB out",
    options: [
      { name: "First 10TB", aws: 0.085, azure: 0.081, gcp: 0.085, hetzner: 0.00, ovh: 0.011, scaleway: 0.009 },
      { name: "10-50TB", aws: 0.080, azure: 0.075, gcp: 0.065, hetzner: 0.00, ovh: 0.011, scaleway: 0.009 },
      { name: "50-150TB", aws: 0.060, azure: 0.065, gcp: 0.045, hetzner: 0.00, ovh: 0.011, scaleway: 0.009 },
    ],
  },
  dataWarehouse: {
    label: "Data Warehouse",
    icon: BarChart3,
    unit: "per hour / per TB scanned",
    options: [
      { name: "On-demand query (per TB)", aws: 5.00, azure: 5.00, gcp: 6.25, hetzner: null, ovh: null, scaleway: null },
      { name: "Provisioned (2 nodes, small)", aws: 0.50, azure: 0.48, gcp: 0.00, hetzner: null, ovh: null, scaleway: null },
      { name: "Storage (per GB/month)", aws: 0.024, azure: 0.023, gcp: 0.020, hetzner: null, ovh: null, scaleway: null },
    ],
  },
  aiMl: {
    label: "AI / ML APIs",
    icon: Bot,
    unit: "per 1K tokens / per 1K images",
    options: [
      { name: "LLM API (input, per 1K tok)", aws: 0.003, azure: 0.003, gcp: 0.00125, hetzner: null, ovh: 0.003, scaleway: null },
      { name: "LLM API (output, per 1K tok)", aws: 0.015, azure: 0.015, gcp: 0.005, hetzner: null, ovh: 0.015, scaleway: null },
      { name: "Image Generation (per image)", aws: 0.04, azure: 0.04, gcp: 0.04, hetzner: null, ovh: null, scaleway: null },
    ],
  },
};

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0078D4",
  gcp: "#4285F4",
  hetzner: "#D50C2D",
  ovh: "#000E9C",
  scaleway: "#4F0599",
};

const PROVIDER_NAMES = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  hetzner: "Hetzner",
  ovh: "OVH",
  scaleway: "Scaleway",
};

const ALL_PROVIDERS = ["aws", "azure", "gcp", "hetzner", "ovh", "scaleway"];

const MONO = `'DM Mono', 'Menlo', monospace`;
const SANS = `'DM Sans', 'Helvetica Neue', sans-serif`;

function App() {
  const [selections, setSelections] = useState({});
  const [quantities, setQuantities] = useState({});
  const [aiTips, setAiTips] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [freeUsed, setFreeUsed] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("calculator");
  const [commitTier, setCommitTier] = useState("ondemand");
  const resultsRef = useRef(null);

  // Commitment discount multipliers (1 = full price, 0.65 = 35% off)
  // Only applies to compute-type services, not storage/transfer/serverless
  const COMMIT_DISCOUNTS = {
    ondemand: { aws: 1, azure: 1, gcp: 1, hetzner: 1, ovh: 1, scaleway: 1 },
    "1yr": { aws: 0.64, azure: 0.63, gcp: 0.73, hetzner: 1, ovh: 0.85, scaleway: 0.85 },
    "3yr": { aws: 0.42, azure: 0.40, gcp: 0.43, hetzner: 1, ovh: 0.70, scaleway: 0.70 },
  };
  // Categories where commitment discounts apply
  const COMMIT_CATEGORIES = ["compute", "database", "cache", "kubernetes"];

  const FREE_LIMIT = 3;

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("cciq-usage");
        if (r) setFreeUsed(parseInt(r.value) || 0);
      } catch (e) {}
    })();
  }, []);

  const toggleService = (category, optionIdx) => {
    const key = `${category}-${optionIdx}`;
    setSelections((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
        setQuantities((q) => {
          const nq = { ...q };
          delete nq[key];
          return nq;
        });
      } else {
        next[key] = { category, optionIdx };
        setQuantities((q) => ({
          ...q,
          [key]: ["objectStorage", "blockStorage", "cdn"].includes(category) ? 100
            : category === "functions" ? 10
            : category === "dataWarehouse" && optionIdx === 2 ? 500
            : category === "dataWarehouse" ? 1
            : category === "aiMl" ? 1000
            : 730,
        }));
      }
      return next;
    });
  };

  const updateQuantity = (key, val) => {
    const num = parseFloat(val) || 0;
    setQuantities((prev) => ({ ...prev, [key]: num }));
  };

  const getQuantityLabel = (category) => {
    if (["objectStorage", "blockStorage", "cdn"].includes(category)) return "GB";
    if (category === "functions") return "M reqs";
    if (category === "dataWarehouse") return "units";
    if (category === "aiMl") return "K units";
    return "hours";
  };

  const calculateCosts = () => {
    let totals = {};
    ALL_PROVIDERS.forEach((p) => (totals[p] = 0));
    let breakdown = [];

    Object.entries(selections).forEach(([key, { category, optionIdx }]) => {
      const service = CLOUD_SERVICES[category];
      const option = service.options[optionIdx];
      const qty = quantities[key] || 0;
      const applyDiscount = COMMIT_CATEGORIES.includes(category);

      const costs = {};
      ALL_PROVIDERS.forEach((p) => {
        if (option[p] == null) {
          costs[p] = null;
        } else {
          const discount = applyDiscount ? COMMIT_DISCOUNTS[commitTier][p] : 1;
          costs[p] = option[p] * discount * qty;
        }
      });

      ALL_PROVIDERS.forEach((p) => {
        if (costs[p] != null) totals[p] += costs[p];
      });

      breakdown.push({
        label: `${service.label} — ${option.name}`,
        category: service.label,
        qty,
        unit: service.unit,
        costs,
      });
    });

    return { totals, breakdown };
  };

  const { totals, breakdown } = calculateCosts();
  const hasSelections = Object.keys(selections).length > 0;
  // Only consider providers that have at least one non-null cost in the breakdown
  const activeProviders = hasSelections
    ? ALL_PROVIDERS.filter((p) => breakdown.some((b) => b.costs[p] != null))
    : [];
  const cheapest = activeProviders.length > 0
    ? activeProviders.reduce((a, b) => (totals[a] <= totals[b] ? a : b))
    : null;
  const maxTotal = Math.max(...activeProviders.map((p) => totals[p]), 1);

  const getAiTips = async () => {
    if (freeUsed >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }

    setAiLoading(true);
    setAiTips(null);

    const configSummary = breakdown
      .map((b) => {
        const prices = activeProviders.filter((p) => b.costs[p] != null).map((p) => `${PROVIDER_NAMES[p]} $${b.costs[p].toFixed(2)}`).join(", ");
        return `${b.category} - ${b.label}: ${b.qty} ${b.unit} → ${prices}`;
      })
      .join("\n");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are a cloud cost optimization expert. Analyze this cloud infrastructure configuration and provide 3-5 specific, actionable tips to reduce costs by 20-40%. Be specific about which provider to choose for each service and why. Mention reserved instances, spot instances, committed use discounts, right-sizing, and architecture changes where relevant.

PRICING MODEL: ${commitTier === "ondemand" ? "On-Demand" : commitTier === "1yr" ? "1-Year Commitment" : "3-Year Commitment"}

CURRENT CONFIGURATION:
${configSummary}

MONTHLY TOTALS:
${activeProviders.map((p) => `${PROVIDER_NAMES[p]}: $${totals[p].toFixed(2)}`).join("\n")}

Respond with a JSON array of objects with "title" (short, 5-8 words), "tip" (2-3 sentences of specific advice), and "savings" (estimated percentage savings for this tip). Return ONLY valid JSON, no markdown, no backticks.`,
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.content.filter((c) => c.type === "text").map((c) => c.text).join("");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const tips = JSON.parse(cleaned);
      setAiTips(tips);

      const newCount = freeUsed + 1;
      setFreeUsed(newCount);
      try { await window.storage.set("cciq-usage", String(newCount)); } catch (e) {}
    } catch (err) {
      setAiTips([{ title: "Error", tip: "Could not generate tips. Try again.", savings: "0%" }]);
    }
    setAiLoading(false);
  };

  const formatMoney = (n) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#09090B",
      color: "#E4E4E7",
      fontFamily: SANS,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />

      {/* NOISE TEXTURE OVERLAY */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* GRID LINES */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px", position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <header style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "6px",
              background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#fff", fontFamily: MONO,
            }}>$</div>
            <span style={{ fontFamily: MONO, fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", color: "#22C55E" }}>
              CloudCostIQ
            </span>
            <span style={{
              fontFamily: MONO, fontSize: "10px", padding: "2px 8px", borderRadius: "4px",
              background: "rgba(34,197,94,0.15)", color: "#22C55E", marginLeft: "4px",
            }}>BETA</span>
          </div>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, margin: "0 0 8px 0", lineHeight: 1.2, letterSpacing: "-0.5px" }}>
            Compare cloud costs.<br />
            <span style={{ color: "#22C55E" }}>Cut your bill.</span>
          </h1>
          <p style={{ fontSize: "14px", color: "#71717A", margin: 0, maxWidth: "500px", lineHeight: 1.6 }}>
            Select your infrastructure, see real pricing across AWS, Azure, GCP, Hetzner, OVH &amp; Scaleway, and get AI-powered optimization tips.
          </p>
        </header>

        {/* PRICING DISCLAIMER */}
        <div style={{
          padding: "10px 14px", borderRadius: "6px", marginBottom: "20px",
          background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "13px" }}>⚠️</span>
          <span style={{ fontFamily: MONO, fontSize: "10px", color: "#FACC15", lineHeight: 1.5 }}>
            Estimates based on published US-East rates (Apr 2026). Always verify with official provider calculators before purchasing.
          </span>
        </div>

        {/* COMMITMENT TIER TOGGLE */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontFamily: MONO, fontSize: "10px", letterSpacing: "1.5px", color: "#71717A", textTransform: "uppercase", marginBottom: "8px" }}>
            Pricing Model
          </div>
          <div style={{ display: "flex", gap: "2px", background: "#18181B", borderRadius: "8px", padding: "3px", width: "fit-content" }}>
            {[
              { id: "ondemand", label: "On-Demand" },
              { id: "1yr", label: "1-Year Commit" },
              { id: "3yr", label: "3-Year Commit" },
            ].map((tier) => (
              <button key={tier.id} onClick={() => setCommitTier(tier.id)} style={{
                padding: "8px 16px", borderRadius: "6px", border: "none", fontFamily: MONO, fontSize: "12px",
                letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.2s",
                background: commitTier === tier.id ? (tier.id === "ondemand" ? "#27272A" : "rgba(34,197,94,0.15)") : "transparent",
                color: commitTier === tier.id ? (tier.id === "ondemand" ? "#E4E4E7" : "#22C55E") : "#71717A",
              }}>
                {tier.label}
                {tier.id !== "ondemand" && commitTier === tier.id && (
                  <span style={{ marginLeft: "6px", fontSize: "10px", color: "#22C55E" }}>
                    {tier.id === "1yr" ? "~30-37% off" : "~40-60% off"}
                  </span>
                )}
              </button>
            ))}
          </div>
          {commitTier !== "ondemand" && (
            <div style={{ fontFamily: MONO, fontSize: "10px", color: "#52525B", marginTop: "6px", lineHeight: 1.5 }}>
              Discounts apply to compute, database, cache &amp; K8s. Storage, transfer &amp; serverless stay at on-demand rates.
              {commitTier === "1yr" && " Hetzner does not offer commitment discounts."}
              {commitTier === "3yr" && " Hetzner does not offer commitment discounts."}
            </div>
          )}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: "2px", marginBottom: "32px", background: "#18181B", borderRadius: "8px", padding: "3px", width: "fit-content" }}>
          {[
            { id: "calculator", label: "Calculator" },
            { id: "results", label: `Results${hasSelections ? ` (${breakdown.length})` : ""}` },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 20px", borderRadius: "6px", border: "none", fontFamily: MONO, fontSize: "12px",
              letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.2s",
              background: activeTab === tab.id ? "#27272A" : "transparent",
              color: activeTab === tab.id ? "#E4E4E7" : "#71717A",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* CALCULATOR TAB */}
        {activeTab === "calculator" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{
              padding: "14px 18px", borderRadius: "8px", background: "#18181B",
              border: "1px solid #27272A", display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ fontSize: "16px" }}>👇</span>
              <span style={{ fontSize: "13px", color: "#A1A1AA", lineHeight: 1.5 }}>
                Check the services you use, adjust quantities, then hit <strong style={{ color: "#E4E4E7" }}>View Results</strong> to see costs compared across 6 cloud providers.
              </span>
            </div>
            {Object.entries(CLOUD_SERVICES).map(([catKey, category]) => (
              <div key={catKey} style={{ background: "#18181B", borderRadius: "10px", border: "1px solid #27272A", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #27272A", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "18px" }}>{(() => { const Icon = category.icon; return <Icon size={18} strokeWidth={1.5} color="#A1A1AA" />; })()}</span>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>{category.label}</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: MONO, fontSize: "10px", color: "#71717A" }}>{category.unit}</span>
                    {ALL_PROVIDERS.map((p) => {
                      const hasAny = category.options.some((o) => o[p] != null);
                      if (!hasAny) return null;
                      return <span key={p} style={{ fontFamily: MONO, fontSize: "9px", color: PROVIDER_COLORS[p] }}>● {PROVIDER_NAMES[p]}</span>;
                    })}
                  </div>
                </div>
                <div style={{ padding: "8px" }}>
                  {category.options.map((option, idx) => {
                    const key = `${catKey}-${idx}`;
                    const selected = !!selections[key];
                    const availablePrices = ALL_PROVIDERS.filter((p) => option[p] != null).map((p) => option[p]);
                    const lowest = availablePrices.length > 0 ? Math.min(...availablePrices) : null;
                    const availableProviders = ALL_PROVIDERS.filter((p) => option[p] != null);
                    return (
                      <div key={idx} style={{
                        display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
                        borderRadius: "6px", cursor: "pointer", transition: "all 0.15s",
                        background: selected ? "rgba(34,197,94,0.08)" : "transparent",
                        border: selected ? "1px solid rgba(34,197,94,0.25)" : "1px solid transparent",
                        flexWrap: "wrap",
                      }} onClick={() => toggleService(catKey, idx)}>
                        <div style={{
                          width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                          border: selected ? "2px solid #22C55E" : "2px solid #3F3F46",
                          background: selected ? "#22C55E" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", color: "#fff", transition: "all 0.15s",
                        }}>
                          {selected && "✓"}
                        </div>
                        <span style={{ fontSize: "13px", flex: 1, minWidth: "140px" }}>{option.name}</span>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          {availableProviders.map((p) => (
                            <span key={p} style={{
                              fontFamily: MONO, fontSize: "11px",
                              color: option[p] === lowest ? "#22C55E" : "#A1A1AA",
                              fontWeight: option[p] === lowest ? 600 : 400,
                              minWidth: "70px",
                            }}>
                              <span style={{ color: PROVIDER_COLORS[p], fontSize: "9px", marginRight: "3px" }}>●</span>
                              <span style={{ color: PROVIDER_COLORS[p], fontSize: "9px", marginRight: "3px" }}>{PROVIDER_NAMES[p]}</span>
                              ${option[p].toFixed(4)}
                            </span>
                          ))}
                        </div>
                        {selected && (
                          <div style={{ width: "100%", paddingLeft: "30px", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}
                            onClick={(e) => e.stopPropagation()}>
                            <span style={{ fontFamily: MONO, fontSize: "10px", color: "#71717A" }}>QTY:</span>
                            <input
                              type="number"
                              value={quantities[key] || ""}
                              onChange={(e) => updateQuantity(key, e.target.value)}
                              style={{
                                width: "80px", padding: "4px 8px", borderRadius: "4px",
                                border: "1px solid #3F3F46", background: "#09090B", color: "#E4E4E7",
                                fontFamily: MONO, fontSize: "12px", outline: "none",
                              }}
                              onFocus={(e) => (e.target.style.borderColor = "#22C55E")}
                              onBlur={(e) => (e.target.style.borderColor = "#3F3F46")}
                            />
                            <span style={{ fontFamily: MONO, fontSize: "10px", color: "#71717A" }}>
                              {getQuantityLabel(catKey)}/mo
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasSelections && (
              <button onClick={() => setActiveTab("results")} style={{
                padding: "14px 28px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                color: "#fff", fontFamily: MONO, fontSize: "13px", fontWeight: 500,
                letterSpacing: "0.5px", transition: "all 0.2s",
                boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
              }}
                onMouseEnter={(e) => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 28px rgba(34,197,94,0.4)"; }}
                onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(34,197,94,0.3)"; }}
              >
                View Results →
              </button>
            )}
          </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === "results" && (
          <div ref={resultsRef} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {!hasSelections ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#71717A" }}>
                <p style={{ fontSize: "16px", margin: "0 0 8px 0" }}>No services selected yet.</p>
                <button onClick={() => setActiveTab("calculator")} style={{
                  padding: "8px 16px", borderRadius: "6px", border: "1px solid #3F3F46",
                  background: "transparent", color: "#A1A1AA", fontFamily: MONO, fontSize: "12px", cursor: "pointer",
                }}>
                  ← Go to Calculator
                </button>
              </div>
            ) : (
              <>
                {/* TOTAL COMPARISON BARS */}
                <div style={{ background: "#18181B", borderRadius: "10px", border: "1px solid #27272A", padding: "24px" }}>
                  <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "1.5px", color: "#71717A", textTransform: "uppercase", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                    Estimated Monthly Cost
                    <span style={{
                      fontSize: "10px", padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.5px", textTransform: "none",
                      background: commitTier === "ondemand" ? "#27272A" : "rgba(34,197,94,0.15)",
                      color: commitTier === "ondemand" ? "#A1A1AA" : "#22C55E",
                    }}>
                      {commitTier === "ondemand" ? "On-Demand" : commitTier === "1yr" ? "1-Year Committed" : "3-Year Committed"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {activeProviders.map((p) => {
                      const pct = maxTotal > 0 ? (totals[p] / maxTotal) * 100 : 0;
                      const isCheapest = p === cheapest;
                      return (
                        <div key={p}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: PROVIDER_COLORS[p], fontFamily: MONO, fontSize: "12px", fontWeight: 600 }}>
                                {PROVIDER_NAMES[p]}
                              </span>
                              {isCheapest && (
                                <span style={{
                                  fontFamily: MONO, fontSize: "9px", padding: "2px 6px", borderRadius: "3px",
                                  background: "rgba(34,197,94,0.15)", color: "#22C55E",
                                }}>CHEAPEST</span>
                              )}
                            </div>
                            <span style={{
                              fontFamily: MONO, fontSize: "18px", fontWeight: 700,
                              color: isCheapest ? "#22C55E" : "#E4E4E7",
                            }}>
                              {formatMoney(totals[p])}
                            </span>
                          </div>
                          <div style={{ height: "8px", borderRadius: "4px", background: "#27272A", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: "4px", width: `${pct}%`,
                              background: isCheapest
                                ? "linear-gradient(90deg, #22C55E, #16A34A)"
                                : PROVIDER_COLORS[p],
                              transition: "width 0.6s ease-out",
                              opacity: isCheapest ? 1 : 0.6,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {cheapest && (
                    <div style={{
                      marginTop: "20px", padding: "12px 16px", borderRadius: "6px",
                      background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                      fontFamily: MONO, fontSize: "12px", color: "#22C55E",
                    }}>
                      💡 {PROVIDER_NAMES[cheapest]} saves you{" "}
                      <strong>
                        {formatMoney(Math.max(...activeProviders.map((p) => totals[p])) - totals[cheapest])}
                      </strong>
                      /mo vs the most expensive option
                    </div>
                  )}
                </div>

                {/* LINE ITEM BREAKDOWN */}
                <div style={{ background: "#18181B", borderRadius: "10px", border: "1px solid #27272A", overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #27272A" }}>
                    <span style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "1.5px", color: "#71717A", textTransform: "uppercase" }}>
                      Service Breakdown
                    </span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: "12px", minWidth: `${activeProviders.length * 90 + 200}px` }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #27272A" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", color: "#71717A", fontWeight: 500 }}>Service</th>
                          {activeProviders.map((p) => (
                            <th key={p} style={{ padding: "10px 8px", textAlign: "right", color: PROVIDER_COLORS[p], fontWeight: 500, fontSize: "11px" }}>{PROVIDER_NAMES[p]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((item, i) => {
                          const availCosts = activeProviders.filter((p) => item.costs[p] != null);
                          const minCost = availCosts.length > 0 ? Math.min(...availCosts.map((p) => item.costs[p])) : null;
                          const cheapestP = availCosts.find((p) => item.costs[p] === minCost);
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #1E1E22" }}>
                              <td style={{ padding: "10px 12px", color: "#A1A1AA" }}>
                                {item.label}
                                <span style={{ color: "#52525B", fontSize: "10px", marginLeft: "6px" }}>
                                  ×{item.qty}
                                </span>
                              </td>
                              {activeProviders.map((p) => (
                                <td key={p} style={{
                                  padding: "10px 8px", textAlign: "right",
                                  color: item.costs[p] == null ? "#3F3F46" : p === cheapestP ? "#22C55E" : "#A1A1AA",
                                  fontWeight: p === cheapestP ? 600 : 400,
                                }}>
                                  {item.costs[p] == null ? "—" : formatMoney(item.costs[p])}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                        <tr style={{ borderTop: "2px solid #27272A" }}>
                          <td style={{ padding: "12px 12px", fontWeight: 700, color: "#E4E4E7" }}>TOTAL</td>
                          {activeProviders.map((p) => (
                            <td key={p} style={{
                              padding: "12px 8px", textAlign: "right", fontWeight: 700, fontSize: "14px",
                              color: p === cheapest ? "#22C55E" : "#E4E4E7",
                            }}>
                              {formatMoney(totals[p])}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI OPTIMIZATION */}
                <div style={{ background: "#18181B", borderRadius: "10px", border: "1px solid #27272A", padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "1.5px", color: "#71717A", textTransform: "uppercase", marginBottom: "4px" }}>
                        AI Cost Optimizer
                      </div>
                      <div style={{ fontSize: "13px", color: "#A1A1AA" }}>
                        Get personalized tips to cut your cloud bill
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontFamily: MONO, fontSize: "10px", color: freeUsed >= FREE_LIMIT ? "#EF4444" : "#71717A" }}>
                        {freeUsed}/{FREE_LIMIT} free
                      </span>
                      <button onClick={getAiTips} disabled={aiLoading} style={{
                        padding: "8px 18px", borderRadius: "6px", border: "none", cursor: aiLoading ? "wait" : "pointer",
                        background: aiLoading ? "#27272A" : "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                        color: "#fff", fontFamily: MONO, fontSize: "12px", fontWeight: 500,
                        boxShadow: aiLoading ? "none" : "0 2px 12px rgba(139,92,246,0.3)",
                        transition: "all 0.2s",
                      }}>
                        {aiLoading ? "Analyzing..." : "✨ Optimize"}
                      </button>
                    </div>
                  </div>

                  {aiTips && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {aiTips.map((tip, i) => (
                        <div key={i} style={{
                          padding: "14px 16px", borderRadius: "8px",
                          background: "#09090B", border: "1px solid #27272A",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontWeight: 600, fontSize: "13px", color: "#E4E4E7" }}>
                              {tip.title}
                            </span>
                            <span style={{
                              fontFamily: MONO, fontSize: "11px", padding: "2px 8px", borderRadius: "4px",
                              background: "rgba(34,197,94,0.12)", color: "#22C55E",
                            }}>
                              ~{typeof tip.savings === "string" ? tip.savings : `${tip.savings}%`} savings
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.6, color: "#A1A1AA" }}>
                            {tip.tip}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!aiTips && !aiLoading && (
                    <div style={{
                      padding: "20px", borderRadius: "8px", background: "#09090B",
                      border: "1px dashed #27272A", textAlign: "center", color: "#52525B", fontSize: "13px",
                    }}>
                      Click "Optimize" to get AI-powered cost reduction tips for your configuration
                    </div>
                  )}
                </div>

                {/* PAYWALL MODAL */}
                {showPaywall && (
                  <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
                  }} onClick={() => setShowPaywall(false)}>
                    <div style={{
                      background: "#18181B", borderRadius: "12px", border: "1px solid #27272A",
                      padding: "32px", maxWidth: "400px", width: "100%", textAlign: "center",
                    }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔒</div>
                      <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>
                        Free limit reached
                      </h2>
                      <p style={{ fontSize: "13px", color: "#A1A1AA", margin: "0 0 24px 0", lineHeight: 1.6 }}>
                        Upgrade to CloudCostIQ Pro for unlimited AI optimization tips, exportable reports, saved configurations, and pricing alerts.
                      </p>
                      <div style={{
                        fontFamily: MONO, fontSize: "28px", fontWeight: 700, color: "#22C55E", marginBottom: "4px",
                      }}>
                        $12<span style={{ fontSize: "14px", color: "#71717A", fontWeight: 400 }}>/mo</span>
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: "11px", color: "#71717A", marginBottom: "20px" }}>
                        Pays for itself with one optimization tip
                      </div>
                      <button style={{
                        width: "100%", padding: "12px", borderRadius: "8px", border: "none",
                        background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                        color: "#fff", fontFamily: MONO, fontSize: "13px", fontWeight: 600, cursor: "pointer",
                        boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
                      }}>
                        Upgrade to Pro →
                      </button>
                      <button onClick={() => setShowPaywall(false)} style={{
                        marginTop: "12px", padding: "8px", background: "transparent",
                        border: "none", color: "#71717A", fontFamily: MONO, fontSize: "11px", cursor: "pointer",
                      }}>
                        Maybe later
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button onClick={() => setActiveTab("calculator")} style={{
                    padding: "10px 20px", borderRadius: "6px",
                    border: "1px solid #27272A", background: "transparent",
                    color: "#A1A1AA", fontFamily: MONO, fontSize: "12px", cursor: "pointer",
                  }}>
                    ← Edit Configuration
                  </button>
                  <button onClick={async () => {
                    const lines = [
                      "☁️ CloudCostIQ — Cloud Cost Comparison",
                      `Pricing: ${commitTier === "ondemand" ? "On-Demand" : commitTier === "1yr" ? "1-Year Committed" : "3-Year Committed"}`,
                      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                      "",
                      ...breakdown.map((b) => {
                        const avail = activeProviders.filter((p) => b.costs[p] != null);
                        const min = avail.length > 0 ? Math.min(...avail.map((p) => b.costs[p])) : 0;
                        const winner = avail.find((p) => b.costs[p] === min) || avail[0];
                        const priceStr = avail.map((p) => `${PROVIDER_NAMES[p]}: $${b.costs[p].toFixed(2)}`).join(" | ");
                        return `${b.label} (×${b.qty})\n  ${priceStr} → ${PROVIDER_NAMES[winner]} wins`;
                      }),
                      "",
                      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                      `TOTALS: ${activeProviders.map((p) => `${PROVIDER_NAMES[p]} $${totals[p].toFixed(2)}`).join("  |  ")}`,
                      `💰 ${PROVIDER_NAMES[cheapest]} is cheapest — saves ${formatMoney(Math.max(...activeProviders.map((p) => totals[p])) - totals[cheapest])}/mo`,
                      "",
                      "Compare your own stack → cloudcostiq.vercel.app",
                    ];
                    try {
                      await navigator.clipboard.writeText(lines.join("\n"));
                      setCopiedSummary(true);
                      setTimeout(() => setCopiedSummary(false), 2500);
                    } catch {
                      const ta = document.createElement("textarea");
                      ta.value = lines.join("\n");
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                      setCopiedSummary(true);
                      setTimeout(() => setCopiedSummary(false), 2500);
                    }
                  }} style={{
                    padding: "10px 20px", borderRadius: "6px",
                    border: copiedSummary ? "1px solid #22C55E" : "1px solid #27272A",
                    background: copiedSummary ? "rgba(34,197,94,0.1)" : "transparent",
                    color: copiedSummary ? "#22C55E" : "#A1A1AA",
                    fontFamily: MONO, fontSize: "12px", cursor: "pointer", transition: "all 0.2s",
                  }}>
                    {copiedSummary ? "✓ Copied!" : "📋 Copy Summary"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* FOOTER */}
        <footer style={{
          marginTop: "64px", paddingTop: "20px", borderTop: "1px solid #1E1E22",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px",
        }}>
          <span style={{ fontFamily: MONO, fontSize: "10px", color: "#52525B" }}>
            CloudCostIQ © 2026 • Built by <a href="https://github.com/NATIVE117" target="_blank" rel="noopener noreferrer" style={{ color: "#22C55E", textDecoration: "none" }} onMouseEnter={(e) => e.target.style.textDecoration = "underline"} onMouseLeave={(e) => e.target.style.textDecoration = "none"}>NATIVE117</a>
          </span>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <a href="https://github.com/NATIVE117/cloudcostiq/issues" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: MONO, fontSize: "10px", color: "#22C55E", textDecoration: "none",
            }} onMouseEnter={(e) => e.target.style.textDecoration = "underline"} onMouseLeave={(e) => e.target.style.textDecoration = "none"}>
              💬 Got feedback?
            </a>
            <span style={{ fontFamily: MONO, fontSize: "10px", color: "#52525B" }}>
              Prices are estimates. Verify with provider calculators.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
