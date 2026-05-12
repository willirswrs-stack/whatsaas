'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

type WaType = 'regular' | 'business';

interface Device {
  id: string;
  model: string;
  battery: number;
  status: string;
  installedWa?: { regular: boolean; business: boolean };
}

interface ChatMessage {
  id: string;
  direction: 'out';
  phone: string;
  text: string;
  waType: WaType;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

interface Props {
  onClose?: () => void;
}

export function RealTimeChatView({ onClose }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [waType, setWaType] = useState<WaType>('regular');
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotInterval, setScreenshotIntervalState] = useState<NodeJS.Timeout | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup screenshot interval on unmount
  useEffect(() => {
    return () => {
      if (screenshotInterval) clearInterval(screenshotInterval);
    };
  }, [screenshotInterval]);

  const loadDevices = async () => {
    try {
      const res = await api.get('/mobile-farm/devices');
      setDevices(res.data);
      if (res.data.length > 0 && !selectedDevice) {
        setSelectedDevice(res.data[0]);
      }
    } catch (e) {
      console.error('Failed to load devices:', e);
    }
  };

  const takeScreenshot = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    try {
      setScreenshotLoading(true);
      const res = await api.get(`/mobile-farm/devices/${deviceId}/screenshot`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setScreenshotUrl(prev => {
        if (prev) URL.revokeObjectURL(prev); // free memory
        return url;
      });
    } catch (e) {
      // silent
    } finally {
      setScreenshotLoading(false);
    }
  }, []);

  const toggleLiveMode = () => {
    if (!selectedDevice) return;
    if (liveMode) {
      // stop
      if (screenshotInterval) clearInterval(screenshotInterval);
      setScreenshotIntervalState(null);
      setLiveMode(false);
    } else {
      // start
      takeScreenshot(selectedDevice.id);
      const iv = setInterval(() => takeScreenshot(selectedDevice.id), 3000);
      setScreenshotIntervalState(iv);
      setLiveMode(true);
    }
  };

  const handleSend = async () => {
    if (!selectedDevice || !phone.trim() || !text.trim() || sending) return;

    const msgId = Date.now().toString();
    const newMsg: ChatMessage = {
      id: msgId,
      direction: 'out',
      phone: phone.trim(),
      text: text.trim(),
      waType,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, newMsg]);
    setText('');
    setSending(true);

    try {
      await api.post(`/mobile-farm/devices/${selectedDevice.id}/send-message`, {
        phone: phone.trim(),
        message: newMsg.text,
        waType,
      });

      setMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, status: 'sent' } : m)
      );

      // Take screenshot after send to show result
      if (selectedDevice) {
        setTimeout(() => takeScreenshot(selectedDevice.id), 4500);
      }
    } catch (e) {
      setMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, status: 'error' } : m)
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const canSendBusiness = selectedDevice?.installedWa?.business;
  const canSendRegular = !selectedDevice?.installedWa || selectedDevice.installedWa.regular;

  return (
    <div className="flex flex-col h-full bg-[#0f1318] rounded-2xl border border-[#1e2330] overflow-hidden shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2330] bg-[#141920]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-lg">
            💬
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Envio Real via Hardware</h2>
            <p className="text-gray-500 text-[11px]">Mensagens enviadas pelo celular físico conectado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live badge */}
          {liveMode && (
            <span className="flex items-center gap-1.5 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-bold animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              AO VIVO
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel — Config + Chat */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Config Bar */}
          <div className="px-5 py-3 border-b border-[#1e2330] bg-[#111520] space-y-3">

            {/* Device selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest shrink-0">Dispositivo</span>
              <div className="flex gap-2 flex-wrap">
                {devices.length === 0 ? (
                  <span className="text-[11px] text-gray-600 italic">Nenhum celular conectado via USB</span>
                ) : (
                  devices.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDevice(d)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                        selectedDevice?.id === d.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      📱 {d.model}
                      <span className={`text-[9px] ${d.battery < 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                        🔋{d.battery}%
                      </span>
                    </button>
                  ))
                )}
                <button
                  onClick={loadDevices}
                  className="px-2 py-1.5 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/20 transition-all"
                  title="Atualizar lista"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* WA type */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest shrink-0">App</span>
              <div className="flex gap-2">
                {(canSendRegular || !selectedDevice) && (
                  <button
                    onClick={() => setWaType('regular')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      waType === 'regular'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    🟢 WhatsApp Pessoal
                  </button>
                )}
                {(canSendBusiness || !selectedDevice) && (
                  <button
                    onClick={() => setWaType('business')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      waType === 'business'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    🏢 WhatsApp Business
                  </button>
                )}
              </div>
            </div>

            {/* Phone number */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest shrink-0 w-20">Destino</span>
              <input
                type="text"
                placeholder="5511999999999 (com DDI)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="flex-1 bg-[#0f1318] border border-[#1e2330] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Chat area — WhatsApp style */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-1"
            style={{
              background: 'linear-gradient(180deg, #0b141a 0%, #0b141a 100%)',
              backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(0,100,50,0.04) 0%, transparent 50%)',
            }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#1a2030] flex items-center justify-center text-3xl opacity-60">
                  💬
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-gray-600 text-xs mt-1">Selecione um dispositivo, informe o número e escreva a mensagem</p>
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="flex justify-end">
                  <div className="relative max-w-[75%]">
                    <div className={`px-3 pt-[6px] pb-[18px] rounded-lg rounded-tr-none shadow-md relative ${
                      msg.status === 'error'
                        ? 'bg-red-900/40 border border-red-500/30'
                        : 'bg-[#005c4b]'
                    }`}>
                      {/* Phone badge */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          msg.waType === 'business'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {msg.waType === 'business' ? '🏢 Business' : '🟢 Pessoal'} → {msg.phone}
                        </span>
                      </div>
                      <p className="text-[14px] text-[#e9edef] leading-[19px] whitespace-pre-wrap">{msg.text}</p>
                      {/* Timestamp + status */}
                      <div className="absolute bottom-[5px] right-[8px] flex items-center gap-1">
                        <span className="text-[11px] text-[#8696a0]">{formatTime(msg.timestamp)}</span>
                        {msg.status === 'sending' && (
                          <svg className="w-3.5 h-3.5 text-[#8696a0] animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        )}
                        {msg.status === 'sent' && (
                          <svg className="w-[16px] h-[11px] text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033L6.03 7.84a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063L14.947 3.826a.365.365 0 00-.063-.51zm-4.32 2.385l-.478-.372a.365.365 0 00-.51.063L5.432 10.66l-2.02-1.614a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063l4.63-5.945a.365.365 0 00-.063-.51z"/>
                          </svg>
                        )}
                        {msg.status === 'error' && (
                          <span className="text-red-400 text-[11px]">✗ Erro</span>
                        )}
                      </div>
                    </div>
                    {/* WA corner triangle */}
                    <div className="absolute top-0 right-[-8px] text-[#005c4b]">
                      <svg viewBox="0 0 10 10" className="fill-current w-3 h-3">
                        <path d="M0 0 L10 0 L0 10 Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-[#1e2330] bg-[#141920] flex gap-3 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite a mensagem... (Enter para enviar)"
              rows={2}
              disabled={!selectedDevice || sending}
              className="flex-1 bg-[#2a3942] rounded-xl px-4 py-2.5 text-[14px] text-[#e9edef] placeholder-[#8696a0] resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-40 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!selectedDevice || !phone.trim() || !text.trim() || sending}
              className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0"
            >
              {sending ? (
                <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel — Live Screenshot */}
        <div className="w-72 border-l border-[#1e2330] flex flex-col bg-[#0c1016] shrink-0">
          <div className="px-4 py-3 border-b border-[#1e2330] flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-bold">Tela do Celular</p>
              <p className="text-gray-600 text-[10px]">Visualização em tempo real</p>
            </div>
            <div className="flex gap-2 items-center">
              {selectedDevice && (
                <button
                  onClick={() => takeScreenshot(selectedDevice.id)}
                  disabled={screenshotLoading}
                  title="Capturar agora"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-40"
                >
                  <svg className={`w-4 h-4 ${screenshotLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <button
                onClick={toggleLiveMode}
                disabled={!selectedDevice}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-30 ${
                  liveMode
                    ? 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {liveMode ? '⏹ Parar' : '▶ Live'}
              </button>
            </div>
          </div>

          {/* Screenshot area */}
          <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
            {screenshotUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={screenshotUrl}
                  alt="Tela do celular"
                  className="max-w-full max-h-full rounded-xl shadow-2xl object-contain border border-[#1e2330]"
                />
                {screenshotLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                    <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#111520] border border-[#1e2330] flex items-center justify-center text-2xl opacity-50">
                  📱
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Sem captura ainda</p>
                  <p className="text-gray-700 text-[10px] mt-0.5">
                    {selectedDevice
                      ? 'Clique em ▶ Live ou capture manualmente'
                      : 'Conecte um celular via USB'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Device mini-info */}
          {selectedDevice && (
            <div className="px-4 py-3 border-t border-[#1e2330] bg-[#0c1016]">
              <p className="text-[10px] text-gray-600 font-mono truncate">
                <span className="text-gray-500">{selectedDevice.model}</span>
                {' · '}
                <span className={selectedDevice.battery < 20 ? 'text-red-400' : 'text-emerald-500'}>
                  🔋 {selectedDevice.battery}%
                </span>
                {' · '}
                <span className="text-indigo-400 font-mono text-[9px]">{selectedDevice.id}</span>
              </p>
              <div className="flex gap-1.5 mt-1.5">
                {selectedDevice.installedWa?.regular && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    ✅ WA Pessoal
                  </span>
                )}
                {selectedDevice.installedWa?.business && (
                  <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                    🏢 Business
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
