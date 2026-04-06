'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { orderWebhooksApi, WebhookIntegration, WebhookProvider, SignatureType, WebhookStatistics } from '@/lib/order-webhooks';
import { getErrorMessage } from '@/lib/auth';

const providerOptions: { value: WebhookProvider; label: string }[] = [
    { value: 'generic', label: 'Genérico' },
    { value: 'shopify', label: 'Shopify' },
    { value: 'woocommerce', label: 'WooCommerce' },
    { value: 'yampi', label: 'Yampi' },
    { value: 'cartpanda', label: 'CartPanda' },
    { value: 'nuvemshop', label: 'Nuvemshop' },
    { value: 'tray', label: 'Tray' },
    { value: 'other', label: 'Outro' },
];

const signatureOptions: { value: SignatureType; label: string; description: string }[] = [
    { value: 'none', label: 'Nenhuma', description: 'Sem validação (não recomendado)' },
    { value: 'token_header', label: 'Token no Header', description: 'Header contém o secret' },
    { value: 'hmac_sha256', label: 'HMAC SHA256', description: 'Assinatura criptográfica do body' },
];

export default function WebhooksIntegrationsPage() {
    const [integrations, setIntegrations] = useState<WebhookIntegration[]>([]);
    const [statistics, setStatistics] = useState<WebhookStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingIntegration, setEditingIntegration] = useState<WebhookIntegration | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        provider: 'generic' as WebhookProvider,
        signatureType: 'none' as SignatureType,
        signatureHeader: '',
        isEnabled: true,
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [integrationsData, statsData] = await Promise.all([
                orderWebhooksApi.listIntegrations(),
                orderWebhooksApi.getStatistics(),
            ]);
            setIntegrations(integrationsData);
            setStatistics(statsData);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        try {
            if (editingIntegration) {
                const updated = await orderWebhooksApi.updateIntegration(editingIntegration.id, formData);
                setIntegrations(integrations.map(i => i.id === updated.id ? updated : i));
                setSuccessMessage('Integração atualizada!');
            } else {
                const created = await orderWebhooksApi.createIntegration(formData);
                setIntegrations([created, ...integrations]);
                setSuccessMessage('Integração criada!');
            }
            closeModal();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDelete = async () => {
        if (!showDeleteModal) return;
        try {
            await orderWebhooksApi.deleteIntegration(showDeleteModal);
            setIntegrations(integrations.filter(i => i.id !== showDeleteModal));
            setSuccessMessage('Integração excluída!');
            setShowDeleteModal(null);
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleRegenerateSecret = async (id: string) => {
        try {
            const { secret } = await orderWebhooksApi.regenerateSecret(id);
            setIntegrations(integrations.map(i => i.id === id ? { ...i, inboundSecret: secret } : i));
            setSuccessMessage('Secret regenerado!');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleToggleEnabled = async (integration: WebhookIntegration) => {
        try {
            const updated = await orderWebhooksApi.updateIntegration(integration.id, {
                isEnabled: !integration.isEnabled,
            });
            setIntegrations(integrations.map(i => i.id === updated.id ? updated : i));
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const openEditModal = (integration: WebhookIntegration) => {
        setEditingIntegration(integration);
        setFormData({
            name: integration.name,
            provider: integration.provider,
            signatureType: integration.signatureType,
            signatureHeader: integration.signatureHeader || '',
            isEnabled: integration.isEnabled,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingIntegration(null);
        setFormData({
            name: '',
            provider: 'generic',
            signatureType: 'none',
            signatureHeader: '',
            isEnabled: true,
        });
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // TODO: Replace with actual tenant slug from context
    const tenantSlug = 'demo-tenant';

    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/webhooks.png" alt="Webhooks" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Integrações de Webhooks</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            Configure webhooks para receber eventos de plataformas de e-commerce
                        </p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nova Integração
                </button>
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

            {/* Statistics */}
            {statistics && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                    <div className="stat-card">
                        <span className="stat-label">Total Integrações</span>
                        <span className="stat-value">{statistics.totalIntegrations}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Ativas</span>
                        <span className="stat-value text-[var(--accent-success)]">{statistics.activeIntegrations}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Eventos Hoje</span>
                        <span className="stat-value text-[var(--accent-info)]">{statistics.eventsToday}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Na Fila</span>
                        <span className="stat-value text-[var(--accent-warning)]">{statistics.messagesQueued}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Enviados</span>
                        <span className="stat-value text-[var(--accent-success)]">{statistics.messagesSent}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Falhos</span>
                        <span className="stat-value text-red-400">{statistics.messagesFailed}</span>
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : integrations.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                        </svg>
                    </div>
                    <p className="text-[var(--text-muted)]">Nenhuma integração configurada</p>
                    <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
                        Criar primeira integração
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {integrations.map((integration) => (
                        <div key={integration.id} className="glass-card p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-lg">{integration.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${integration.isEnabled
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {integration.isEnabled ? 'Ativa' : 'Inativa'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/20 text-[var(--primary)]">
                                            {orderWebhooksApi.getProviderLabel(integration.provider)}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {/* Webhook URL */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--text-muted)] w-20">URL:</span>
                                            <code className="flex-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded text-xs overflow-hidden text-ellipsis">
                                                {orderWebhooksApi.getWebhookUrl(tenantSlug, integration.endpointSlug)}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(
                                                    orderWebhooksApi.getWebhookUrl(tenantSlug, integration.endpointSlug),
                                                    `url-${integration.id}`
                                                )}
                                                className="p-1 hover:bg-[var(--bg-glass)] rounded"
                                                title="Copiar URL"
                                            >
                                                {copiedField === `url-${integration.id}` ? (
                                                    <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>

                                        {/* Secret */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--text-muted)] w-20">Secret:</span>
                                            <code className="flex-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded text-xs font-mono">
                                                {integration.inboundSecret.substring(0, 16)}...
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(integration.inboundSecret, `secret-${integration.id}`)}
                                                className="p-1 hover:bg-[var(--bg-glass)] rounded"
                                                title="Copiar Secret"
                                            >
                                                {copiedField === `secret-${integration.id}` ? (
                                                    <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleRegenerateSecret(integration.id)}
                                                className="p-1 hover:bg-[var(--bg-glass)] rounded text-[var(--accent-warning)]"
                                                title="Regenerar Secret"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M23 4v6h-6" />
                                                    <path d="M1 20v-6h6" />
                                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Signature */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--text-muted)] w-20">Assinatura:</span>
                                            <span className="text-[var(--text-secondary)]">
                                                {signatureOptions.find(s => s.value === integration.signatureType)?.label}
                                                {integration.signatureHeader && ` (${integration.signatureHeader})`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleEnabled(integration)}
                                        className={`p-2 rounded-lg hover:bg-[var(--bg-glass)] ${integration.isEnabled ? 'text-green-400' : 'text-gray-400'
                                            }`}
                                        title={integration.isEnabled ? 'Desativar' : 'Ativar'}
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            {integration.isEnabled ? (
                                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                                            ) : (
                                                <circle cx="12" cy="12" r="10" />
                                            )}
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => openEditModal(integration)}
                                        className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--accent-info)]"
                                        title="Editar"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                    <a
                                        href={`/webhooks/mappings?integrationId=${integration.id}`}
                                        className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--primary)]"
                                        title="Configurar Eventos"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                    </a>
                                    <button
                                        onClick={() => setShowDeleteModal(integration.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                                        title="Excluir"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">
                            {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nome</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: Minha Loja Shopify"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Plataforma</label>
                                <select
                                    className="input w-full"
                                    value={formData.provider}
                                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as WebhookProvider })}
                                >
                                    {providerOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo de Assinatura</label>
                                <select
                                    className="input w-full"
                                    value={formData.signatureType}
                                    onChange={(e) => setFormData({ ...formData, signatureType: e.target.value as SignatureType })}
                                >
                                    {signatureOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    {signatureOptions.find(s => s.value === formData.signatureType)?.description}
                                </p>
                            </div>

                            {formData.signatureType !== 'none' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome do Header</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="Ex: X-Signature, X-Shopify-Hmac-Sha256"
                                        value={formData.signatureHeader}
                                        onChange={(e) => setFormData({ ...formData, signatureHeader: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isEnabled"
                                    checked={formData.isEnabled}
                                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                                    className="rounded"
                                />
                                <label htmlFor="isEnabled" className="text-sm">Integração ativa</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button className="btn btn-secondary" onClick={closeModal}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                {editingIntegration ? 'Salvar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-red-400">Excluir Integração</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Tem certeza que deseja excluir esta integração? Esta ação não pode ser desfeita
                            e todos os mapeamentos de eventos serão removidos.
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
