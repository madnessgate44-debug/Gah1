import React from 'react';
import { NetworkReport } from '../types/network';
import {
  X,
  ShieldCheck,
  HelpCircle,
  AlertCircle,
  Building2,
  Users,
  PieChart,
  Sparkles,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface NetworkReportModalProps {
  report: NetworkReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkReportModal: React.FC<NetworkReportModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0B0E14] w-full max-w-2xl rounded-xl border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#0F172A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-400">Network Intelligence Report</h3>
              <p className="text-[11px] text-slate-400 font-mono">Autonomous Graph Health & Degree Reach Audit</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 bg-[#0B0E14] text-[#E2E8F0]">
          {/* High-Level Numbers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-[#0F172A] border border-[#1E293B]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block font-mono">Total Nodes</span>
              <span className="text-xl font-bold font-mono text-white mt-0.5 block">{report.totalPeople + report.totalOrganizations}</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0F172A] border border-[#1E293B]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block font-mono">People</span>
              <span className="text-xl font-bold font-mono text-slate-200 mt-0.5 block">{report.totalPeople}</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0F172A] border border-[#1E293B]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 block font-mono">Strong Ties</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">{report.strongRelationshipsCount}</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0F172A] border border-[#1E293B]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block font-mono">Reach (6°)</span>
              <span className="text-xl font-bold font-mono text-indigo-400 mt-0.5 block">{report.extendedReachablePeopleEstimate}+</span>
            </div>
          </div>

          {/* Verification Status Distribution */}
          <div className="p-4 rounded-lg bg-[#0F172A] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Relationship Verification Distribution</span>
              <span className="text-slate-500 text-[11px]">{report.totalEdges} Total Graph Edges</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded bg-[#1E293B]/70 border border-[#334155]">
                <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>CONFIRMED</span>
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">{report.confirmedEdges}</div>
                <p className="text-[9px] text-slate-500 font-mono">Directly evidenced</p>
              </div>

              <div className="p-2.5 rounded bg-[#1E293B]/70 border border-[#334155]">
                <div className="flex items-center gap-1 text-amber-400 text-[10px] font-mono font-bold">
                  <HelpCircle className="w-3 h-3" />
                  <span>INFERRED</span>
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">{report.inferredEdges}</div>
                <p className="text-[9px] text-slate-500 font-mono">Tenure overlap</p>
              </div>

              <div className="p-2.5 rounded bg-[#1E293B]/70 border border-[#334155]">
                <div className="flex items-center gap-1 text-purple-400 text-[10px] font-mono font-bold">
                  <AlertCircle className="w-3 h-3" />
                  <span>POSSIBLE</span>
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">{report.possibleEdges}</div>
                <p className="text-[9px] text-slate-500 font-mono">Plausible bridges</p>
              </div>
            </div>
          </div>

          {/* Industry Coverage & Super-Connectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Top Industries */}
            <div className="p-3.5 rounded-lg bg-[#0F172A] border border-[#1E293B] space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-mono flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Industry Saturation</span>
              </h4>
              <div className="space-y-2.5">
                {report.topIndustries.map((ind, idx) => {
                  const pct = Math.min(100, Math.round((ind.count / (report.topIndustries[0]?.count || 1)) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-300 truncate max-w-[150px]">{ind.industry}</span>
                        <span className="text-indigo-400 font-semibold">{ind.count} orgs</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded transition-all" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Hub Contacts */}
            <div className="p-3.5 rounded-lg bg-[#0F172A] border border-[#1E293B] space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-mono flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Super-Connectors</span>
              </h4>
              <div className="space-y-2">
                {report.topHubPeople.map((hub, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-[#1E293B]/50 border border-[#334155]/50">
                    <div>
                      <span className="font-semibold text-white block">{hub.person.name}</span>
                      <span className="text-[10px] text-slate-400 truncate block max-w-[140px]">
                        {hub.person.headline || 'Key Bridge Contact'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold font-mono text-[10px]">
                      {hub.connectionCount} edges
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coverage Gaps & Strategic Advice */}
          <div className="p-3.5 rounded-lg bg-[#0F172A] border border-amber-500/30 space-y-2">
            <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Identified Graph Blindspots</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              {report.coverageGaps.map((gap, idx) => (
                <div key={idx} className="border-l-2 border-amber-500 pl-2.5 py-0.5 text-slate-300 leading-snug">
                  {gap}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E293B] bg-[#0F172A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono uppercase tracking-wider cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
