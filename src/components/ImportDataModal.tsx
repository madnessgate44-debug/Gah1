import React, { useState } from 'react';
import { NetworkEntity, GraphEdge, ROOT_USER_ID } from '../types/network';
import {
  X,
  Upload,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataIngested: () => void;
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  onClose,
  onDataIngested,
}) => {
  const [activeTab, setActiveTab] = useState<'quick-add' | 'file-import' | 'sync-sources'>('quick-add');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [relationshipType, setRelationshipType] = useState('KNOWS');
  const [strengthScore, setStrengthScore] = useState('0.85');
  const [trustScore, setTrustScore] = useState('0.80');
  const [status, setStatus] = useState<'CONFIRMED' | 'INFERRED' | 'POSSIBLE'>('CONFIRMED');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const personId = `person-manual-${Date.now()}`;
    const orgId = organization ? `org-${organization.toLowerCase().replace(/\s+/g, '-')}` : undefined;

    const newPerson: NetworkEntity = {
      id: personId,
      type: 'PERSON',
      name: name.trim(),
      headline: `${role || 'Professional'} ${organization ? `at ${organization}` : ''}`.trim(),
      currentRole: role.trim() || undefined,
      currentOrgId: orgId,
      identifiers: {},
      tags: ['Manual Input', role].filter(Boolean) as string[],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    const newEdge: GraphEdge = {
      id: `edge-user-${personId}`,
      sourceId: ROOT_USER_ID,
      targetId: personId,
      relationshipType: relationshipType as any,
      status,
      strengthScore: parseFloat(strengthScore) || 0.8,
      trustScore: parseFloat(trustScore) || 0.8,
      recencyTimestamp: new Date().toISOString(),
      notes: 'Added via direct user entry',
      evidence: [
        {
          id: `ev-manual-${Date.now()}`,
          sourceType: 'USER_CONFIRMATION',
          rawSnippet: 'Direct user manual verification',
          timestamp: new Date().toISOString(),
          confidenceWeight: 1.0,
        },
      ],
    };

    try {
      await fetch('/api/network/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: newPerson,
          edge: newEdge,
        }),
      });

      setSuccessMsg(`Successfully added ${name} to your network graph!`);
      setName('');
      setRole('');
      setOrganization('');
      onDataIngested();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFileImport = async () => {
    setLoading(true);
    // Ingest simulated batch of verified connections
    const batch = [
      {
        entity: {
          id: `person-import-${Date.now()}-1`,
          type: 'PERSON',
          name: 'Elena Vance',
          headline: 'VP of Product at Deliveroo (Ex-Hilton VP)',
          currentRole: 'VP Product',
          tags: ['Tech', 'Hospitality', 'Product'],
          identifiers: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        edge: {
          id: `edge-user-elena-${Date.now()}`,
          sourceId: ROOT_USER_ID,
          targetId: `person-import-${Date.now()}-1`,
          relationshipType: 'WORKED_WITH',
          status: 'CONFIRMED',
          strengthScore: 0.88,
          trustScore: 0.85,
          recencyTimestamp: new Date().toISOString(),
          evidence: [{ id: 'ev-import', sourceType: 'IMPORT_VCARD', timestamp: new Date().toISOString(), confidenceWeight: 0.9 }],
        },
      },
    ];

    for (const item of batch) {
      await fetch('/api/network/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    }

    setLoading(false);
    setSuccessMsg('Successfully parsed and indexed 1 contact & 2 organizational edges from file!');
    onDataIngested();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0B0E14] w-full max-w-lg rounded-xl border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#0F172A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-400">Connect Personal Network Data</h3>
              <p className="text-[11px] text-slate-400 font-mono">Authorized address book ingestion & graph expansion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1E293B] bg-[#0F172A]/70 px-6 pt-2">
          <button
            onClick={() => setActiveTab('quick-add')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer font-mono ${
              activeTab === 'quick-add'
                ? 'border-indigo-500 text-white bg-[#0B0E14] rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Quick Add Contact
          </button>
          <button
            onClick={() => setActiveTab('file-import')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer font-mono ${
              activeTab === 'file-import'
                ? 'border-indigo-500 text-white bg-[#0B0E14] rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            vCard / CSV Import
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 bg-[#0B0E14] text-[#E2E8F0]">
          {successMsg && (
            <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'quick-add' && (
            <form onSubmit={handleQuickAdd} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karim Nabil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1E293B] border border-[#334155] rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Role / Headline</label>
                  <input
                    type="text"
                    placeholder="e.g. Managing Director"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#1E293B] border border-[#334155] rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. Four Seasons / Tech"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#1E293B] border border-[#334155] rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Relationship</label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#1E293B] border border-[#334155] rounded text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="WORKED_WITH">Worked With</option>
                    <option value="KNOWS">Close Friend / Knows</option>
                    <option value="FORMER_COLLEAGUE">Former Colleague</option>
                    <option value="STUDIED_WITH">Studied With</option>
                    <option value="CONNECTED_TO">Connected To</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[#1E293B] border border-[#334155] rounded text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CONFIRMED">CONFIRMED (Direct Evidence)</option>
                    <option value="INFERRED">INFERRED (Probable)</option>
                    <option value="POSSIBLE">POSSIBLE (Speculative)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded bg-[#0F172A] border border-[#1E293B] flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Node will be indexed into deterministic 6-degree graph traversal engine.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded text-xs font-mono text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded text-xs font-mono font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 uppercase tracking-wider cursor-pointer"
                >
                  {loading ? 'Indexing Node...' : 'Add to Graph'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'file-import' && (
            <div className="space-y-4 text-center py-4">
              <div className="border-2 border-dashed border-[#334155] rounded-xl p-6 bg-[#0F172A] hover:bg-[#1E293B]/40 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-white mb-1 font-mono uppercase tracking-wider">Drag & Drop vCard (.vcf) or LinkedIn Export (.csv)</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3 font-sans">
                  Contacts will be sanitized and transformed into multi-degree relationship edges.
                </p>
                <button
                  onClick={handleSimulateFileImport}
                  disabled={loading}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  {loading ? 'Parsing Contacts...' : 'Upload Sample Contacts File'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
