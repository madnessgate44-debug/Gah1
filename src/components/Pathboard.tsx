import React, { useState } from 'react';
import { EvaluatedPath, PathStep, GraphEdge, NetworkEntity } from '../types/network';
import { NetworkGraphD3 } from './NetworkGraphD3';
import {
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  Layers,
  Send,
  Building2,
  User,
  Sliders,
  Network,
  Workflow,
  Compass,
} from 'lucide-react';

interface PathboardProps {
  paths: EvaluatedPath[];
  selectedPathId: string | null;
  onSelectPath: (pathId: string) => void;
  onCalibrateEdge: (edgeId: string) => void;
  allEntities?: NetworkEntity[];
  allEdges?: GraphEdge[];
}

export const Pathboard: React.FC<PathboardProps> = ({
  paths,
  selectedPathId,
  onSelectPath,
  onCalibrateEdge,
  allEntities = [],
  allEdges = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'d3-graph' | 'pipeline'>('d3-graph');

  const activePath = paths.find((p) => p.id === selectedPathId) || (paths.length > 0 ? paths[0] : null);

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If no paths have been searched yet, show the full D3 network explorer
  if (!paths || paths.length === 0) {
    return (
      <div className="h-full flex flex-col bg-[#020617] overflow-hidden">
        {/* Top Explorer Banner */}
        <div className="p-3.5 border-b border-[#1E293B] bg-[#0B0E14] flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold text-xs">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-400 font-mono">
                Interactive Graph Visualizer
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Explore connected nodes, verify connection confidence, or prompt a mission on the left to map 6-degree paths.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
              {allEntities.length || 15} NODES READY
            </span>
          </div>
        </div>

        {/* Interactive D3 Graph Canvas */}
        <div className="flex-1 w-full h-full relative">
          <NetworkGraphD3
            activePath={null}
            allPaths={[]}
            allEntities={allEntities}
            allEdges={allEdges}
            onCalibrateEdge={onCalibrateEdge}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#020617]">
      {/* Workspace Top Bar & Route Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-[#1E293B] bg-[#0B0E14] z-10 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-400 font-mono flex items-center gap-1.5">
            <Network className="w-4 h-4 text-indigo-400" />
            <span>Path Analysis & Traversal</span>
          </h3>

          {activePath && (
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold rounded border border-emerald-500/20">
                {activePath.confidenceRating} CONFIDENCE: {activePath.score}%
              </span>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold rounded border border-indigo-500/20">
                {activePath.degreeDistance} DEGREES
              </span>
            </div>
          )}
        </div>

        {/* Mode Switcher & Path Pills */}
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-[#0F172A] p-0.5 rounded border border-[#1E293B]">
            <button
              onClick={() => setViewMode('d3-graph')}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'd3-graph'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3 h-3" />
              <span>D3 Graph Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'pipeline'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Workflow className="w-3 h-3" />
              <span>Step Pipeline</span>
            </button>
          </div>

          {/* Path Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {paths.map((path, idx) => {
              const isSelected = path.id === activePath?.id;
              return (
                <button
                  key={path.id}
                  onClick={() => onSelectPath(path.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-[#0F172A] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  <span>Route #{idx + 1}</span>
                  <span
                    className={`px-1 rounded text-[9px] font-mono font-bold ${
                      isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-[#1E293B] text-slate-300'
                    }`}
                  >
                    {path.score}pts
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activePath && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Main Visual Stage: D3 Graph Canvas OR Pipeline Cards */}
          <div className="relative min-h-[320px] lg:min-h-[380px] w-full border-b border-[#1E293B] bg-[#020617] flex flex-col">
            {viewMode === 'd3-graph' ? (
              <NetworkGraphD3
                activePath={activePath}
                allPaths={paths}
                allEntities={allEntities}
                allEdges={allEdges}
                onCalibrateEdge={onCalibrateEdge}
              />
            ) : (
              <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[320px] relative overflow-x-auto">
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Traversal Flow Sequence */}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-2">
                  {/* Root User Node */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-full border-2 border-indigo-500 flex items-center justify-center bg-indigo-500/20 text-white font-bold text-xs shadow-md">
                      YOU
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary</span>
                    <span className="text-[9px] text-slate-500 font-mono">Initiator</span>
                  </div>

                  {/* Step Connectors and Nodes */}
                  {activePath.steps.map((step, idx) => {
                    const edge = step.edge;
                    const toEntity = step.toEntity;
                    const isOrg = toEntity.type === 'ORGANIZATION';
                    const isFinal = idx === activePath.steps.length - 1;

                    const borderColor =
                      edge.status === 'CONFIRMED'
                        ? 'border-emerald-500'
                        : edge.status === 'INFERRED'
                        ? 'border-amber-500'
                        : 'border-purple-500';

                    const lineColor =
                      edge.status === 'CONFIRMED'
                        ? 'bg-emerald-500'
                        : edge.status === 'INFERRED'
                        ? 'bg-amber-500'
                        : 'bg-purple-500';

                    const labelColor =
                      edge.status === 'CONFIRMED'
                        ? 'text-emerald-400'
                        : edge.status === 'INFERRED'
                        ? 'text-amber-400'
                        : 'text-purple-400';

                    return (
                      <React.Fragment key={edge.id || idx}>
                        {/* Hop Link Line */}
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${labelColor}`}>
                            {edge.status === 'CONFIRMED' ? 'STRONG' : edge.status === 'INFERRED' ? 'MODERATE' : 'UNKNOWN'}
                          </span>
                          <div className={`h-[2px] w-12 sm:w-16 ${lineColor} relative flex items-center justify-center`}>
                            <button
                              onClick={() => onCalibrateEdge(edge.id)}
                              className="absolute -bottom-4 text-[9px] text-slate-400 hover:text-indigo-300 font-mono flex items-center gap-0.5 cursor-pointer"
                              title="Calibrate this relationship edge"
                            >
                              <Sliders className="w-2.5 h-2.5" />
                              <span>adj</span>
                            </button>
                          </div>
                          <span className="text-[8px] text-slate-500 font-mono pt-2">
                            {edge.relationshipType.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Node */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-14 h-14 rounded-full border-2 ${borderColor} flex items-center justify-center ${
                              isFinal ? 'bg-indigo-950/80 text-white' : 'bg-slate-900 text-white'
                            } font-bold text-xs shadow-md relative overflow-hidden`}
                          >
                            {isOrg ? (
                              <Building2 className="w-5 h-5 text-indigo-300" />
                            ) : (
                              <User className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-white max-w-[90px] truncate text-center">
                            {toEntity.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              edge.status === 'CONFIRMED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {isFinal ? 'Target' : edge.status}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Metric telemetry & evidence breakdown */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* Three High-Density Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-lg">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 font-bold font-mono">
                  Relationship Strength
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-mono font-bold text-emerald-400">
                    {activePath.breakdown.relationshipStrength}
                  </span>
                  <span className="text-xs text-slate-500 mb-0.5 font-mono">/ 100</span>
                </div>
                <div className="mt-2 h-1 w-full bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded transition-all duration-500"
                    style={{ width: `${activePath.breakdown.relationshipStrength}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-lg">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 font-bold font-mono">
                  Response / Intro Prob.
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-mono font-bold text-indigo-400">
                    {activePath.breakdown.introProbability}%
                  </span>
                  <span className="text-xs text-slate-500 mb-0.5 font-mono">via Bridge</span>
                </div>
                <div className="mt-2 h-1 w-full bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded transition-all duration-500"
                    style={{ width: `${activePath.breakdown.introProbability}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold font-mono">
                    Evidence Confidence
                  </div>
                  <p className="text-xs text-slate-200 leading-snug font-medium">
                    {activePath.breakdown.evidenceConfidence}% verified confidence score (-{activePath.breakdown.degreePenalty} degree penalty).
                  </p>
                </div>
                <div className="mt-2 h-1 w-full bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded transition-all duration-500"
                    style={{ width: `${activePath.breakdown.evidenceConfidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Evidence Logs & Strategic Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Strengths & Traversal Analysis */}
              <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-lg space-y-2.5">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Path Strengths & Cautions</span>
                </h4>

                <div className="space-y-1.5 text-xs">
                  {activePath.keyStrengths.map((str, idx) => (
                    <div key={idx} className="border-l-2 border-emerald-500 pl-2.5 py-0.5 text-slate-300">
                      {str}
                    </div>
                  ))}

                  {activePath.vulnerabilities.map((vul, idx) => (
                    <div key={idx} className="border-l-2 border-amber-500 pl-2.5 py-0.5 text-slate-400">
                      {vul}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Intro Action & Draft Note */}
              <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-lg space-y-2.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>Next Recommended Action</span>
                  </h4>
                  <p className="text-xs text-white mt-1 leading-snug font-medium">
                    {activePath.recommendedAction}
                  </p>
                </div>

                {activePath.draftIntroMessage && (
                  <div className="p-2.5 rounded bg-[#1E293B]/70 border border-[#334155] text-xs text-slate-300 space-y-2">
                    <p className="italic text-[11px] leading-relaxed text-slate-300">
                      "{activePath.draftIntroMessage}"
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleCopyDraft(activePath.draftIntroMessage!)}
                        className="flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY OUTREACH SCRIPT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
