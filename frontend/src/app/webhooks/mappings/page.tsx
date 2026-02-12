'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import {
    orderWebhooksApi,
    WebhookEventMapping,
    WebhookIntegration,
    WebhookEventType,
    CreateEventMappingDto
} from '@/lib/order-webhooks';
import { getErrorMessage } from '@/lib/auth';

// Types for instances (from existing module)
interface Instance {
    id: string;
    instanceName: string;
    status: string;
}

export default function EventMappingsPage() {
    const searchParams = useSearchParams();
    const integrationIdParam = searchParams.get('integrationId');

    const [mappings, setMappings] = useState<WebhookEventMapping[]>([]);
    const [integrations, setIntegrations] = useState<WebhookIntegration[]>([]);
    const [eventTypes, setEventTypes] = useState<WebhookEventType[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingMapping, setEditingMapping] = useState<WebhookEventMapping | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [selectedIntegration, setSelectedIntegration] = useState<string>(integrationIdParam || '');

    const defaultFormData: CreateEventMappingDto = {
        integrationId: '',
        eventTypeCode: '',
        isEnabled: true,
        matchRules: {},
        whatsappInstanceId: '',
        sendMode: 'template_only',
        templateName: '',
        templateLanguage: 'pt_BR',
        templateVariablesMap: {},
        fallbackText: '',
        forwardToN8n: false,
        n8nWebhookUrl: '',
    };

    const [formData, setFormData] = useState<CreateEventMappingDto>(defaultFormData);
    const [variablesInput, setVariablesInput] = useState('');
    const [matchRulesInput, setMatchRulesInput] = useState('');

    useEffect(() => {
        loadData();
    }, [selectedIntegration]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [integrationsData, eventTypesData, mappingsData] = await Promise.all([
                orderWebhooksApi.listIntegrations(),
                orderWebhooksApi.listEventTypes(),
                orderWebhooksApi.listMappings(selectedIntegration || undefined),
            ]);
            setIntegrations(integrationsData);
            setEventTypes(eventTypesData);
            setMappings(mappingsData);

            // Load instances from API
            try {
                const res = await fetch('/api/instances');
                if (res.ok) {
                    const instancesData = await res.json();
                    setInstances(instancesData);
                }
            } catch {
                console.log('Could not load instances');
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.integrationId || !formData.eventTypeCode) {
            setError('Integração e tipo de evento são obrigatórios');
            return;
        }

        try {
            // Parse JSON inputs
            let matchRules = {};
            let templateVariablesMap = {};

            if (matchRulesInput.trim()) {
                try {
                    matchRules = JSON.parse(matchRulesInput);
                } catch {
                    setError('Match Rules deve ser um JSON válido');
                    return;
                }
            }

            if (variablesInput.trim()) {
                try {
                    templateVariablesMap = JSON.parse(variablesInput);
                } catch {
                    setError('Template Variables Map deve ser um JSON válido');
                    return;
                }
            }

            const data = {
                ...formData,
                matchRules,
                templateVariablesMap,
            };

            if (editingMapping) {
                const updated = await orderWebhooksApi.updateMapping(editingMapping.id, data);
                setMappings(mappings.map(m => m.id === updated.id ? updated : m));
                setSuccessMessage('Mapeamento atualizado!');
            } else {
                const created = await orderWebhooksApi.createMapping(data);
                setMappings([created, ...mappings]);
                setSuccessMessage('Mapeamento criado!');
            }
            closeModal();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDelete = async () => {
        if (!showDeleteModal) return;
        try {
            await orderWebhooksApi.deleteMapping(showDeleteModal);
            setMappings(mappings.filter(m => m.id !== showDeleteModal));
            setSuccessMessage('Mapeamento excluído!');
            setShowDeleteModal(null);
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleToggleEnabled = async (mapping: WebhookEventMapping) => {
        try {
            const updated = await orderWebhooksApi.updateMapping(mapping.id, {
                isEnabled: !mapping.isEnabled,
            });
            setMappings(mappings.map(m => m.id === updated.id ? updated : m));
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const openEditModal = (mapping: WebhookEventMapping) => {
        setEditingMapping(mapping);
        setFormData({
            integrationId: mapping.integrationId,
            eventTypeCode: mapping.eventTypeCode,
            isEnabled: mapping.isEnabled,
            whatsappInstanceId: mapping.whatsappInstanceId || '',
            sendMode: mapping.sendMode,
            templateName: mapping.templateName || '',
            templateLanguage: mapping.templateLanguage,
            fallbackText: mapping.fallbackText || '',
            forwardToN8n: mapping.forwardToN8n,
            n8nWebhookUrl: mapping.n8nWebhookUrl || '',
        });
        setMatchRulesInput(JSON.stringify(mapping.matchRules || {}, null, 2));
        setVariablesInput(JSON.stringify(mapping.templateVariablesMap || {}, null, 2));
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingMapping(null);
        setFormData(defaultFormData);
        setVariablesInput('');
        setMatchRulesInput('');
    };

    const openNewModal = () => {
        setFormData({
            ...defaultFormData,
            integrationId: selectedIntegration || integrations[0]?.id || '',
        });
        setShowModal(true);
    };

    const getEventTypeLabel = (code: string) => {
        const eventType = eventTypes.find(e => e.code === code);
        return eventType?.label || code;
    };

    const getIntegrationName = (id: string) => {
        const integration = integrations.find(i => i.id === id);
        return integration?.name || 'N/A';
    };

    const getInstanceName = (id: string) => {
        const instance = instances.find(i => i.id === id);
        return instance?.instanceName || 'N/A';
    };

    const sendModeLabels: Record<string, string> = {
        template_only: 'Apenas Template',
        template_preferred: 'Template Preferido',
        free_text_if_24h: 'Texto Livre (24h)',
    };

    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Mapeamentos de Eventos</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        Configure quais mensagens enviar para cada tipo de evento
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="input"
                        value={selectedIntegration}
                        onChange={(e) => setSelectedIntegration(e.target.value)}
                    >
                        <option value="">Todas as integrações</option>
                        {integrations.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={openNewModal}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Novo Mapeamento
                    </button>
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
            ) : mappings.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </div>
                    <p className="text-[var(--text-muted)]">Nenhum mapeamento configurado</p>
                    <button className="btn btn-primary mt-4" onClick={openNewModal}>
                        Criar primeiro mapeamento
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-[var(--border)]">
                                <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Status</th>
                                <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Evento</th>
                                <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Integração</th>
                                <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Template</th>
                                <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Instância</th>
                                <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Modo</th>
                                <th className="pb-3 font-medium text-sm text-[var(--text-muted)]">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mappings.map((mapping) => (
                                <tr key={mapping.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-glass)]">
                                    <td className="py-4">
                                        <button
                                            onClick={() => handleToggleEnabled(mapping)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${mapping.isEnabled ? 'bg-green-500' : 'bg-gray-600'
                                                }`}
                                        >
                                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${mapping.isEnabled ? 'left-5' : 'left-0.5'
                                                }`} />
                                        </button>
                                    </td>
                                    <td className="py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/20 text-[var(--primary)]">
                                            {getEventTypeLabel(mapping.eventTypeCode)}
                                        </span>
                                    </td>
                                    <td className="py-4 text-sm">{getIntegrationName(mapping.integrationId)}</td>
                                    <td className="py-4">
                                        <code className="text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                                            {mapping.templateName || '-'}
                                        </code>
                                    </td>
                                    <td className="py-4 text-sm">{getInstanceName(mapping.whatsappInstanceId || '')}</td>
                                    <td className="py-4 text-xs text-[var(--text-muted)]">
                                        {sendModeLabels[mapping.sendMode]}
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(mapping)}
                                                className="p-1.5 rounded hover:bg-[var(--bg-glass)] text-[var(--accent-info)]"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(mapping.id)}
                                                className="p-1.5 rounded hover:bg-red-500/10 text-red-400"
                                                title="Excluir"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="glass-card p-6 w-full max-w-2xl my-8">
                        <h2 className="text-xl font-bold mb-4">
                            {editingMapping ? 'Editar Mapeamento' : 'Novo Mapeamento'}
                        </h2>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Integração *</label>
                                    <select
                                        className="input w-full"
                                        value={formData.integrationId}
                                        onChange={(e) => setFormData({ ...formData, integrationId: e.target.value })}
                                        disabled={!!editingMapping}
                                    >
                                        <option value="">Selecione...</option>
                                        {integrations.map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Tipo de Evento *</label>
                                    <select
                                        className="input w-full"
                                        value={formData.eventTypeCode}
                                        onChange={(e) => setFormData({ ...formData, eventTypeCode: e.target.value })}
                                        disabled={!!editingMapping}
                                    >
                                        <option value="">Selecione...</option>
                                        {eventTypes.map(e => (
                                            <option key={e.code} value={e.code}>{e.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Instância WhatsApp</label>
                                    <select
                                        className="input w-full"
                                        value={formData.whatsappInstanceId}
                                        onChange={(e) => setFormData({ ...formData, whatsappInstanceId: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        {instances.map(i => (
                                            <option key={i.id} value={i.id}>{i.instanceName} ({i.status})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Modo de Envio</label>
                                    <select
                                        className="input w-full"
                                        value={formData.sendMode}
                                        onChange={(e) => setFormData({ ...formData, sendMode: e.target.value as any })}
                                    >
                                        <option value="template_only">Apenas Template</option>
                                        <option value="template_preferred">Template Preferido</option>
                                        <option value="free_text_if_24h">Texto Livre (Janela 24h)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome do Template</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="Ex: pedido_enviado"
                                        value={formData.templateName}
                                        onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Idioma do Template</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="pt_BR"
                                        value={formData.templateLanguage}
                                        onChange={(e) => setFormData({ ...formData, templateLanguage: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Mapeamento de Variáveis do Template (JSON)
                                </label>
                                <textarea
                                    className="input w-full font-mono text-sm"
                                    rows={4}
                                    placeholder='{"1": "customerName", "2": "trackingCode"}'
                                    value={variablesInput}
                                    onChange={(e) => setVariablesInput(e.target.value)}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Mapeia números de variáveis para campos do payload normalizado
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Regras de Match (JSON)
                                </label>
                                <textarea
                                    className="input w-full font-mono text-sm"
                                    rows={3}
                                    placeholder='{"orderStatus": "shipped"}'
                                    value={matchRulesInput}
                                    onChange={(e) => setMatchRulesInput(e.target.value)}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Filtro opcional: mensagem só será enviada se as regras baterem
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Texto de Fallback (Janela 24h)</label>
                                <textarea
                                    className="input w-full"
                                    rows={2}
                                    placeholder="Olá {{customerName}}, seu pedido {{orderId}} foi enviado!"
                                    value={formData.fallbackText}
                                    onChange={(e) => setFormData({ ...formData, fallbackText: e.target.value })}
                                />
                            </div>

                            <div className="border-t border-[var(--border)] pt-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="forwardToN8n"
                                        checked={formData.forwardToN8n}
                                        onChange={(e) => setFormData({ ...formData, forwardToN8n: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="forwardToN8n" className="text-sm font-medium">
                                        Encaminhar para n8n
                                    </label>
                                </div>

                                {formData.forwardToN8n && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">URL do Webhook n8n</label>
                                        <input
                                            type="url"
                                            className="input w-full"
                                            placeholder="https://seu-n8n.com/webhook/..."
                                            value={formData.n8nWebhookUrl}
                                            onChange={(e) => setFormData({ ...formData, n8nWebhookUrl: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isEnabled"
                                    checked={formData.isEnabled}
                                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                                    className="rounded"
                                />
                                <label htmlFor="isEnabled" className="text-sm">Mapeamento ativo</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
                            <button className="btn btn-secondary" onClick={closeModal}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                {editingMapping ? 'Salvar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-red-400">Excluir Mapeamento</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Tem certeza que deseja excluir este mapeamento? Novos eventos deste tipo
                            não serão mais processados.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)}>
                                Cancelar
                            </button>
                            <button className="btn bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
