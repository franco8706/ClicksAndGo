"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, Zap, TrendingDown, Clock } from "lucide-react";
import type { AIDeal, AgentState, AgentStatus } from "@/types/laptop";
import { MOCK_AI_DEALS, MOCK_AGENT_STATE, MOCK_LAPTOPS } from "@/lib/mock-data";
import { SkeletonDealTicker } from "./SkeletonCard";

// --- Agent Status Indicator ---

const STATUS_COPY: Record<AgentStatus, string> = {
  idle: "Agente en espera",
  scanning: "Escaneando fuentes...",
  analyzing: "Analizando precios...",
  complete: "Análisis completado",
  error: "Error de conexión",
};

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "text-slate-400",
  scanning: "text-cyan-400",
  analyzing: "text-amber-400",
  complete: "text-emerald-400",
  error: "text-red-400",
};

function AgentStatusBadge({ state }: { state: AgentState }) {
  const isActive = state.status === "scanning" || state.status === "analyzing";

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <div className="relative flex items-center justify-center w-4 h-4">
        {isActive && (
          <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
        )}
        <span 
          className={`relative w-2 h-2 rounded-full ${isActive ? "bg-cyan-400" : "bg-slate-500"}`} 
        />
      </div>
      <span className={`${STATUS_COLOR[state.status]} transition-colors`}>
        {STATUS_COPY[state.status]}
      </span>
      <span className="text-slate-600">•</span>
      <span className="text-slate-500">{state.sources_checked} fuentes</span>
      <span className="text-slate-600">•</span>
      <span className="text-slate-500">{state.deals_found} ofertas detectadas</span>
    </div>
  );
}

// --- Individual Deal Row ---

interface DealRowProps {
  deal: AIDeal;
  index: number;
}

function DealRow({ deal, index }: DealRowProps) {
  const laptop = MOCK_LAPTOPS.find((l) => l.id === deal.laptop_id);
  if (!laptop) return null;

  const confidencePct = Math.round(deal.confidence * 100);

  return (
    <div 
      className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/20 hover:bg-slate-800/60 transition-all duration-200 cursor-pointer"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <span className="font-mono text-xs text-slate-600 w-4 shrink-0">
        #{index + 1}
      </span>

      <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
        <TrendingDown size={14} className="text-cyan-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate group-hover:text-white transition-colors">
          {deal.headline}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[10px] text-slate-500">{laptop.retailer}</span>
          <span className="text-slate-700">•</span>
          {deal.expires_at ? (
            <span className="font-mono text-[10px] text-amber-400/70 flex items-center gap-1">
              <Clock size={10} />
              Expira pronto
            </span>
          ) : (
            <span className="font-mono text-[10px] text-slate-600">Sin vencimiento</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-mono text-sm font-bold text-emerald-400">
          -${deal.savings.toFixed(0)}
        </p>
        <p className="font-mono text-[10px] text-slate-500">
          {confidencePct}% confianza
        </p>
      </div>
    </div>
  );
}

// --- Main Component: AIDealsSection ---

export default function AIDealsSection() {
  const [agentState, setAgentState] = useState<AgentState>(MOCK_AGENT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Simula la carga inicial de los agentes
  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 1800);
    return () => clearTimeout(timeout);
  }, []);

  // Simula el ciclo de actividad de los agentes (Scanning -> Analyzing)
  useEffect(() => {
    const stateCycle: AgentStatus[] = ["scanning", "analyzing", "scanning"];
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setAgentState((prev) => ({
        ...prev,
        status: stateCycle[tick % stateCycle.length],
        sources_checked: prev.sources_checked + Math.floor(Math.random() * 2),
      }));
    }, 3500);

    return () => clearInterval(interval);
  }, [tick]);

  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
            <Bot size={14} className="text-cyan-400" />
            <span className="font-mono text-xs font-semibold text-slate-300 uppercase tracking-widest">
              IA Deals
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Ofertas en tiempo real
          </h2>
        </div>
        <AgentStatusBadge state={agentState} />
      </div>

      <div className="flex flex-col gap-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonDealTicker key={i} />)
          : MOCK_AI_DEALS.map((deal, i) => (
              <DealRow key={deal.laptop_id} deal={deal} index={i} />
            ))}
      </div>

      {!isLoading && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <Activity size={12} />, label: "Scans hoy", value: "1,847" },
            { icon: <Zap size={12} />, label: "Alertas emitidas", value: agentState.deals_found.toString() },
            { icon: <TrendingDown size={12} />, label: "Ahorro promedio", value: "$287" },
          ].map((stat) => (
            <div 
              key={stat.label} 
              className="flex items-center gap-2.5 bg-slate-900 rounded-lg px-3 py-2.5 border border-slate-800"
            >
              <span className="text-cyan-400/60">{stat.icon}</span>
              <div>
                <p className="font-mono text-xs font-bold text-white">{stat.value}</p>
                <p className="font-mono text-[10px] text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
