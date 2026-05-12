'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface Chip {
  id: string;
  phone: string;
  day: number;
  dailyLimit: number;
  sent: number;
  status: string;
  health: number;
}

interface LiveMessage {
  index: number;
  role: 'A' | 'B';
  content: string;
  from: string;
  fromPhone: string;
  to: string;
  toPhone: string;
  status: 'sent' | 'error';
  timestamp: string;
}

interface LiveSession {
  sessionId: string;
  instA: { id: string; name: string; phone: string };
  instB: { id: string; name: string; phone: string };
  totalMessages: number;
  messages: LiveMessage[];
  typingRole: 'A' | 'B' | null;
  completed: boolean;
}

interface Props {
  chips: Chip[];
  onRefresh: () => void;
  actionLoading: boolean;
  onSimulateIA: () => void;
}

function formatPhone(phone: string) {
  if (!phone) return '—';
  if (phone.length > 20) return phone.substring(0, 12) + '…';
  return phone;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function ChipsLivePanel({ chips, onRefresh, actionLoading, onSimulateIA }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveSession?.messages]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const toggleChip = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep last 2
      return [...prev, id];
    });
  };

  const connectSocket = () => {
    const token = getToken();
    if (socketRef.current?.connected) return;

    const socket = io('http://localhost:3333/events', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('warmup:live-start', (data: any) => {
      setLiveSession({
        sessionId: data.sessionId,
        instA: data.instA,
        instB: data.instB,
        totalMessages: data.totalMessages,
        messages: [],
        typingRole: null,
        completed: false,
      });
    });

    socket.on('warmup:live-typing', (data: any) => {
      setLiveSession(prev => prev ? { ...prev, typingRole: data.role } : prev);
    });

    socket.on('warmup:live-message', (data: LiveMessage) => {
      setLiveSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          typingRole: null,
          messages: [...prev.messages, data],
        };
      });
    });

    socket.on('warmup:live-end', () => {
      setLiveSession(prev => prev ? { ...prev, completed: true, typingRole: null } : prev);
      setLaunching(false);
    });

    socketRef.current = socket;
  };

  const handleLaunchLive = async () => {
    if (selected.length < 2) {
      setError('Selecione exatamente 2 chips para iniciar a conversa.');
      return;
    }
    setError(null);
    setLaunching(true);
    setLiveSession(null);

    // Connect websocket first
    connectSocket();

    try {
      const res = await api.post('/warmup/live-session', {
        instAId: selected[0],
        instBId: selected[1],
      });

      if (!res.data.success) {
        setError(`Erro: ${res.data.reason}`);
        setLaunching(false);
      }
      // else: session start comes via WebSocket
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erro ao iniciar sessão.');
      setLaunching(false);
    }
  };

  const chipA = liveSession ? chips.find(c => c.id === liveSession.instA.id) : null;
  const chipB = liveSession ? chips.find(c => c.id === liveSession.instB.id) : null;

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-[var(--text-primary)]">📱 Chips em Warm-up</span>
          <button onClick={onRefresh} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Atualizar
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Original IA Simulate */}
          <button
            onClick={onSimulateIA}
            disabled={actionLoading || chips.length < 2}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {actionLoading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : '🔥'}
            Simular Conversa IA
          </button>

          {/* NEW: Live button */}
          <button
            onClick={handleLaunchLive}
            disabled={selected.length < 2 || launching}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              selected.length === 2
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
            }`}
          >
            {launching ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                🔴
              </span>
            )}
            {selected.length === 2
              ? `Iniciar Conversa Real (${selected.length}/2)`
              : `Selecione 2 chips (${selected.length}/2)`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Selection hint */}
      {selected.length < 2 && chips.length >= 2 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          Clique em dois chips para selecioná-los e iniciar uma conversa real entre eles
        </div>
      )}

      {/* Chips Table */}
      <div className="table-container">
        {chips.length > 0 ? (
          <table className="table w-full">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Número</th>
                <th>Dia</th>
                <th>Limite</th>
                <th>Status</th>
                <th>Saúde</th>
              </tr>
            </thead>
            <tbody>
              {chips.map((chip, index) => {
                const isSelected = selected.includes(chip.id);
                const selIndex = selected.indexOf(chip.id);

                return (
                  <tr
                    key={index}
                    onClick={() => toggleChip(chip.id)}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Selection indicator */}
                    <td>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                        isSelected
                          ? 'bg-indigo-500 border-indigo-400 text-white'
                          : 'border-[#343b4d] text-transparent'
                      }`}>
                        {isSelected ? selIndex + 1 : ''}
                      </div>
                    </td>
                    <td className="font-medium font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                            selIndex === 0
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {selIndex === 0 ? 'A' : 'B'}
                          </span>
                        )}
                        {formatPhone(chip.phone || chip.id)}
                      </div>
                    </td>
                    <td><span className="text-[var(--accent-warning)]">{chip.day}</span>/14+</td>
                    <td>{chip.dailyLimit}</td>
                    <td>{chip.sent} env</td>
                    <td>
                      <span className={chip.health >= 80 ? 'text-green-500' : 'text-yellow-500'}>
                        {chip.health}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-[var(--text-muted)]">Nenhum chip ativo.</div>
        )}
      </div>

      {/* Live Session Modal */}
      {liveSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl bg-[#0d1117] rounded-3xl overflow-hidden border border-[#1e2330] shadow-2xl flex flex-col"
            style={{ height: '85vh' }}>

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#1e2330] bg-[#111520] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full font-bold animate-pulse">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  AO VIVO
                </span>
                <div>
                  <p className="text-white font-bold">Conversa Real em Progresso</p>
                  <p className="text-gray-500 text-xs">
                    {liveSession.instA.phone} ↔ {liveSession.instB.phone}
                    {liveSession.completed
                      ? <span className="text-emerald-400 ml-2">✓ Concluída</span>
                      : <span className="ml-2">{liveSession.messages.length}/{liveSession.totalMessages} mensagens</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setLiveSession(null); socketRef.current?.disconnect(); }}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Dual Chat View */}
            <div className="flex flex-1 overflow-hidden">
              {(['A', 'B'] as const).map(role => {
                const isA = role === 'A';
                const inst = isA ? liveSession.instA : liveSession.instB;
                const partner = isA ? liveSession.instB : liveSession.instA;
                const chip = isA ? chipA : chipB;
                const isTyping = liveSession.typingRole === role;
                const partnerTyping = liveSession.typingRole === (isA ? 'B' : 'A');

                return (
                  <div key={role} className={`flex-1 flex flex-col min-w-0 ${!isA ? 'border-l border-[#1e2330]' : ''}`}>
                    {/* Chat header */}
                    <div className="px-4 py-3 border-b border-[#1e2330] bg-[#202c33] flex items-center gap-3 shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6 text-white mt-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold truncate">{inst.phone}</p>
                        <p className="text-[#8696a0] text-xs truncate">
                          {partnerTyping
                            ? <span className="text-[#53bdeb] italic">digitando...</span>
                            : `conversa com ${partner.phone}`}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full shrink-0 ${
                        isA ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        CHIP {role}
                      </span>
                    </div>

                    {/* Messages */}
                    <div
                      className="flex-1 overflow-y-auto p-4 space-y-1"
                      style={{
                        background: '#0b141a',
                        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                        backgroundSize: 'contain',
                      }}
                    >
                      <div className="flex justify-center mb-3">
                        <span className="text-[11px] bg-[#182229] text-[#8696a0] px-3 py-1.5 rounded-lg">
                          Hoje — Conversa Real ao Vivo
                        </span>
                      </div>

                      {liveSession.messages.map((msg, idx) => {
                        const isSender = msg.role === role;
                        const isFirst = idx === 0 || liveSession.messages[idx - 1].role !== msg.role;

                        return (
                          <div key={idx} className={`flex ${isSender ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-2' : ''}`}>
                            <div className={`relative max-w-[80%] px-3 pt-[6px] pb-[20px] rounded-lg shadow-md ${
                              isSender
                                ? `bg-[#005c4b] ${isFirst ? 'rounded-tr-none' : ''}`
                                : `bg-[#202c33] ${isFirst ? 'rounded-tl-none' : ''}`
                            }`}>
                              {isFirst && (
                                <div className={`absolute top-0 text-[#005c4b] ${isSender ? 'right-[-8px]' : 'left-[-8px] text-[#202c33]'}`}>
                                  <svg viewBox="0 0 10 10" className="fill-current w-3 h-3">
                                    {isSender ? <path d="M0 0 L10 0 L0 10 Z" /> : <path d="M10 0 L0 0 L10 10 Z" />}
                                  </svg>
                                </div>
                              )}
                              <p className="text-[14px] text-[#e9edef] leading-[19px] whitespace-pre-wrap">{msg.content}</p>
                              <div className="absolute bottom-[5px] right-[8px] flex items-center gap-1">
                                <span className="text-[11px] text-[#8696a0]">
                                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isSender && msg.status === 'sent' && (
                                  <svg className="w-[16px] h-[11px] text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033L6.03 7.84a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063L14.947 3.826a.365.365 0 00-.063-.51zm-4.32 2.385l-.478-.372a.365.365 0 00-.51.063L5.432 10.66l-2.02-1.614a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063l4.63-5.945a.365.365 0 00-.063-.51z"/>
                                  </svg>
                                )}
                                {isSender && msg.status === 'error' && (
                                  <span className="text-red-400 text-[10px]">✗</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Typing indicator */}
                      {partnerTyping && (
                        <div className="flex justify-start mt-2">
                          <div className="bg-[#202c33] rounded-lg rounded-tl-none px-4 py-3 shadow-md">
                            <div className="flex gap-1 items-center">
                              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {liveSession.completed && (
                        <div className="flex justify-center mt-4">
                          <span className="text-[11px] bg-[#182229] text-emerald-400 px-3 py-1.5 rounded-lg">
                            ✓ Conversa concluída — {liveSession.messages.length} mensagens enviadas
                          </span>
                        </div>
                      )}

                      <div ref={isA ? chatBottomRef : undefined} />
                    </div>

                    {/* Input bar (decorative) */}
                    <div className="bg-[#202c33] px-3 py-3 flex gap-3 items-center shrink-0 border-t border-[#1e2330]">
                      <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 text-sm text-[#8696a0] flex items-center">
                        {isTyping
                          ? <span className="text-[#53bdeb] italic text-xs">Enviando mensagem...</span>
                          : <span className="text-xs opacity-50">Conversa gerada por IA em tempo real</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            {!liveSession.completed && liveSession.totalMessages > 0 && (
              <div className="px-6 py-2 border-t border-[#1e2330] bg-[#111520] shrink-0">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>Progresso da conversa</span>
                  <span>{liveSession.messages.length}/{liveSession.totalMessages} mensagens</span>
                </div>
                <div className="h-1 bg-[#1e2330] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${(liveSession.messages.length / liveSession.totalMessages) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
