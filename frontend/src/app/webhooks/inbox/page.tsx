'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import {
    orderWebhooksApi,
    WebhookEventInbox,
    WebhookIntegration,
    WebhookEventType
} from '@/lib/order-webhooks';
import { getErrorMessage } from '@/lib/auth';

export default function WebhookInboxPage() {
    const [events, setEvents] = useState<WebhookEventInbox[]>([]);
    const [integrations, setIntegrations] = useState<WebhookIntegration[]>([]);
    const [eventTypes, setEventTypes] = useState<WebhookEventType[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<WebhookEventInbox | null>(null);

    // Filters
    const [integrationId, setIntegrationId] = useState('');
    const [eventTypeCode, setEventTypeCode] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    useEffect(() => {
        loadFilters();
    }, []);

    useEffect(() => {
        loadEvents();
    }, [integrationId, eventTypeCode, status, page]);

    const loadFilters = async () => {
        try {
            const [integrationsData, eventTypesData] = await Promise.all([
                orderWebhooksApi.listIntegrations(),
                orderWebhooksApi.listEventTypes(),
            ]);
            setIntegrations(integrationsData);
            setEventTypes(eventTypesData);
        } catch (err) {
            console.error('Error loading filters:', err);
        }
    };

    const loadEvents = async () => {
        try {
            setIsLoading(true);
            const response = await orderWebhooksApi.listInboxEvents({
                integrationId: integrationId || undefined,
                eventTypeCode: eventTypeCode || undefined,
                status: status || undefined,
                page,
                limit,
            });
            setEvents(response.data);
            setTotal(response.total);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const loadEventDetail = async (id: string) => {
        try {
            const event = await orderWebhooksApi.getInboxEvent(id);
            setSelectedEvent(event);
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const getEventTypeLabel = (code: string) => {
        const eventType = eventTypes.find(e => e.code === code);
        return eventType?.label || code;
    };

    const getIntegrationName = (id: string) => {
        const integration = integrations.find(i => i.id === id);
        return integration?.name || 'N/A';
    };

    const totalPages = Math.ceil(total / limit);

    const statusConfig = orderWebhooksApi.getStatusConfig;

    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/webhooks.png" alt="Inbox" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Inbox de Eventos</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            Monitore os webhooks recebidos e seu status de processamento
                        </p>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={loadEvents}>
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
                        value={integrationId}
                        onChange={(e) => { setIntegrationId(e.target.value); setPage(1); }}
                    >
                        <option value="">Todas as integrações</option>
                        {integrations.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                    </select>

                    <select
                        className="input"
                        value={eventTypeCode}
                        onChange={(e) => { setEventTypeCode(e.target.value); setPage(1); }}
                    >
                        <option value="">Todos os eventos</option>
                        {eventTypes.map(e => (
                            <option key={e.code} value={e.code}>{e.label}</option>
                        ))}
                    </select>

                    <select
                        className="input"
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    >
                        <option value="">Todos os status</option>
                        <option value="pending">Pendente</option>
                        <option value="processed">Processado</option>
                        <option value="ignored">Ignorado</option>
                        <option value="failed">Falhou</option>
                    </select>

                    {(integrationId || eventTypeCode || status) && (
                        <button
                            className="text-sm text-[var(--primary)] hover:underline"
                            onClick={() => {
                                setIntegrationId('');
                                setEventTypeCode('');
                                setStatus('');
                                setPage(1);
                            }}
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
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
            ) : events.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <p className="text-[var(--text-muted)]">Nenhum evento encontrado</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-[var(--border)]">
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Recebido em</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Evento</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Integração</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Status</th>
                                    <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => {
                                    const statusCfg = statusConfig(event.processedStatus);
                                    return (
                                        <tr key={event.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-glass)]">
                                            <td className="py-4 text-sm">
                                                {new Date(event.receivedAt).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="py-4">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/20 text-[var(--primary)]">
                                                    {getEventTypeLabel(event.eventTypeCode)}
                                                </span>
                                            </td>
                                            <td className="py-4 text-sm">{getIntegrationName(event.integrationId)}</td>
                                            <td className="py-4">
                                                <span
                                                    className="px-2 py-1 rounded-full text-xs font-medium"
                                                    style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                                                >
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <button
                                                    onClick={() => loadEventDetail(event.id)}
                                                    className="p-1.5 rounded hover:bg-[var(--bg-glass)] text-[var(--accent-info)]"
                                                    title="Ver detalhes"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                </button>
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

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="glass-card p-6 w-full max-w-4xl my-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Detalhes do Evento</h2>
                            <button
                                onClick={() => setSelectedEvent(null)}
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
                                <span className="text-sm text-[var(--text-muted)]">ID</span>
                                <p className="text-sm font-mono">{selectedEvent.id}</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Tipo de Evento</span>
                                <p className="text-sm">{getEventTypeLabel(selectedEvent.eventTypeCode)}</p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Status</span>
                                <p>
                                    <span
                                        className="px-2 py-1 rounded-full text-xs font-medium"
                                        style={{
                                            color: statusConfig(selectedEvent.processedStatus).color,
                                            backgroundColor: statusConfig(selectedEvent.processedStatus).bg,
                                        }}
                                    >
                                        {statusConfig(selectedEvent.processedStatus).label}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-[var(--text-muted)]">Recebido em</span>
                                <p className="text-sm">{new Date(selectedEvent.receivedAt).toLocaleString('pt-BR')}</p>
                            </div>
                            {selectedEvent.errorMessage && (
                                <div className="col-span-2">
                                    <span className="text-sm text-[var(--text-muted)]">Erro</span>
                                    <p className="text-sm text-red-400">{selectedEvent.errorMessage}</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-medium mb-2">Payload Normalizado</h3>
                                <pre className="bg-[var(--bg-tertiary)] p-4 rounded-lg text-xs overflow-auto max-h-80">
                                    {JSON.stringify(selectedEvent.normalizedData, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <h3 className="font-medium mb-2">Payload Original</h3>
                                <pre className="bg-[var(--bg-tertiary)] p-4 rounded-lg text-xs overflow-auto max-h-80">
                                    {JSON.stringify(selectedEvent.payloadRaw, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {selectedEvent.processingLog && selectedEvent.processingLog.length > 0 && (
                            <div className="mt-6">
                                <h3 className="font-medium mb-2">Log de Processamento</h3>
                                <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg max-h-40 overflow-auto">
                                    {selectedEvent.processingLog.map((log, index) => (
                                        <div key={index} className="text-xs mb-2 last:mb-0">
                                            <span className="text-[var(--text-muted)]">
                                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                                            </span>
                                            {' - '}
                                            <span className="font-medium">{log.action}</span>
                                            {log.details && (
                                                <span className="text-[var(--text-muted)]">
                                                    {' '}{JSON.stringify(log.details)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end mt-6">
                            <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
