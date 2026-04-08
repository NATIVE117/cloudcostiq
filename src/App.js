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
      { name: "Small (2 vCPU, 4GB)", aws: 0.0416, azure: 0.042, gcp: 0.0335 },    // t3.medium / B2s / e2-medium
      { name: "Medium (4 vCPU, 16GB)", aws: 0.1664, azure: 0.166, gcp: 0.1340 },   // t3.xlarge / B4ms / e2-standard-4
      { name: "Large (8 vCPU, 32GB)", aws: 0.3328, azure: 0.332, gcp: 0.2680 },    // t3.2xlarge / D8s_v5 / e2-standard-8
      { name: "XL (16 vCPU, 64GB)", aws: 0.6656, azure: 0.664, gcp: 0.5360 },      // m5.4xlarge / D16s_v5 / e2-standard-16
    ],
  },
  blockStorage: {
    label: "Block Storage (Disks)",
    icon: HardDrive,
    unit: "per GB/month",
    options: [
      { name: "SSD (General Purpose)", aws: 0.08, azure: 0.075, gcp: 0.068 },      // gp3 / Premium SSD v2 / pd-ssd
      { name: "SSD (Provisioned IOPS)", aws: 0.125, azure: 0.12, gcp: 0.10 },      // io2 / Ultra Disk / pd-extreme
      { name: "HDD (Standard)", aws: 0.045, azure: 0.04, gcp: 0.040 },             // st1 / Standard HDD / pd-standard
    ],
  },
  objectStorage: {
    label: "Object Storage",
    icon: Database,
    unit: "per GB/month",
    options: [
      { name: "Standard (first 50TB)", aws: 0.023, azure: 0.0208, gcp: 0.020 },    // S3 Standard / Blob Hot / Cloud Storage
      { name: "Infrequent Access", aws: 0.0125, azure: 0.010, gcp: 0.010 },        // S3 IA / Cool / Nearline
      { name: "Archive", aws: 0.004, azure: 0.002, gcp: 0.004 },                   // Glacier / Archive / Coldline
    ],
  },
  database: {
    label: "Managed Database (SQL)",
    icon: Server,
    unit: "per hour",
    options: [
      { name: "Small (2 vCPU, 8GB)", aws: 0.096, azure: 0.098, gcp: 0.090 },      // RDS db.t3.large / Azure SQL 2vc / Cloud SQL
      { name: "Medium (4 vCPU, 16GB)", aws: 0.192, azure: 0.196, gcp: 0.180 },
      { name: "Large (8 vCPU, 32GB)", aws: 0.384, azure: 0.392, gcp: 0.360 },
      { name: "XL (16 vCPU, 64GB)", aws: 0.768, azure: 0.784, gcp: 0.720 },
    ],
  },
  cache: {
    label: "Managed Cache (Redis)",
    icon: CircleDot,
    unit: "per hour",
    options: [
      { name: "Small (1 node, 1.5GB)", aws: 0.034, azure: 0.034, gcp: 0.036 },    // ElastiCache / Azure Cache / Memorystore
      { name: "Medium (1 node, 6GB)", aws: 0.068, azure: 0.068, gcp: 0.072 },
      { name: "Large (1 node, 13GB)", aws: 0.136, azure: 0.136, gcp: 0.144 },
    ],
  },
  kubernetes: {
    label: "Kubernetes (Managed)",
    icon: Container,
    unit: "per cluster/hour",
    options: [
      { name: "Control Plane only", aws: 0.10, azure: 0.00, gcp: 0.10 },           // EKS / AKS (free!) / GKE
      { name: "Control Plane + 3 Nodes (4vCPU)", aws: 0.244, azure: 0.123, gcp: 0.232 },
      { name: "Control Plane + 6 Nodes (4vCPU)", aws: 0.388, azure: 0.246, gcp: 0.364 },
    ],
  },
  loadBalancer: {
    label: "Load Balancer",
    icon: Scale,
    unit: "per hour",
    options: [
      { name: "Application LB (basic)", aws: 0.0225, azure: 0.025, gcp: 0.025 },   // ALB / App GW / HTTP(S) LB
      { name: "Application LB + 1 LCU/hr", aws: 0.030, azure: 0.032, gcp: 0.025 },
      { name: "Network LB", aws: 0.0225, azure: 0.005, gcp: 0.025 },               // NLB / LB Standard / TCP LB
    ],
  },
  natGateway: {
    label: "NAT Gateway",
    icon: DoorOpen,
    unit: "per hour + per GB",
    options: [
      { name: "NAT Gateway (hourly)", aws: 0.045, azure: 0.045, gcp: 0.044 },
      { name: "NAT Data Processing (per GB)", aws: 0.045, azure: 0.045, gcp: 0.045 },
    ],
  },
  functions: {
    label: "Serverless Functions",
    icon: Zap,
    unit: "per 1M requests",
    options: [
      { name: "128MB, <1s exec", aws: 0.20, azure: 0.20, gcp: 0.40 },             // Lambda / Azure Func / Cloud Func
      { name: "256MB, <1s exec", aws: 0.40, azure: 0.40, gcp: 0.80 },
      { name: "512MB, <1s exec", aws: 0.80, azure: 0.80, gcp: 1.60 },
    ],
  },
  cdn: {
    label: "CDN / Egress",
    icon: Globe,
    unit: "per GB out",
    options: [
      { name: "First 10TB", aws: 0.085, azure: 0.081, gcp: 0.085 },
      { name: "10-50TB", aws: 0.080, azure: 0.075, gcp: 0.065 },
      { name: "50-150TB", aws: 0.060, azure: 0.065, gcp: 0.045 },
    ],
  },
  dataWarehouse: {
    label: "Data Warehouse",
    icon: BarChart3,
    unit: "per hour / per TB scanned",
    options: [
      { name: "On-demand query (per TB)", aws: 5.00, azure: 5.00, gcp: 6.25 },     // Redshift Serverless / Synapse / BigQuery
      { name: "Provisioned (2 nodes, small)", aws: 0.50, azure: 0.48, gcp: 0.00 }, // BigQuery slots = different model
      { name: "Storage (per GB/month)", aws: 0.024, azure: 0.023, gcp: 0.020 },
    ],
  },
  aiMl: {
    label: "AI / ML APIs",
    icon: Bot,
    unit: "per 1K tokens / per 1K images",
    options: [
      { name: "LLM API (input, per 1K tok)", aws: 0.003, azure: 0.003, gcp: 0.00125 },  // Bedrock Claude / Azure OpenAI / Gemini
      { name: "LLM API (output, per 1K tok)", aws: 0.015, azure: 0.015, gcp: 0.005 },
      { name: "Image Generation (per image)", aws: 0.04, azure: 0.04, gcp: 0.04 },
    ],
  },
};

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0078D4",
  gcp: "#4285F4",
};

const PROVIDER_NAMES = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
};

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
  const resultsRef = useRef(null);

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
    let totals = { aws: 0, azure: 0, gcp: 0 };
    let breakdown = [];

    Object.entries(selections).forEach(([key, { category, optionIdx }]) => {
      const service = CLOUD_SERVICES[category];
      const option = service.options[optionIdx];
      const qty = quantities[key] || 0;

      const costs = {
        aws: option.aws * qty,
        azure: option.azure * qty,
        gcp: option.gcp * qty,
      };

      totals.aws += costs.aws;
      totals.azure += costs.azure;
      totals.gcp += costs.gcp;

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
  const cheapest = hasSelections
    ? Object.entries(totals).reduce((a, b) => (a[1] < b[1] ? a : b))[0]
    : null;

  const getAiTips = async () => {
    if (freeUsed >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }

    setAiLoading(true);
    setAiTips(null);

    const configSummary = breakdown
      .map((b) => `${b.category} - ${b.label}: ${b.qty} ${b.unit} → AWS $${b.costs.aws.toFixed(2)}, Azure $${b.costs.azure.toFixed(2)}, GCP $${b.costs.gcp.toFixed(2)}`)
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

CURRENT CONFIGURATION:
${configSummary}

MONTHLY TOTALS:
AWS: $${totals.aws.toFixed(2)}
Azure: $${totals.azure.toFixed(2)}
GCP: $${totals.gcp.toFixed(2)}

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

  const maxTotal = Math.max(totals.aws, totals.azure, totals.gcp, 1);

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
            Select your infrastructure, see real pricing across AWS, Azure &amp; GCP, and get AI-powered optimization tips.
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
            Estimates based on published US-East on-demand rates (Apr 2026). Always verify with official provider calculators before purchasing.
          </span>
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
                Check the services you use, adjust quantities, then hit <strong style={{ color: "#E4E4E7" }}>View Results</strong> to see costs compared across all three clouds.
              </span>
            </div>
            {Object.entries(CLOUD_SERVICES).map(([catKey, category]) => (
              <div key={catKey} style={{ background: "#18181B", borderRadius: "10px", border: "1px solid #27272A", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #27272A", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "18px" }}>{(() => { const Icon = category.icon; return <Icon size={18} strokeWidth={1.5} color="#A1A1AA" />; })()}</span>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>{category.label}</span>
                  <div style={{ display: "flex", gap: "14px", alignItems: "center", marginLeft: "auto" }}>
                    <span style={{ fontFamily: MONO, fontSize: "10px", color: "#71717A" }}>{category.unit}</span>
                    <span style={{ fontFamily: MONO, fontSize: "9px", color: PROVIDER_COLORS.aws }}>● AWS</span>
                    <span style={{ fontFamily: MONO, fontSize: "9px", color: PROVIDER_COLORS.azure }}>● Azure</span>
                    <span style={{ fontFamily: MONO, fontSize: "9px", color: PROVIDER_COLORS.gcp }}>● GCP</span>
                  </div>
                </div>
                <div style={{ padding: "8px" }}>
                  {category.options.map((option, idx) => {
                    const key = `${catKey}-${idx}`;
                    const selected = !!selections[key];
                    const lowest = Math.min(option.aws, option.azure, option.gcp);
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
                        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                          {["aws", "azure", "gcp"].map((p) => (
                            <span key={p} style={{
                              fontFamily: MONO, fontSize: "11px",
                              color: option[p] === lowest ? "#22C55E" : "#A1A1AA",
                              fontWeight: option[p] === lowest ? 600 : 400,
                              minWidth: "80px",
                            }}>
                              <span style={{ color: PROVIDER_COLORS[p], fontSize: "9px", marginRight: "3px" }}>●</span>
                              <span style={{ color: PROVIDER_COLORS[p], fontSize: "9px", marginRight: "4px" }}>{PROVIDER_NAMES[p]}</span>
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
                  <div style={{ fontFamily: MONO, fontSize: "11px", letterSpacing: "1.5px", color: "#71717A", textTransform: "uppercase", marginBottom: "20px" }}>
                    Estimated Monthly Cost
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {["aws", "azure", "gcp"].map((p) => {
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
                        {formatMoney(Math.max(...Object.values(totals)) - totals[cheapest])}
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
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #27272A" }}>
                          <th style={{ padding: "10px 16px", textAlign: "left", color: "#71717A", fontWeight: 500 }}>Service</th>
                          <th style={{ padding: "10px 16px", textAlign: "right", color: PROVIDER_COLORS.aws, fontWeight: 500 }}>AWS</th>
                          <th style={{ padding: "10px 16px", textAlign: "right", color: PROVIDER_COLORS.azure, fontWeight: 500 }}>Azure</th>
                          <th style={{ padding: "10px 16px", textAlign: "right", color: PROVIDER_COLORS.gcp, fontWeight: 500 }}>GCP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((item, i) => {
                          const cheapestProvider = Object.entries(item.costs).reduce((a, b) => a[1] < b[1] ? a : b)[0];
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #1E1E22" }}>
                              <td style={{ padding: "10px 16px", color: "#A1A1AA" }}>
                                {item.label}
                                <span style={{ color: "#52525B", fontSize: "10px", marginLeft: "6px" }}>
                                  ×{item.qty}
                                </span>
                              </td>
                              {["aws", "azure", "gcp"].map((p) => (
                                <td key={p} style={{
                                  padding: "10px 16px", textAlign: "right",
                                  color: p === cheapestProvider ? "#22C55E" : "#A1A1AA",
                                  fontWeight: p === cheapestProvider ? 600 : 400,
                                }}>
                                  {formatMoney(item.costs[p])}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                        <tr style={{ borderTop: "2px solid #27272A" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#E4E4E7" }}>TOTAL</td>
                          {["aws", "azure", "gcp"].map((p) => (
                            <td key={p} style={{
                              padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: "14px",
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
                      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                      "",
                      ...breakdown.map((b) => {
                        const min = Math.min(b.costs.aws, b.costs.azure, b.costs.gcp);
                        const winner = Object.entries(b.costs).find(([, v]) => v === min)[0];
                        return `${b.label} (×${b.qty})\n  AWS: $${b.costs.aws.toFixed(2)} | Azure: $${b.costs.azure.toFixed(2)} | GCP: $${b.costs.gcp.toFixed(2)} → ${PROVIDER_NAMES[winner]} wins`;
                      }),
                      "",
                      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                      `TOTALS:  AWS $${totals.aws.toFixed(2)}  |  Azure $${totals.azure.toFixed(2)}  |  GCP $${totals.gcp.toFixed(2)}`,
                      `💰 ${PROVIDER_NAMES[cheapest]} is cheapest — saves ${formatMoney(Math.max(...Object.values(totals)) - totals[cheapest])}/mo`,
                      "",
                      "Compare your own stack → cloudcostiq.com",
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
