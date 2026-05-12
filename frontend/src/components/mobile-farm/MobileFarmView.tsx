'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { warmupService } from '@/lib/warmup';
import api from '@/lib/api';

export function MobileFarmView() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adbStatus, setAdbStatus] = useState<{ available: boolean; message: string }>({ available: true, message: '' });
  const [showGuide, setShowGuide] = useState(false);
  const [screenshot, setScreenshot] = useState<{id: string, url: string} | null>(null);
  const [sendingMsg, setSendingMsg] = useState<{id: string, phone: string, text: string, waType: 'regular' | 'business'} | null>(null);

  const checkStatus = async () => {
    try {
      const response = await api.get('/mobile-farm/status');
      setAdbStatus(response.data);
    } catch (e) {
      setAdbStatus({ available: false, message: 'Não foi possível conectar ao serviço de Mobile Farm' });
    }
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await warmupService.listMobileDevices();
      setDevices(data);
    } catch (error) {
      console.error('Failed to load mobile devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    loadDevices();
    const interval = setInterval(() => {
      checkStatus();
      loadDevices();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenWA = async (id: string, waType: 'regular' | 'business' = 'regular') => {
    try {
      await api.post(`/mobile-farm/devices/${id}/open-whatsapp`, { waType });
    } catch (error) {
      console.error('Failed to open WA:', error);
    }
  };

  const handleScreenshot = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/mobile-farm/devices/${id}/screenshot`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      setScreenshot({ id, url });
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sendingMsg || !sendingMsg.phone || !sendingMsg.text) return;
    try {
      setLoading(true);
      await api.post(`/mobile-farm/devices/${sendingMsg.id}/send-message`, {
        phone: sendingMsg.phone,
        message: sendingMsg.text,
        waType: sendingMsg.waType,
      });
      alert('Comando de envio enviado! O celular deve começar a digitar agora.');
      setSendingMsg(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Erro ao enviar comando de mensagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#1a1f2c] rounded-2xl border border-[#2d3241] shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -z-10" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            📱 Mobile Farm
            {adbStatus.available ? (
              <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                SISTEMA PRONTO
              </span>
            ) : (
              <span className="text-[10px] bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20">
                OFFLINE
              </span>
            )}
          </h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie seus dispositivos físicos conectados via USB</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowGuide(!showGuide)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg border border-white/10 transition-all flex items-center gap-2"
          >
            ❓ Ajuda para Conectar
          </button>
          <button 
            onClick={loadDevices} 
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '🔄'} 
            Atualizar
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
              <h3 className="text-indigo-300 font-bold mb-4 flex items-center gap-2 text-sm">
                🚀 Guia Rápido: Como conectar seu celular
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-bold text-sm">1</div>
                  <p className="text-white text-xs font-semibold">Ativar Modo Desenvolvedor</p>
                  <p className="text-gray-400 text-[11px]">Vá em Configurações {'>'} Sobre o Telefone {'>'} Clique 7 vezes em "Número da Versão".</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-bold text-sm">2</div>
                  <p className="text-white text-xs font-semibold">Depuração USB</p>
                  <p className="text-gray-400 text-[11px]">Em "Opções do Desenvolvedor", ative a chave **Depuração USB**.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-bold text-sm">3</div>
                  <p className="text-white text-xs font-semibold">Autorizar Conexão</p>
                  <p className="text-gray-400 text-[11px]">Conecte o cabo e aceite o pop-up "Permitir Depuração" que aparecerá na tela do celular.</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-indigo-500/10 flex items-center justify-between">
                <p className="text-[11px] text-gray-500 italic">Dica: Use cabos originais e evite hubs USB de baixa qualidade.</p>
                <button onClick={() => setShowGuide(false)} className="text-indigo-400 text-xs font-bold hover:underline">Entendi!</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {devices.length === 0 && !loading ? (
        <div className="text-center py-16 bg-[#232936]/50 rounded-2xl border border-dashed border-[#343b4d] flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#1e2330] rounded-full flex items-center justify-center text-4xl grayscale opacity-50">
            🔌
          </div>
          <div>
            <p className="text-white font-semibold">Nenhum celular detectado</p>
            <p className="text-gray-500 text-xs mt-1">Conecte um dispositivo via USB para começar</p>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="text-indigo-400 text-xs hover:underline mt-2"
          >
            Precisa de ajuda com a configuração?
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {devices.map((device) => (
            <motion.div 
              key={device.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className="group p-5 bg-[#232936] rounded-2xl border border-[#343b4d] hover:border-indigo-500/50 transition-all shadow-lg"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📱
                </div>
                <div className="text-right">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    device.status === 'online' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {device.status}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1.5 font-mono">{device.id}</p>
                </div>
              </div>

              <h3 className="font-bold text-white text-base mb-1 truncate">{device.model}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                <p className="text-xs text-gray-400 truncate">{device.chip || 'Aguardando Sincronização'}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-medium">NÍVEL DE BATERIA</span>
                    <span className={`font-bold ${device.battery < 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {device.battery}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1e2330] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${device.battery}%` }}
                      className={`h-full rounded-full ${
                        device.battery < 20 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-gray-500 block mb-1 uppercase tracking-widest font-bold">Modo Atual</span>
                  <span className="text-xs font-semibold text-indigo-300">
                    {device.stage || 'Pronto para Operação'}
                  </span>
                </div>
              </div>

              {/* WhatsApp Badges (installed apps) */}
              {device.installedWa && (
                <div className="flex gap-1.5 mb-4">
                  {device.installedWa.regular && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      ✅ WA Pessoal
                    </span>
                  )}
                  {device.installedWa.business && (
                    <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                      🏢 WA Business
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-2 space-y-2">
                {/* Open WhatsApp buttons */}
                <div className="flex gap-2">
                  {(!device.installedWa || device.installedWa.regular) && (
                    <button
                      onClick={() => handleOpenWA(device.id, 'regular')}
                      className="flex-1 text-[10px] font-bold bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 py-2 rounded-xl transition-all border border-emerald-500/20 flex items-center justify-center gap-1.5"
                    >
                      🟢 Abrir WA
                    </button>
                  )}
                  {device.installedWa?.business && (
                    <button
                      onClick={() => handleOpenWA(device.id, 'business')}
                      className="flex-1 text-[10px] font-bold bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 py-2 rounded-xl transition-all border border-blue-500/20 flex items-center justify-center gap-1.5"
                    >
                      🏢 Abrir Business
                    </button>
                  )}
                </div>
                {/* Send message + screenshot */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSendingMsg({ id: device.id, phone: '', text: '', waType: device.installedWa?.business && !device.installedWa?.regular ? 'business' : 'regular' })}
                    className="flex-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-all border border-white/5 flex items-center justify-center gap-1.5"
                  >
                    💬 Enviar Msg
                  </button>
                  <button
                    onClick={() => handleScreenshot(device.id)}
                    className="flex-1 text-[10px] font-bold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 py-2.5 rounded-xl transition-all border border-indigo-500/20 flex items-center justify-center gap-1.5"
                  >
                    📸 Screenshot
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Send Message Modal */}
      <AnimatePresence>
        {sendingMsg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setSendingMsg(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative max-w-md w-full bg-[#1a1f2c] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold text-white">Enviar Mensagem via Hardware</h3>
                <button onClick={() => setSendingMsg(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {/* WA Type selector */}
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Aplicativo WhatsApp</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSendingMsg({...sendingMsg!, waType: 'regular'})}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        sendingMsg?.waType === 'regular'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      🟢 WhatsApp Pessoal
                    </button>
                    <button
                      onClick={() => setSendingMsg({...sendingMsg!, waType: 'business'})}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        sendingMsg?.waType === 'business'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      🏢 WhatsApp Business
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Número do Destino (com DDI)</label>
                  <input
                    type="text"
                    placeholder="Ex: 5511999999999"
                    value={sendingMsg!.phone}
                    onChange={e => setSendingMsg({...sendingMsg!, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Mensagem</label>
                  <textarea
                    placeholder="Olá, como vai?"
                    value={sendingMsg!.text}
                    onChange={e => setSendingMsg({...sendingMsg!, text: e.target.value})}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Processando...' : '🚀 Disparar Mensagem Agora'}
                </button>
                <p className="text-[10px] text-gray-500 text-center italic">
                  O celular irá abrir o chat, digitar e enviar automaticamente.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot Modal */}
      <AnimatePresence>
        {screenshot && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setScreenshot(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative max-w-sm w-full bg-[#1a1f2c] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-sm font-bold text-white">Captura de Tela Real</h3>
                <button onClick={() => setScreenshot(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="p-2 flex justify-center bg-black">
                <img src={screenshot.url} alt="Screenshot" className="rounded-2xl max-h-[70vh] shadow-lg" />
              </div>
              <div className="p-4 bg-white/5 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Dispositivo: {screenshot.id}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
