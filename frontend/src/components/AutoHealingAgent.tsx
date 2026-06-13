'use client';

import React, { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export function AutoHealingAgent() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [actionProposal, setActionProposal] = useState<{ message: string, proposal: string, payload: any } | null>(null);

  useEffect(() => {
    // Apenas admin/super_admin tem acesso a interagir com o robô de auto cura
    if (!user || (user.role !== 'owner' && user.role !== 'super_admin')) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
    // Subir um nível de /api/v1 para pegar a raiz do servidor
    const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

    const newSocket = io(`${baseUrl}/auto-healing`, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('🔗 Conectado ao Agente de Auto-Healing');
    });

    newSocket.on('AGENT_DETECTED_ERROR', (data: { message: string }) => {
      setActiveMessage(`⚠️ Ops! Detectei um problema: ${data.message}. Estou analisando...`);
      setIsFixing(true);
      toast.error(`Auto-Healing: Erro detectado.`, { id: 'auto-healing' });
    });

    newSocket.on('AGENT_FIXING', (data: { action: string, details?: string }) => {
      setActiveMessage(`⚙️ Resolvendo: ${data.action}...`);
      setIsFixing(true);
      toast.loading(`Auto-Healing: ${data.action}`, { id: 'auto-healing' });
    });

    newSocket.on('AGENT_RESOLVED', (data: { message: string }) => {
      setActiveMessage(`✅ Resolvido! ${data.message}`);
      setIsFixing(false);
      toast.success(data.message, { id: 'auto-healing' });
      setTimeout(() => setActiveMessage(null), 5000);
    });

    newSocket.on('AGENT_ACTION_REQUIRED', (data: { message: string, proposal: string, payload: any }) => {
      setActiveMessage(`🤖 Preciso da sua permissão: ${data.proposal}`);
      setIsFixing(false);
      setActionProposal(data);
      toast('Ação de IA requer aprovação', { icon: '🤖', id: 'auto-healing' });
    });

    newSocket.on('AGENT_ACTION_APPROVED_ACK', () => {
      setActionProposal(null);
      setActiveMessage('⚙️ Executando patch de correção...');
      setIsFixing(true);
      toast.success('Ação enviada.', { id: 'auto-healing' });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const handleApprove = () => {
    if (socket && actionProposal) {
      socket.emit('AGENT_APPROVE_ACTION', actionProposal.payload);
    }
  };

  const handleReject = () => {
    setActionProposal(null);
    setActiveMessage(null);
  };

  if (!activeMessage && !actionProposal) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-end gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Bot */}
      <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 shrink-0
        ${isFixing ? 'bg-orange-500/20 border-orange-500 text-orange-400 animate-pulse' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'}
      `}>
        {isFixing ? (
          <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
        ) : (
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8" y2="16" />
            <line x1="16" y1="16" x2="16" y2="16" />
          </svg>
        )}
        
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-full blur-md -z-10
          ${isFixing ? 'bg-orange-500/40' : 'bg-emerald-500/40'}
        `} />
      </div>

      {/* Bubble */}
      <div className="glass-card p-4 rounded-2xl rounded-bl-none border border-white/10 shadow-2xl relative">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
          {activeMessage}
        </p>

        {actionProposal && (
          <div className="mt-3 space-y-3">
            <div className="bg-black/20 rounded p-2 text-xs font-mono text-[var(--text-secondary)] break-words">
              {actionProposal.payload.error || actionProposal.payload.rootCause || 'Análise indisponível'}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] transition-colors"
              >
                Ignorar
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all"
              >
                Aprovar Patch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
