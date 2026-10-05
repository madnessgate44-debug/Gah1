import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MissionWorkspace } from './components/MissionWorkspace';
import { NetworkReportModal } from './components/NetworkReportModal';
import { ImportDataModal } from './components/ImportDataModal';
import { EdgeCalibrationModal } from './components/EdgeCalibrationModal';
import { NetworkReport } from './types/network';

export default function App() {
  const [report, setReport] = useState<NetworkReport | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [calibratingEdgeId, setCalibratingEdgeId] = useState<string | null>(null);
  const [workspaceKey, setWorkspaceKey] = useState(1);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/network/summary');
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Failed to fetch network summary:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleNewMission = () => {
    setWorkspaceKey((prev) => prev + 1);
  };

  return (
    <div className="h-screen w-full bg-[#0B0E14] text-[#E2E8F0] flex flex-col font-sans antialiased overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Top Header & Metrics Bar */}
      <Header
        report={report}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onNewMission={handleNewMission}
      />

      {/* Main Intelligence Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#020617]">
        <MissionWorkspace
          key={workspaceKey}
          onCalibrateEdge={(edgeId) => setCalibratingEdgeId(edgeId)}
          onRefreshSummary={fetchSummary}
        />
      </main>

      {/* Modals & Dialogs */}
      <NetworkReportModal
        report={report}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <ImportDataModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onDataIngested={fetchSummary}
      />

      <EdgeCalibrationModal
        edgeId={calibratingEdgeId}
        isOpen={!!calibratingEdgeId}
        onClose={() => setCalibratingEdgeId(null)}
        onSaved={fetchSummary}
      />
    </div>
  );
}
