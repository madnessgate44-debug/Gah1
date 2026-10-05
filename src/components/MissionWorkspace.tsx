import React, { useState, useRef, useEffect } from 'react';
import { Mission, EvaluatedPath, ChatMessage, CalibrationQuestion, NetworkEntity, GraphEdge } from '../types/network';
import { Pathboard } from './Pathboard';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Compass,
  Zap,
} from 'lucide-react';

interface MissionWorkspaceProps {
  onCalibrateEdge: (edgeId: string) => void;
  onRefreshSummary: () => void;
}

const MISSION_SUGGESTIONS = [
  'I want to get a corporate discount at Four Seasons Hotel',
  'I want to find someone who can introduce me to the hiring manager at Stripe',
  'I want to connect with someone inside Saudi Aramco Ventures',
  'I want to reach Julian Thorne at Four Seasons Global Executive Committee',
];

export const MissionWorkspace: React.FC<MissionWorkspaceProps> = ({
  onCalibrateEdge,
  onRefreshSummary,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'gahiz',
      text: "Welcome to GAHIZ. I am your autonomous personal network intelligence system.\n\nTell me what you're trying to accomplish (e.g. reaching a hiring manager, getting a hotel discount, or accessing a specific organization). I will investigate your network graph across six degrees of separation and discover the strongest connection routes.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [paths, setPaths] = useState<EvaluatedPath[]>([]);
  const [allEntities, setAllEntities] = useState<NetworkEntity[]>([]);
  const [allEdges, setAllEdges] = useState<GraphEdge[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'pathboard'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/network/summary');
      const data = await res.json();
      if (data.success) {
        if (data.entities) setAllEntities(data.entities);
        if (data.edges) setAllEdges(data.edges);
      }
    } catch (err) {
      console.error('Failed to load graph summary data:', err);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMission = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/mission/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          conversationHistory: messages,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const gahizMsg: ChatMessage = {
          id: `gahiz-${Date.now()}`,
          sender: 'gahiz',
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          investigationFindings: data.investigationFindings,
          questionPrompt: data.questionPrompt,
        };

        setMessages((prev) => [...prev, gahizMsg]);
        if (data.paths && data.paths.length > 0) {
          setPaths(data.paths);
          setSelectedPathId(data.paths[0].id);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'system',
            text: `Investigation notice: ${data.error || 'Failed to complete graph search.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'system',
          text: 'Network connection error while communicating with graph engine.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = async (
    question: CalibrationQuestion,
    answer: string
  ) => {
    // If it's a calibration question on an edge, update the edge in the backend
    if (question.contextEdgeId) {
      const isPositive = answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('close') || answer.toLowerCase().includes('often');
      await fetch('/api/edge/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edgeId: question.contextEdgeId,
          status: isPositive ? 'CONFIRMED' : 'POSSIBLE',
          strengthScore: isPositive ? 0.92 : 0.45,
          trustScore: isPositive ? 0.9 : 0.4,
          notes: `Calibrated by user response: "${answer}"`,
        }),
      });
      fetchGraphData();
      onRefreshSummary();
    }

    // Append user's answer into the chat flow and re-trigger investigation
    handleSendMission(`[Verification Response]: ${answer}`);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row w-full h-full overflow-hidden">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center justify-center p-1.5 bg-[#0F172A] border-b border-[#1E293B]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer ${
            activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400'
          }`}
        >
          Investigation Feed
        </button>
        <button
          onClick={() => setActiveTab('pathboard')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'pathboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'
          }`}
        >
          <span>6-Degree Pathboard</span>
          {paths.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold font-mono">
              {paths.length}
            </span>
          )}
        </button>
      </div>

      {/* Left Pane: Autonomous Investigator Feed */}
      <section
        className={`w-full lg:w-[380px] xl:w-[420px] lg:border-r border-[#1E293B] flex flex-col bg-[#0B0E14] h-full shrink-0 ${
          activeTab === 'pathboard' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Active Mission Header */}
        <div className="p-3.5 border-b border-[#1E293B] bg-[#0F172A]/80 flex items-center justify-between">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-0.5">
              Active Mission Stream
            </h2>
            <p className="text-xs font-semibold text-white truncate max-w-[280px]">
              {messages.find((m) => m.sender === 'user')?.text || 'Autonomous Network Intelligence'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>LIVE</span>
          </div>
        </div>

        {/* Chat Timeline */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {messages.map((msg) => {
            const isGahiz = msg.sender === 'gahiz';
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#1E293B] border border-[#334155] text-slate-200 max-w-[90%]'
                      : 'bg-indigo-600/10 border border-indigo-500/30 text-slate-200 w-full'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[10px]">
                    <span className={`font-bold uppercase tracking-wider ${isUser ? 'text-slate-400' : 'text-indigo-400'}`}>
                      {isUser ? 'You' : 'GAHIZ Core'}
                    </span>
                    <span className="text-slate-500 font-mono text-[9px]">{msg.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Discovered Path Indicator Chip */}
                  {msg.investigationFindings?.pathsDiscovered && msg.investigationFindings.pathsDiscovered > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{msg.investigationFindings.pathsDiscovered} Routes Mapped on Pathboard</span>
                      </span>
                      <button
                        onClick={() => setActiveTab('pathboard')}
                        className="lg:hidden text-indigo-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Proactive Calibration Question Card */}
                {msg.questionPrompt && (
                  <div className="w-full p-3 rounded-lg bg-[#1E293B]/90 border border-amber-500/40 text-xs text-amber-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[10px] uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Human Calibration: {msg.questionPrompt.type}</span>
                    </div>
                    <p className="text-slate-200 text-xs leading-snug">
                      {msg.questionPrompt.question}
                    </p>

                    {msg.questionPrompt.suggestedAnswers && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.questionPrompt.suggestedAnswers.map((ans, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAnswerQuestion(msg.questionPrompt!, ans)}
                            className="px-2 py-1 rounded bg-[#0F172A] hover:bg-[#334155] text-amber-300 text-[11px] font-medium border border-amber-500/30 transition-colors cursor-pointer"
                          >
                            {ans}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="bg-indigo-600/10 border border-indigo-500/30 p-3 rounded-lg text-xs leading-relaxed text-indigo-300 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="font-mono text-[11px]">Traversing 6-degree graph & evaluating bridge nodes...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Mission Suggestions (if early in chat) */}
        {messages.length <= 2 && (
          <div className="p-2.5 bg-[#0F172A] border-t border-[#1E293B] overflow-x-auto flex gap-1.5">
            {MISSION_SUGGESTIONS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMission(preset)}
                className="px-2 py-1 rounded bg-[#1E293B] border border-[#334155] hover:border-indigo-500 text-slate-300 text-[10px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Compass className="w-3 h-3 text-indigo-400" />
                <span>{preset}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mission Prompt Input Area */}
        <div className="p-3 border-t border-[#1E293B] bg-[#0F172A]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMission();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="input-mission-prompt"
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Enter mission prompt (e.g. 'Discount at Four Seasons' or 'Reach CPO at Stripe')..."
              className="flex-1 bg-[#1E293B] border border-[#334155] rounded-md py-2 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              id="btn-submit-mission"
              type="submit"
              disabled={!inputPrompt.trim() || loading}
              className="px-3.5 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>

      {/* Right Pane: Six-Degree Pathboard & Scored Breakdown */}
      <section
        className={`flex-1 flex flex-col bg-[#020617] h-full overflow-hidden ${
          activeTab === 'chat' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <Pathboard
          paths={paths}
          selectedPathId={selectedPathId}
          onSelectPath={(id) => setSelectedPathId(id)}
          onCalibrateEdge={onCalibrateEdge}
          allEntities={allEntities}
          allEdges={allEdges}
        />
      </section>
    </div>
  );
};
