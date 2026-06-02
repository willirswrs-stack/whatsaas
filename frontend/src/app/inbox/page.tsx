'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationSummary {
  remoteJid: string;
  remotePhone: string;
  remoteName: string;
  isGroup: boolean;
  groupName?: string;
  contactId?: string;
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
  remoteName?: string;
  direction: 'inbound' | 'outbound';
  type: string;
  content: string;
  mediaUrl?: string;
  status: string;
  instanceName?: string;
  isGroup: boolean;
  createdAt: string;
}

interface Instance {
  id: string;
  instanceName: string;
  status: string;
  phone?: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getMessagePreview(msg: ConversationSummary['lastMessage']) {
  const icons: Record<string, string> = {
    image: '🖼️ Imagem',
    video: '🎥 Vídeo',
    audio: '🎵 Áudio',
    document: '📄 Documento',
    sticker: '😊 Figurinha',
  };
  if (msg.type !== 'text') return icons[msg.type] || '📎 Mídia';
  return msg.content || '';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function getAvatarColor(jid: string) {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  ];
  const idx = jid.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === 'outbound';
  const statusIcon = { sent: '✓', delivered: '✓✓', read: '✓✓', received: '' }[msg.status] || '';

  return (
    <div className={`msg-row ${isOut ? 'out' : 'in'}`}>
      <div className={`bubble ${isOut ? 'bubble-out' : 'bubble-in'}`}>
        {msg.type !== 'text' && (
          <div className="media-tag">
            {msg.type === 'image' && '🖼️ Imagem'}
            {msg.type === 'video' && '🎥 Vídeo'}
            {msg.type === 'audio' && '🎵 Áudio'}
            {msg.type === 'document' && '📄 Documento'}
            {msg.type === 'sticker' && '😊 Figurinha'}
          </div>
        )}
        {msg.content && <p className="bubble-text">{msg.content}</p>}
        <div className="bubble-meta">
          <span className="bubble-time">
            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOut && <span className={`status-icon ${msg.status === 'read' ? 'read' : ''}`}>{statusIcon}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InboxPage() {
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filterInstance, setFilterInstance] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Socket.io instance
  const [socket, setSocket] = useState<any>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterInstance) params.set('instanceId', filterInstance);
      const res = await apiFetch(`/inbox?${params}`);
      setConversations(res.data || []);
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setLoading(false);
    }
  }, [search, filterInstance]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conv: ConversationSummary) => {
    setLoadingMessages(true);
    try {
      const jid = encodeURIComponent(conv.remoteJid);
      const res = await apiFetch(`/inbox/${jid}/messages?limit=100`);
      setMessages(res.data || []);
      // Mark as read
      await apiFetch(`/inbox/${jid}/read`, { method: 'PATCH' });
      // Update unread count in conversation list
      setConversations((prev) =>
        prev.map((c) => (c.remoteJid === conv.remoteJid ? { ...c, unreadCount: 0 } : c))
      );
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Load instances
  useEffect(() => {
    apiFetch('/instances').then((data) => setInstances(Array.isArray(data) ? data : [])).catch(() => {});
    apiFetch('/inbox/unread-count').then((d) => setUnreadCount(d.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv);
  }, [selectedConv, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket real-time updates
  useEffect(() => {
    // Dynamically import the socket connection so it runs only on client
    import('@/lib/socket').then(({ connectSocket }) => {
      const ioSocket = connectSocket();
      if (!ioSocket) return;

      setSocket(ioSocket);
      setWsConnected(ioSocket.connected);

      const handleConnect = () => setWsConnected(true);
      const handleDisconnect = () => setWsConnected(false);

      const handleInboxMessage = (payload: any) => {
        const data = payload.data || payload;
        // Update conversation list
        setConversations((prev) => {
          const existing = prev.find((c) => c.remoteJid === data.remoteJid);
          if (existing) {
            return [
              {
                ...existing,
                lastMessage: {
                  content: data.content,
                  direction: data.direction,
                  type: data.type,
                  createdAt: data.timestamp || new Date().toISOString(),
                },
                unreadCount: data.direction === 'inbound' ? existing.unreadCount + 1 : existing.unreadCount,
              },
              ...prev.filter((c) => c.remoteJid !== data.remoteJid),
            ];
          }
          return prev;
        });

        // If this conversation is open, append the message
        setSelectedConv((current) => {
          if (current?.remoteJid === data.remoteJid) {
            setMessages((msgs) => [
              ...msgs,
              {
                id: Date.now().toString(),
                remoteJid: data.remoteJid,
                remotePhone: data.remotePhone,
                direction: data.direction,
                type: data.type,
                content: data.content,
                status: 'received',
                isGroup: data.isGroup,
                createdAt: data.timestamp || new Date().toISOString(),
              } as Message,
            ]);
          }
          return current;
        });
      };

      ioSocket.on('connect', handleConnect);
      ioSocket.on('disconnect', handleDisconnect);
      ioSocket.on('inbox.message', handleInboxMessage);

      return () => {
        ioSocket.off('connect', handleConnect);
        ioSocket.off('disconnect', handleDisconnect);
        ioSocket.off('inbox.message', handleInboxMessage);
      };
    });
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(loadConversations, 400);
  };

  const handleSendReply = async () => {
    if (!selectedConv || !replyText.trim() || sending) return;
    setSending(true);
    const content = replyText.trim();
    setReplyText('');

    // Optimistic UI
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      remoteJid: selectedConv.remoteJid,
      remotePhone: selectedConv.remotePhone,
      direction: 'outbound',
      type: 'text',
      content,
      status: 'sent',
      isGroup: selectedConv.isGroup,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const jid = encodeURIComponent(selectedConv.remoteJid);
      await apiFetch(`/inbox/${jid}/send`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    } catch (e: any) {
      alert(`Erro ao enviar: ${e.message}`);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setReplyText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const connectedInstances = instances.filter((i) => i.status === 'connected');

  return (
    <>
      <style>{`
        .inbox-layout {
          display: flex;
          height: calc(100vh - 80px);
          background: #0f0f1a;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          margin: 20px;
        }

        /* ── Sidebar ── */
        .inbox-sidebar {
          width: 340px;
          min-width: 300px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.06);
          background: #13131f;
        }
        .inbox-sidebar-header {
          padding: 20px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .inbox-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .inbox-title {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge-unread {
          background: #6366f1;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
        }
        .ws-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
          box-shadow: 0 0 6px #10b981;
        }
        .ws-dot.off { background: #6b7280; box-shadow: none; }

        .search-box {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 8px 12px;
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .search-box::placeholder { color: rgba(255,255,255,0.3); }
        .search-box:focus { border-color: #6366f1; }

        .filter-select {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 7px 10px;
          color: #e5e7eb;
          font-size: 12px;
          outline: none;
          margin-top: 8px;
          cursor: pointer;
        }

        .conv-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
        }
        .conv-list::-webkit-scrollbar { width: 4px; }
        .conv-list::-webkit-scrollbar-track { background: transparent; }
        .conv-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .conv-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border-left: 3px solid transparent;
        }
        .conv-item:hover { background: rgba(99,102,241,0.07); }
        .conv-item.active {
          background: rgba(99,102,241,0.12);
          border-left-color: #6366f1;
        }

        .avatar {
          width: 44px; height: 44px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; color: #fff;
          flex-shrink: 0;
          position: relative;
        }
        .avatar-group-badge {
          position: absolute; bottom: -2px; right: -2px;
          background: #4b5563;
          border-radius: 50%; width: 16px; height: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px;
        }

        .conv-info { flex: 1; min-width: 0; }
        .conv-name {
          font-size: 14px; font-weight: 600; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .conv-preview {
          font-size: 12px; color: rgba(255,255,255,0.45);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 2px;
        }
        .conv-preview.out { color: rgba(99,102,241,0.7); }

        .conv-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .conv-time { font-size: 11px; color: rgba(255,255,255,0.3); }
        .badge-count {
          background: #6366f1; color: #fff;
          font-size: 10px; font-weight: 700;
          min-width: 18px; height: 18px;
          border-radius: 10px; padding: 0 4px;
          display: flex; align-items: center; justify-content: center;
        }

        .conv-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 40px 16px; text-align: center;
          color: rgba(255,255,255,0.3);
        }
        .conv-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .conv-empty-text { font-size: 13px; }

        /* ── Chat area ── */
        .inbox-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0f0f1a;
        }

        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.2);
          gap: 16px;
        }
        .chat-empty-icon { font-size: 64px; }
        .chat-empty-title { font-size: 20px; font-weight: 600; }
        .chat-empty-sub { font-size: 14px; }

        /* Chat header */
        .chat-header {
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 12px;
          background: #13131f;
        }
        .chat-header-name {
          font-size: 16px; font-weight: 700; color: #fff;
        }
        .chat-header-sub {
          font-size: 12px; color: rgba(255,255,255,0.4);
          margin-top: 2px;
        }
        .chip-badge {
          margin-left: auto;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          color: #a5b4fc;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
        }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .msg-row {
          display: flex;
          animation: fadeSlideUp 0.2s ease;
        }
        .msg-row.out { justify-content: flex-end; }
        .msg-row.in  { justify-content: flex-start; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .bubble {
          max-width: 68%;
          border-radius: 16px;
          padding: 10px 14px;
          position: relative;
        }
        .bubble-out {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          border-bottom-right-radius: 4px;
        }
        .bubble-in {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          border-bottom-left-radius: 4px;
        }
        .bubble-text {
          margin: 0;
          font-size: 14px;
          color: #fff;
          line-height: 1.5;
          word-break: break-word;
          white-space: pre-wrap;
        }
        .media-tag {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          margin-bottom: 4px;
        }
        .bubble-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
        }
        .bubble-time { font-size: 10px; color: rgba(255,255,255,0.45); }
        .status-icon { font-size: 11px; color: rgba(255,255,255,0.5); }
        .status-icon.read { color: #60a5fa; }

        .loading-msgs {
          display: flex; align-items: center; justify-content: center;
          padding: 40px; color: rgba(255,255,255,0.3); font-size: 14px;
        }

        /* Reply bar */
        .chat-reply {
          padding: 12px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: #13131f;
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }
        .reply-textarea {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-size: 14px;
          resize: none;
          outline: none;
          font-family: inherit;
          min-height: 42px;
          max-height: 120px;
          line-height: 1.4;
          transition: border-color 0.2s;
        }
        .reply-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .reply-textarea:focus { border-color: #6366f1; }

        .send-btn {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          border: none;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s, opacity 0.15s;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) { transform: scale(1.08); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .no-chip-warning {
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.2);
          color: #fbbf24;
          font-size: 12px;
          padding: 8px 16px;
          text-align: center;
        }
      `}</style>

      <div className="inbox-layout">
        {/* ── Sidebar ── */}
        <aside className="inbox-sidebar">
          <div className="inbox-sidebar-header">
            <div className="inbox-title-row">
              <span className="inbox-title">
                💬 Inbox
                {unreadCount > 0 && <span className="badge-unread">{unreadCount}</span>}
              </span>
              <span className={`ws-dot ${wsConnected ? '' : 'off'}`} title={wsConnected ? 'Tempo real ativo' : 'Offline'} />
            </div>
            <input
              className="search-box"
              placeholder="Buscar conversa ou número..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={filterInstance}
              onChange={(e) => setFilterInstance(e.target.value)}
            >
              <option value="">Todos os chips</option>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.instanceName} {i.phone ? `(${i.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="conv-list">
            {loading ? (
              <div className="conv-empty">
                <div className="conv-empty-icon">⏳</div>
                <div className="conv-empty-text">Carregando...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="conv-empty">
                <div className="conv-empty-icon">📭</div>
                <div className="conv-empty-text">
                  {search ? 'Nenhuma conversa encontrada' : 'Nenhuma mensagem ainda'}
                </div>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = selectedConv?.remoteJid === conv.remoteJid;
                const displayName = conv.isGroup
                  ? conv.groupName || conv.remotePhone
                  : conv.remoteName || conv.remotePhone;
                const avatarColor = getAvatarColor(conv.remoteJid);
                const initials = getInitials(displayName);
                const preview = getMessagePreview(conv.lastMessage);

                return (
                  <div
                    key={conv.remoteJid}
                    className={`conv-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedConv(conv)}
                  >
                    <div className="avatar" style={{ background: avatarColor }}>
                      {initials}
                      {conv.isGroup && <span className="avatar-group-badge">👥</span>}
                    </div>
                    <div className="conv-info">
                      <div className="conv-name">{displayName}</div>
                      <div className={`conv-preview ${conv.lastMessage.direction === 'outbound' ? 'out' : ''}`}>
                        {conv.lastMessage.direction === 'outbound' && '↗ '}
                        {preview}
                      </div>
                    </div>
                    <div className="conv-right">
                      <span className="conv-time">{formatTime(conv.lastMessage.createdAt)}</span>
                      {conv.unreadCount > 0 && (
                        <span className="badge-count">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Chat area ── */}
        <div className="inbox-chat">
          {!selectedConv ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <div className="chat-empty-title">Selecione uma conversa</div>
              <div className="chat-empty-sub">Clique em uma conversa à esquerda para visualizar o histórico</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="chat-header">
                <div
                  className="avatar"
                  style={{ background: getAvatarColor(selectedConv.remoteJid), width: 40, height: 40, fontSize: 14 }}
                >
                  {getInitials(selectedConv.remoteName || selectedConv.remotePhone)}
                </div>
                <div>
                  <div className="chat-header-name">
                    {selectedConv.isGroup
                      ? selectedConv.groupName || selectedConv.remotePhone
                      : selectedConv.remoteName || selectedConv.remotePhone}
                  </div>
                  <div className="chat-header-sub">
                    {selectedConv.isGroup ? '👥 Grupo' : `+${selectedConv.remotePhone}`}
                  </div>
                </div>
                {selectedConv.instanceName && (
                  <span className="chip-badge">📱 {selectedConv.instanceName}</span>
                )}
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {loadingMessages ? (
                  <div className="loading-msgs">⏳ Carregando mensagens...</div>
                ) : messages.length === 0 ? (
                  <div className="loading-msgs">Nenhuma mensagem nesta conversa</div>
                ) : (
                  messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* No chip warning */}
              {connectedInstances.length === 0 && (
                <div className="no-chip-warning">
                  ⚠️ Nenhum chip conectado — conecte um chip para poder enviar respostas
                </div>
              )}

              {/* Reply bar */}
              <div className="chat-reply">
                <textarea
                  className="reply-textarea"
                  placeholder="Digite sua mensagem... (Enter para enviar)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={sending || connectedInstances.length === 0}
                />
                <button
                  className="send-btn"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending || connectedInstances.length === 0}
                  title="Enviar"
                >
                  {sending ? '⏳' : '➤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
