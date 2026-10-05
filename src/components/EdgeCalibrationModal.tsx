import React, { useState, useEffect } from 'react';
import { GraphEdge } from '../types/network';
import { X, ShieldCheck, Sliders, Check } from 'lucide-react';

interface EdgeCalibrationModalProps {
  edgeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const EdgeCalibrationModal: React.FC<EdgeCalibrationModalProps> = ({
  edgeId,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [status, setStatus] = useState<'CONFIRMED' | 'INFERRED' | 'POSSIBLE'>('CONFIRMED');
  const [strength, setStrength] = useState(0.85);
  const [trust, setTrust] = useState(0.80);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !edgeId) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/edge/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edgeId,
          status,
          strengthScore: strength,
          trustScore: trust,
          notes,
        }),
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0B0E14] w-full max-w-md rounded-xl border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#0F172A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-400">Calibrate Relationship Link</h3>
              <p className="text-[11px] text-slate-400 font-mono">Tune edge confidence & intro weights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs bg-[#0B0E14] text-[#E2E8F0]">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Verification Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['CONFIRMED', 'INFERRED', 'POSSIBLE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`py-2 text-[10px] font-bold font-mono rounded border transition-all cursor-pointer ${
                    status === st
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-[#1E293B] text-slate-400 border-[#334155] hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              <span>Connection Strength</span>
              <span className="text-emerald-400 font-bold">{Math.round(strength * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={strength}
              onChange={(e) => setStrength(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer bg-slate-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              <span>Trust / Ask Comfort Level</span>
              <span className="text-indigo-400 font-bold">{Math.round(trust * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={trust}
              onChange={(e) => setTrust(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Qualitative Notes / Context</label>
            <input
              type="text"
              placeholder="e.g. Worked on shared project; speaks quarterly."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#1E293B] border border-[#334155] rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#1E293B] bg-[#0F172A] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-white hover:bg-[#1E293B] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 rounded text-xs font-mono font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{loading ? 'Saving...' : 'Apply Calibration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
