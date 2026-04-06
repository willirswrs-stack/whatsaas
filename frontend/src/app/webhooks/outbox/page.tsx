'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import {
    orderWebhooksApi,
    MessageOutbox,
} from '@/lib/order-webhooks';
import { getErrorMessage } from '@/lib/auth';

export default function WebhookOutboxPage() {
    const [messages, setMessages] = useState<MessageOutbox[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<MessageOutbox | null>(null);

    // Filters
    const [status, setStatus] = useState('');
    const [phone, setPhone] = useState('');
    const [orderId, setOrderId] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    useEffect(() => {
        loadMessages();
    }, [status, page]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadMessages = async () => {
        try {
            setIsLoading(true);
            const response = await orderWebhooksApi.listOutboxMessages({
                status: status || undefined,
                phone: phone || undefined,
                orderId: orderId || undefined,
                page,
                limit,
            });
            setMessages(response.data);
            setTotal(response.total);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadMessages();
    };

    const handleRetry = async (id: string) => {
        try {
            await orderWebhooksApi.retryMessage(id);
            setSuccessMessage('Mensagem reenfileirada!');
            loadMessages();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const totalPages = Math.ceil(total / limit);

    const statusConfig = orderWebhooksApi.getStatusConfig;

    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/webhooks.png" alt="Outbox" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Outbox de Mensagens</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            Monitore as mensagens enviadas e gerencie reenvios
                        </p>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={loadMessages}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Atualizar
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <select
                        className="input"
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    >
                        <option value="">Todos os status</option>
                        <option value="queued">Na fila</option>
                        <option value="sending">Enviando</option>
                        <option value="sent">Enviado</option>
                        <option value="delivered">Entregue</option>
                        <option value="read">Lido</option>
                        <option value="failed">Falhou</option>
                        <option value="retrying">Reenviando</option>
                    </select>

                    <input
                        type="text"
                        className="input"
                        placeholder="Buscar por telefone..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />

                    <input
                        type="text"
                        className="input"
                        placeholder="Buscar por pedido..."
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />

                    <button className="btn btn-primary" onClick={handleSearch}>
                        Buscar
                    </button>

                    {(status || phone || orderId) && (
                        <button
                            className="text-sm text-[var(--primary)] hover:underline"
                            onClick={() => {
                                setStatus('');
                                setPhone('');
                                setOrderId('');
                                setPage(1);
                                loadMessages();
                            }}
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                    ✅ {successMessage}
                </div>
            )}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                    <button className="ml-2 underline" onClick={() => setError('')}>Fechar</button>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : messages.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <p className="text-[var(--text-muted)]">Nenhuma mensagem encontrada</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-[var(--border)]">
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Status</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Telefone</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Cliente</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Pedido</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Template</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Tentativas</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Criado em</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.map((message) => {
                                    const statusCfg = statusConfig(message.status);
                                    return (
                                        <tr key={message.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-glass)]">
                                            <td className="py-4">
                                                <span
                                                    className="px-2 py-1 rounded-full text-xs font-medium"
                                                    style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                                                >
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="py-4 text-sm font-mono">{message.toPhoneE164}</td>
                                            <td className="py-4 text-sm">{message.customerName || '-'}</td>
                                            <td className="py-4 text-sm font-mono">{message.orderId || '-'}</td>
                                            <td className="py-4">
                                                <code className="text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                                    {message.templateName || 'texto'}
                                                </code>
                                            </td>
                                            <td className="py-4 text-sm text-center">{message.tries}</td>
                                            <td className="py-4 text-sm text-[var(--text-muted)]">
                                                {new Date(message.createdAt).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedMessage(message)}
                                                        className="p-1.5 rounded hover:bg-[var(--bg-glass)] text-[var(--accent-info)]"
                                                        title="Ver detalhes"
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>
                                                    {message.status === 'failed' && (
                                                        <button
                                                            onClick={() => handleRetry(message.id)}
                                                            className="p-1.5 rounded hover:bg-[var(--bg-glass)] text-[var(--accent-warning)]"
                                                            title="Reenviar"
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M23 4v6h-6" />
                                                                <path d="M1 20v-6h6" />
                                                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <p className="text-sm text-[var(--text-muted)]">
                                Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Anterior
                                </button>
                                <span className="text-sm">
                                    Página {page} de {totalPages}
                                </span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Message Detail Modal */}
            {selectedMessage && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Detalhes da Mensagem</h2>
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="p-2 rounded hover:bg-[var(--bg-glass)]"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Status</span>
                                <p>
                                    <span
                                        className="px-2 py-1 rounded-full text-xs font-medium"
                                        style={{
                                            color: statusConfig(selectedMessage.status).color,
                                            backgroundColor: statusConfig(selectedMessage.status).bg,
                                        }}
                                    >
                                        {statusConfig(selectedMessage.status).label}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Tentativas</span>
                                <p className="text-sm">{selectedMessage.tries} / 5</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Telefone</span>
                                <p className="text-sm font-mono">{selectedMessage.toPhoneE164}</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Cliente</span>
                                <p className="text-sm">{selectedMessage.customerName || '-'}</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Pedido</span>
                                <p className="text-sm font-mono">{selectedMessage.orderId || '-'}</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Template</span>
                                <p className="text-sm">{selectedMessage.templateName || 'texto livre'}</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Criado em</span>
                                <p className="text-sm">{new Date(selectedMessage.createdAt).toLocaleString('pt-BR')}</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Enviado em</span>
                                <p className="text-sm">
                                    {selectedMessage.sentAt
                                        ? new Date(selectedMessage.sentAt).toLocaleString('pt-BR')
                                        : '-'}
                                </p>
                            </div>
                        </div>

                        {selectedMessage.lastError && (
                            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <span className="text-sm text-red-400 font-medium">Último erro:</span>
                                <p className="text-sm text-red-300 mt-1">{selectedMessage.lastError}</p>
                            </div>
                        )}

                        {selectedMessage.templateParams && Object.keys(selectedMessage.templateParams).length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">Parâmetros do Template</h3>
                                <pre className="bg-[var(--bg-tertiary)] p-4 rounded-lg text-xs overflow-auto">
                                    {JSON.stringify(selectedMessage.templateParams, null, 2)}
                                </pre>
                            </div>
                        )}

                        {selectedMessage.messageText && (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">Texto da Mensagem</h3>
                                <p className="bg-[var(--bg-tertiary)] p-4 rounded-lg text-sm whitespace-pre-wrap">
                                    {selectedMessage.messageText}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            {selectedMessage.status === 'failed' && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        handleRetry(selectedMessage.id);
                                        setSelectedMessage(null);
                                    }}
                                >
                                    Reenviar
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={() => setSelectedMessage(null)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
