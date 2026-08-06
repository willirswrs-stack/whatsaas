'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Instance {
  id: string;
  instanceName: string;
  status: string;
  phone?: string;
}

interface ConversationSummary {
  remoteJid: string;
  remotePhone: string;
  remoteName: string;
  isGroup: boolean;
  groupName?: string;
  instanceId?: string;
  instanceName?: string;
  lastMessage: {
    content: string;
    direction: 'inbound' | 'outbound';
    type: string;
    createdAt: string;
  };
  unreadCount: number;
  totalMessages: number;
}

interface Message {
  id: string;
  remoteJid: string;
  remotePhone: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | string;
  content: string;
  mediaUrl?: string;
  status: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

async function fetchWithAuth(url: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Erro na requisição');
  }
  return res.json();
}

export function WhatsAppWebLive() {
  const [navTab, setNavTab] = useState<'chats' | 'status' | 'settings'>('chats');
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('all');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI Filters & Inputs
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inputText, setInputText] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Attachments Menu & Status Modal
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Status Form State
  const [statusType, setStatusType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [statusContent, setStatusContent] = useState('');
  const [statusBgColor, setStatusBgColor] = useState('#005c4b');
  const [statusCaption, setStatusCaption] = useState('');
  const [publishingStatus, setPublishingStatus] = useState(false);

  // Media Attachment Upload Modal State
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Initial Load
  useEffect(() => {
    loadInstances();
    loadConversations();
    initWebSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // 2. Reload conversations when instance filter changes
  useEffect(() => {
    loadConversations();
  }, [selectedInstanceId]);

  // 3. Load messages when selected conversation changes
  useEffect(() => {
    if (selectedJid) {
      loadMessages(selectedJid);
      markRead(selectedJid);
    }
  }, [selectedJid]);

  // 4. Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadInstances = async () => {
    try {
      const data = await fetchWithAuth('/instances');
      if (Array.isArray(data)) {
        setInstances(data.filter((i) => i.status === 'connected'));
      }
    } catch (err) {
      console.error('Erro ao carregar instâncias:', err);
    }
  };

  const loadConversations = async () => {
    try {
      setLoadingChats(true);
      const query = selectedInstanceId !== 'all' ? `?instanceId=${selectedInstanceId}` : '';
      const data = await fetchWithAuth(`/inbox${query}`);
      setConversations(data.data || data || []);
      if (!selectedJid && (data.data?.length > 0 || data?.length > 0)) {
        const first = data.data?.[0] || data[0];
        if (first?.remoteJid) setSelectedJid(first.remoteJid);
      }
    } catch (err) {
      console.error('Erro ao carregar conversas do WhatsApp:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async (jid: string) => {
    try {
      setLoadingMessages(true);
      const encodedJid = encodeURIComponent(jid);
      const query = selectedInstanceId !== 'all' ? `?instanceId=${selectedInstanceId}` : '';
      const res = await fetchWithAuth(`/inbox/${encodedJid}/messages${query}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markRead = async (jid: string) => {
    try {
      const encodedJid = encodeURIComponent(jid);
      await fetchWithAuth(`/inbox/${encodedJid}/read`, { method: 'PATCH' });
    } catch (e) {
      // Ignore
    }
  };

  const initWebSocket = () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3333', {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('⚡ WebSocket WhatsApp Web Live Conectado!');
      });

      // Live warmup message or real incoming/outgoing WhatsApp message
      socket.on('warmup:live-message', (data: any) => {
        if (data.msg) {
          handleIncomingLiveMessage(data.msg);
        }
      });

      socket.on('message:new', (data: any) => {
        if (data.message) {
          handleIncomingLiveMessage(data.message);
        }
      });

      socketRef.current = socket;
    } catch (err) {
      console.error('Erro ao conectar WebSocket:', err);
    }
  };

  const handleIncomingLiveMessage = (msg: any) => {
    // Append to messages if active chat matches
    if (selectedJid && (msg.remoteJid === selectedJid || msg.remotePhone === selectedJid.split('@')[0])) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, {
          id: msg.id || `live-${Date.now()}`,
          remoteJid: msg.remoteJid || selectedJid,
          remotePhone: msg.remotePhone || selectedJid.split('@')[0],
          direction: msg.direction || (msg.isSender ? 'outbound' : 'inbound'),
          type: msg.type || (msg.isAudio ? 'audio' : 'text'),
          content: msg.content || '',
          mediaUrl: msg.mediaUrl,
          status: msg.status || 'sent',
          createdAt: msg.createdAt || new Date().toISOString(),
        }];
      });
    }

    // Refresh conversation list
    loadConversations();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedJid || sendingMessage) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSendingMessage(true);

    // Optimistic UI update
    const optMsg: Message = {
      id: `opt-${Date.now()}`,
      remoteJid: selectedJid,
      remotePhone: selectedJid.split('@')[0],
      direction: 'outbound',
      type: 'text',
      content: textToSend,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optMsg]);

    try {
      const encodedJid = encodeURIComponent(selectedJid);
      const instId = selectedInstanceId !== 'all' ? selectedInstanceId : undefined;
      await fetchWithAuth(`/inbox/${encodedJid}/send`, {
        method: 'POST',
        body: JSON.stringify({ content: textToSend, instanceId: instId }),
      });
      loadConversations();
    } catch (err: any) {
      alert(`Falha ao enviar mensagem: ${err.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendMedia = async () => {
    if (!mediaUrl.trim() || !selectedJid) return;

    try {
      const encodedJid = encodeURIComponent(selectedJid);
      const instId = selectedInstanceId !== 'all' ? selectedInstanceId : undefined;
      await fetchWithAuth(`/inbox/${encodedJid}/send-media`, {
        method: 'POST',
        body: JSON.stringify({
          type: mediaType,
          url: mediaUrl.trim(),
          caption: mediaCaption,
          instanceId: instId,
        }),
      });
      setShowMediaModal(false);
      setMediaUrl('');
      setMediaCaption('');
      loadMessages(selectedJid);
    } catch (err: any) {
      alert(`Falha ao enviar mídia: ${err.message}`);
    }
  };

  const handlePublishStatus = async () => {
    const instId = selectedInstanceId !== 'all' ? selectedInstanceId : instances[0]?.id;
    if (!instId) {
      alert('Selecione uma instância WhatsApp conectada para publicar o Status.');
      return;
    }
    if (!statusContent.trim()) {
      alert('Informe o texto ou link da mídia para o Status.');
      return;
    }

    setPublishingStatus(true);
    try {
      await fetchWithAuth('/inbox/status', {
        method: 'POST',
        body: JSON.stringify({
          instanceId: instId,
          type: statusType,
          content: statusContent.trim(),
          caption: statusCaption,
          backgroundColor: statusBgColor,
        }),
      });
      alert('✅ Status publicado com sucesso no WhatsApp Broadcast!');
      setShowStatusModal(false);
      setStatusContent('');
      setStatusCaption('');
    } catch (err: any) {
      alert(`Erro ao publicar Status: ${err.message}`);
    } finally {
      setPublishingStatus(false);
    }
  };

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterTab === 'unread' && c.unreadCount === 0) return false;
    if (filterTab === 'groups' && !c.isGroup) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (c.remoteName && c.remoteName.toLowerCase().includes(q)) ||
        (c.remotePhone && c.remotePhone.includes(q)) ||
        (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeConv = conversations.find((c) => c.remoteJid === selectedJid);

  return (
    <div className="w-full h-[calc(100vh-100px)] min-h-[680px] bg-[#111b21] text-[#e9edef] rounded-2xl overflow-hidden shadow-2xl flex border border-[#222d34] font-sans relative">
      
      {/* ─── 1. LEFT ICON SIDEBAR (Estilo WhatsApp Web) ─── */}
      <div className="w-[60px] bg-[#202c33] border-r border-[#222d34] flex flex-col items-center justify-between py-4 shrink-0 z-20">
        <div className="flex flex-col items-center gap-6">
          {/* Logo WhatsApp */}
          <div className="w-10 h-10 bg-[#25d366] text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.15 4.195 4.393-1.148z"/>
            </svg>
          </div>

          {/* Chats Icon */}
          <button
            onClick={() => setNavTab('chats')}
            title="Conversas ao vivo"
            className={`p-2.5 rounded-xl transition-all ${
              navTab === 'chats' ? 'bg-[#374248] text-[#00a884]' : 'text-[#8696a0] hover:bg-[#2a3942]'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
            </svg>
          </button>

          {/* Status / Stories Icon */}
          <button
            onClick={() => {
              setNavTab('status');
              setShowStatusModal(true);
            }}
            title="Publicar e Ver Status / Stories"
            className={`p-2.5 rounded-xl transition-all relative ${
              navTab === 'status' ? 'bg-[#374248] text-[#00a884]' : 'text-[#8696a0] hover:bg-[#2a3942]'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#00a884] rounded-full ring-2 ring-[#202c33]" />
          </button>

          {/* Channels / Communities */}
          <button
            onClick={() => setFilterTab('groups')}
            title="Grupos e Canais"
            className="p-2.5 rounded-xl text-[#8696a0] hover:bg-[#2a3942] transition-all"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
          </button>
        </div>

        {/* Bottom Profile / Settings */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-sm shadow-md">
            WA
          </div>
        </div>
      </div>

      {/* ─── 2. MIDDLE CHAT LIST SIDEBAR ─── */}
      <div className="w-[340px] md:w-[380px] bg-[#111b21] border-r border-[#222d34] flex flex-col shrink-0">
        {/* Header with Instance Selector */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#222d34]">
          <div className="flex items-center gap-3 overflow-hidden">
            <h2 className="font-semibold text-[17px] text-[#e9edef] shrink-0">Conversas</h2>
            <span className="text-[10px] font-bold bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full border border-[#00a884]/30 animate-pulse shrink-0">
              ● TEMPO REAL
            </span>
          </div>

          {/* Chip Instance Switcher */}
          <select
            value={selectedInstanceId}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
            className="bg-[#2a3942] text-[#d1d7db] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#374248] focus:outline-none cursor-pointer max-w-[140px] truncate"
          >
            <option value="all">Todas Instâncias</option>
            {instances.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.instanceName} ({inst.phone || 'Conectado'})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 bg-[#111b21]">
          <div className="bg-[#202c33] rounded-lg px-3 py-1.5 flex items-center gap-3 border border-transparent focus-within:border-[#00a884]">
            <svg className="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Pesquisar ou começar uma nova conversa"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-3 py-1.5 flex gap-2 border-b border-[#222d34] text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterTab === 'all' ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40' : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            Tudo
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterTab === 'unread' ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40' : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            Não lidas
          </button>
          <button
            onClick={() => setFilterTab('groups')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterTab === 'groups' ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40' : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            Grupos
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingChats ? (
            <div className="p-8 text-center text-[#8696a0] text-sm animate-pulse">
              Carregando conversas do WhatsApp em tempo real...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0] text-sm">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.remoteJid === selectedJid;
              const name = conv.groupName || conv.remoteName || conv.remotePhone || 'Contato';
              const dateStr = conv.lastMessage?.createdAt
                ? new Date(conv.lastMessage.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={conv.remoteJid}
                  onClick={() => setSelectedJid(conv.remoteJid)}
                  className={`px-3 py-3 flex items-center gap-3 cursor-pointer transition-all border-b border-[#222d34]/50 ${
                    isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                  }`}
                >
                  {/* Contact Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[#374248] text-white flex items-center justify-center font-semibold shrink-0 relative">
                    {conv.isGroup ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    ) : (
                      name.substring(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-medium text-[15px] text-[#e9edef] truncate">{name}</h4>
                      <span className="text-[11px] text-[#8696a0] shrink-0">{dateStr}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[#8696a0]">
                      <p className="truncate pr-2">
                        {conv.lastMessage?.type === 'audio' ? '🎵 Áudio de voz' : conv.lastMessage?.content || 'Mensagem'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-[#00a884] text-[#111b21] font-bold rounded-full flex items-center justify-center text-[10px] shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── 3. MAIN CHAT AREA (WhatsApp Web Authenticity) ─── */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative overflow-hidden">
        {activeConv ? (
          <>
            {/* Main Header */}
            <div className="bg-[#202c33] px-4 py-2.5 flex items-center justify-between z-10 border-b border-[#222d34]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#374248] text-white flex items-center justify-center font-bold shrink-0">
                  {(activeConv.groupName || activeConv.remoteName || activeConv.remotePhone || 'WA').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-[#e9edef] text-[16px] leading-tight">
                    {activeConv.groupName || activeConv.remoteName || activeConv.remotePhone}
                  </h3>
                  <p className="text-xs text-[#8696a0]">
                    {activeConv.remotePhone ? `+${activeConv.remotePhone}` : 'online'}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-4 text-[#aebac1]">
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#00a884]/30 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  + Novo Status
                </button>
                <button title="Pesquisar na conversa" className="hover:text-[#e9edef]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages Body with WhatsApp Doodle Background */}
            <div
              className="flex-1 overflow-y-auto p-4 custom-scrollbar relative space-y-2"
              style={{
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundSize: 'contain',
              }}
            >
              {/* Date Separator Pill */}
              <div className="flex justify-center mb-3">
                <span className="text-[11px] font-medium bg-[#182229] text-[#8696a0] px-3 py-1 rounded-md shadow-md border border-[#222d34]">
                  Hoje — Conversa Real em Tempo Real
                </span>
              </div>

              {loadingMessages ? (
                <div className="text-center text-xs text-[#8696a0] py-8">
                  Carregando histórico de mensagens...
                </div>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.direction === 'outbound';
                  const time = msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] sm:max-w-[60%] px-3 pt-2 pb-1.5 rounded-lg shadow-md relative text-sm ${
                          isOut ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                        }`}
                      >
                        {/* Audio Message */}
                        {msg.type === 'audio' ? (
                          <div className="flex items-center gap-3 py-1 min-w-[200px]">
                            <button className="w-8 h-8 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shrink-0">
                              ▶
                            </button>
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="h-1.5 bg-[#374248] rounded-full overflow-hidden relative">
                                <div className="w-1/3 h-full bg-[#00a884]" />
                              </div>
                              <span className="text-[10px] text-[#8696a0]">Áudio de Voz (WhatsApp)</span>
                            </div>
                          </div>
                        ) : msg.mediaUrl ? (
                          <div className="space-y-1">
                            <img src={msg.mediaUrl} alt="Mídia" className="max-h-60 rounded-md object-cover" />
                            {msg.content && <p className="leading-snug">{msg.content}</p>}
                          </div>
                        ) : (
                          <p className="leading-snug whitespace-pre-wrap">{msg.content}</p>
                        )}

                        {/* Timestamp & Status Icon */}
                        <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] mt-1">
                          <span>{time}</span>
                          {isOut && (
                            <span className="text-[#53bdeb] font-bold">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer Input Bar */}
            <div className="bg-[#202c33] px-4 py-2.5 flex items-center gap-3 border-t border-[#222d34] z-10 relative">
              {/* Attachment Button */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="text-[#aebac1] hover:text-[#e9edef] p-1.5 rounded-full hover:bg-[#374248] transition-all"
                  title="Anexar mídia"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                  </svg>
                </button>

                {/* Attach Popup Menu */}
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 bg-[#2a3942] rounded-xl shadow-2xl border border-[#374248] p-2 flex flex-col gap-2 z-50 min-w-[160px]">
                    <button
                      onClick={() => {
                        setMediaType('image');
                        setShowMediaModal(true);
                        setShowAttachMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[#374248] rounded-lg text-xs text-[#e9edef]"
                    >
                      📷 Foto / Vídeo
                    </button>
                    <button
                      onClick={() => {
                        setMediaType('audio');
                        setShowMediaModal(true);
                        setShowAttachMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[#374248] rounded-lg text-xs text-[#e9edef]"
                    >
                      🎵 Áudio de Voz
                    </button>
                    <button
                      onClick={() => {
                        setMediaType('document');
                        setShowMediaModal(true);
                        setShowAttachMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[#374248] rounded-lg text-xs text-[#e9edef]"
                    >
                      📄 Documento
                    </button>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <input
                type="text"
                placeholder="Digite uma mensagem"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-[#2a3942] text-[#e9edef] text-sm px-4 py-2.5 rounded-lg placeholder-[#8696a0] focus:outline-none"
              />

              {/* Send / Mic Button */}
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage}
                className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] rounded-full flex items-center justify-center transition-all shadow-md shrink-0"
              >
                ➤
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8696a0]">
            <div className="w-16 h-16 bg-[#202c33] rounded-full flex items-center justify-center mb-4 text-[#00a884]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-lg text-[#e9edef] mb-1">WhatsApp Web em Tempo Real</h3>
            <p className="text-xs max-w-sm">
              Selecione uma conversa ao lado para visualizar e enviar mensagens reais em tempo real pelo seu chip WhatsApp.
            </p>
          </div>
        )}
      </div>

      {/* ─── 4. MODAL PUBLICADOR DE STATUS / STORIES ─── */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#202c33] border border-[#222d34] w-full max-w-lg rounded-2xl p-6 text-[#e9edef] space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-[#222d34] pb-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                ⭕ Publicar Status / Stories no WhatsApp
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-[#8696a0] hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Select Type */}
            <div className="space-y-1">
              <label className="text-xs text-[#8696a0] font-medium">Tipo de Status:</label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {(['text', 'image', 'video', 'audio'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStatusType(t)}
                    className={`py-2 rounded-lg font-semibold transition-all ${
                      statusType === t ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#2a3942] text-[#8696a0]'
                    }`}
                  >
                    {t === 'text' && '✍️ Texto'}
                    {t === 'image' && '🖼️ Imagem'}
                    {t === 'video' && '🎥 Vídeo'}
                    {t === 'audio' && '🎵 Áudio'}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color Picker for Text Status */}
            {statusType === 'text' && (
              <div className="space-y-1">
                <label className="text-xs text-[#8696a0] font-medium">Cor de Fundo:</label>
                <div className="flex gap-2">
                  {['#005c4b', '#6366f1', '#ec4899', '#f59e0b', '#10b981'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setStatusBgColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        statusBgColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Content Input */}
            <div className="space-y-1">
              <label className="text-xs text-[#8696a0] font-medium">
                {statusType === 'text' ? 'Texto do Status:' : 'URL da Mídia (Imagem/Vídeo/Áudio):'}
              </label>
              <textarea
                rows={3}
                placeholder={statusType === 'text' ? 'Digite o texto do seu status...' : 'https://link-da-sua-midia.com/imagem.jpg'}
                value={statusContent}
                onChange={(e) => setStatusContent(e.target.value)}
                className="w-full bg-[#2a3942] text-sm text-[#e9edef] p-3 rounded-xl border border-[#374248] focus:outline-none focus:border-[#00a884]"
              />
            </div>

            {/* Caption for Media */}
            {statusType !== 'text' && (
              <div className="space-y-1">
                <label className="text-xs text-[#8696a0] font-medium">Legenda (Opcional):</label>
                <input
                  type="text"
                  placeholder="Legenda da imagem ou vídeo..."
                  value={statusCaption}
                  onChange={(e) => setStatusCaption(e.target.value)}
                  className="w-full bg-[#2a3942] text-sm text-[#e9edef] px-3 py-2 rounded-xl border border-[#374248] focus:outline-none"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-[#2a3942] hover:bg-[#374248] text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handlePublishStatus}
                disabled={publishingStatus}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                {publishingStatus ? 'Publicando...' : '🚀 Publicar no Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. MODAL DE ANEXO DE MÍDIA ─── */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#202c33] border border-[#222d34] w-full max-w-md rounded-2xl p-6 text-[#e9edef] space-y-4 shadow-2xl">
            <h3 className="font-semibold text-base border-b border-[#222d34] pb-2">
              📎 Anexar {mediaType.toUpperCase()}
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-[#8696a0]">URL do Arquivo:</label>
              <input
                type="text"
                placeholder="https://exemplo.com/arquivo.jpg"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full bg-[#2a3942] text-xs text-[#e9edef] p-2.5 rounded-lg border border-[#374248] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[#8696a0]">Legenda:</label>
              <input
                type="text"
                placeholder="Legenda da mensagem..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                className="w-full bg-[#2a3942] text-xs text-[#e9edef] p-2.5 rounded-lg border border-[#374248] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMediaModal(false)}
                className="px-3 py-1.5 bg-[#2a3942] text-xs font-medium rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendMedia}
                className="px-4 py-1.5 bg-[#00a884] text-[#111b21] text-xs font-bold rounded-lg"
              >
                Enviar Mídia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
