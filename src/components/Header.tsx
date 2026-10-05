import React from 'react';
import { NetworkReport } from '../types/network';
import { Network, ShieldCheck, Database, FileText, PlusCircle, Sparkles } from 'lucide-react';

interface HeaderProps {
  report: NetworkReport | null;
  onOpenReport: () => void;
  onOpenImport: () => void;
  onNewMission: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  report,
  onOpenReport,
  onOpenImport,
  onNewMission,
}) => {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-[#1E293B] bg-[#0F172A] z-40 shrink-0">
      {/* Brand identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-sm shadow-xs">
          G
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white uppercase">
              Gahiz <span className="text-indigo-400 font-semibold tracking-normal normal-case text-xs sm:text-sm">Network Intelligence</span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block font-mono">6-Degree Graph Engine / Autonomous Discovery</p>
        </div>
      </div>

      {/* Live Network Vitals Pills */}
      {report && (
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#1E293B] px-2.5 py-1 rounded border border-[#334155] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="uppercase tracking-wider text-[10px] font-bold text-slate-400">ENGINE: ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E293B]/60 text-slate-300 border border-[#334155]/60 text-[11px]">
            <Database className="w-3 h-3 text-indigo-400" />
            <span>{report.totalPeople + report.totalOrganizations} Nodes</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E293B]/60 text-emerald-400 border border-[#334155]/60 text-[11px]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{report.confirmedEdges} Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E293B]/60 text-indigo-300 border border-[#334155]/60 text-[11px]">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>{report.extendedReachablePeopleEstimate}+ Reach</span>
          </div>
        </div>
      )}

      {/* Quick Action Controls */}
      <div className="flex items-center gap-2">
        <button
          id="btn-network-report"
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] transition-colors cursor-pointer"
          title="View Network Intelligence Report"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Network Report</span>
        </button>

        <button
          id="btn-import-data"
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] transition-colors cursor-pointer"
          title="Connect Sources or Import Contacts"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Connect Data</span>
        </button>

        <button
          id="btn-new-mission"
          onClick={onNewMission}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer uppercase tracking-wider text-[11px]"
        >
          <span>New Mission</span>
        </button>
      </div>
    </header>
  );
};
