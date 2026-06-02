'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { campaignsService, Campaign, Template, Contact, Tag } from '@/lib/campaigns';
import { instancesService, Instance } from '@/lib/instances';
import { flowsApi, Flow } from '@/lib/flows';
import { getErrorMessage } from '@/lib/auth';
import { connectSocket } from '@/lib/socket';
import { metaTemplatesService, WabaAccount, MetaTemplate } from '@/lib/meta-templates';
import api from '@/lib/api';

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
    running: { color: 'var(--accent-success)', label: 'Em execução', bg: 'rgba(34, 197, 94, 0.15)' },
    completed: { color: 'var(--accent-info)', label: 'Concluída', bg: 'rgba(59, 130, 246, 0.15)' },
    scheduled: { color: 'var(--accent-warning)', label: 'Agendada', bg: 'rgba(245, 158, 11, 0.15)' },
    draft: { color: 'var(--text-muted)', label: 'Rascunho', bg: 'rgba(107, 101, 128, 0.15)' },
    paused: { color: '#fb923c', label: 'Pausada', bg: 'rgba(251, 146, 60, 0.15)' },
    cancelled: { color: 'var(--accent-danger)', label: 'Cancelada', bg: 'rgba(239, 68, 68, 0.15)' },
};

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [flows, setFlows] = useState<Flow[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [wabaAccounts, setWabaAccounts] = useState<WabaAccount[]>([]);
    const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
    const [selectedWabaAccountId, setSelectedWabaAccountId] = useState('');
    const [isLoadingMetaTemplates, setIsLoadingMetaTemplates] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<any>({});
    const [failureDetails, setFailureDetails] = useState<{ campaignId: string; contacts: any[]; loading: boolean; error?: string }>({
        campaignId: '',
        contacts: [],
        loading: false,
        error: undefined
    });
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        templateId: '',
        metaTemplateId: '',
        flowId: '',
        instanceId: '',
        contactIds: [] as string[],
        aiSpinEnabled: true,
        variationCount: 10,
        minDelaySec: 5,
        maxDelaySec: 15,
        greetingStyle: 'random',
        activeHoursStart: '08:00',
        activeHoursEnd: '20:00'
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [scheduleModal, setScheduleModal] = useState<{ campaignId: string; campaignName: string } | null>(null);
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [metaVariables, setMetaVariables] = useState<Record<string, string>>({});
    const [metaMediaUrl, setMetaMediaUrl] = useState<string>('');
    const [contactSearch, setContactSearch] = useState('');
    const [selectedTagId, setSelectedTagId] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Filtrar contatos por nome ou telefone
    const filteredContacts = contacts.filter(contact => {
        const tagMatch = !selectedTagId || contact.tags?.some(tag => tag.id === selectedTagId);
        if (!contactSearch.trim()) return tagMatch;
        const searchLower = contactSearch.toLowerCase().trim();
        const nameMatch = contact.name?.toLowerCase().includes(searchLower);
        const phoneMatch = contact.phone?.includes(contactSearch.trim());
        return (nameMatch || phoneMatch) && tagMatch;
    });

    useEffect(() => {
        loadData();
    }, [page]);

    // WebSocket Integration (Real-time Updates)
    useEffect(() => {
        const socket = connectSocket();
        if (!socket) return;

        const handleDispatchCompleted = (payload: any) => {
            if (!payload.campaignId) return;
            setCampaigns(prev => prev.map(c => {
                if (c.id === payload.campaignId) {
                    return {
                        ...c,
                        sentCount: (c.sentCount || 0) + 1,
                        // Assumindo running se receber update
                        status: c.status === 'scheduled' || c.status === 'draft' ? 'running' : c.status
                    };
                }
                return c;
            }));
        };

        const handleDispatchFailed = (payload: any) => {
            if (!payload.campaignId) return;
            setCampaigns(prev => prev.map(c => {
                if (c.id === payload.campaignId) {
                    return {
                        ...c,
                        failedCount: (c.failedCount || 0) + 1,
                        status: c.status === 'scheduled' || c.status === 'draft' ? 'running' : c.status
                    };
                }
                return c;
            }));
        };

        const handleCampaignStats = (payload: any) => {
            if (!payload.campaignId || !payload.type) return;
            setCampaigns(prev => prev.map(c => {
                if (c.id === payload.campaignId) {
                    const update: Partial<Campaign> = {};
                    if (payload.type === 'delivered') {
                        update.deliveredCount = (c.deliveredCount || 0) + 1;
                    } else if (payload.type === 'read') {
                        update.readCount = (c.readCount || 0) + 1;
                    }
                    return { ...c, ...update };
                }
                return c;
            }));
        };

        const handleCampaignUpdated = (payload: any) => {
            if (!payload.id) return;
            setCampaigns(prev => prev.map(c => {
                if (c.id === payload.id) {
                    return { ...c, status: payload.status, ...payload };
                }
                return c;
            }));
        };

        socket.on('dispatch.completed', handleDispatchCompleted);
        socket.on('dispatch.failed', handleDispatchFailed);
        socket.on('campaign.stats', handleCampaignStats);
        socket.on('campaign.updated', handleCampaignUpdated);

        return () => {
            socket.off('dispatch.completed', handleDispatchCompleted);
            socket.off('dispatch.failed', handleDispatchFailed);
            socket.off('campaign.stats', handleCampaignStats);
            socket.off('campaign.updated', handleCampaignUpdated);
        };
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
            setError('');
            const [campaignsRes, templatesData, flowsData, contactsData, instancesData, tagsData, wabaAccountsData] = await Promise.all([
                campaignsService.listPaginated(page, 10).catch(() => ({ data: [], meta: {} })),
                campaignsService.listTemplates().catch(() => []),
                flowsApi.getFlows().catch(() => []),
                campaignsService.listContacts().catch(() => []),
                instancesService.list().catch(() => []),
                campaignsService.listTags().catch(() => []),
                metaTemplatesService.listAccounts().catch(() => [])
            ]);
            setCampaigns(campaignsRes.data || []);
            setMeta(campaignsRes.meta || {});
            setTemplates(templatesData);
            setFlows(flowsData);
            setContacts(contactsData);
            setTags(tagsData);
            setInstances(instancesData.filter((i: Instance) => i.status === 'connected'));
            setWabaAccounts(wabaAccountsData);
        } catch (err) {
            setError(getErrorMessage(err));
            setCampaigns([]);
            setTemplates([]);
            setContacts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMetaTemplates = async (accountId: string) => {
        if (!accountId) {
            setMetaTemplates([]);
            setNewCampaign(prev => ({ ...prev, metaTemplateId: '' }));
            return;
        }
        try {
            setIsLoadingMetaTemplates(true);
            const data = await metaTemplatesService.listTemplates(accountId);
            setMetaTemplates(data.filter(t => t.status === 'APPROVED'));
        } catch {
            setMetaTemplates([]);
        } finally {
            setIsLoadingMetaTemplates(false);
        }
    };

    const createCampaign = async () => {
        if (!newCampaign.name.trim()) return;

        try {
            setIsCreating(true);
            setError('');
            const campaign = await campaignsService.create({
                name: newCampaign.name,
                templateId: newCampaign.templateId || undefined,
                flowId: newCampaign.flowId || undefined,
                instanceId: newCampaign.instanceId || undefined,
                contactIds: newCampaign.contactIds,
                tagIds: selectedTagId ? [selectedTagId] : [],
                aiSpinEnabled: newCampaign.aiSpinEnabled,
                variationCount: newCampaign.variationCount,
                minDelaySec: newCampaign.minDelaySec,
                maxDelaySec: newCampaign.maxDelaySec,
                settings: {
                    greetingStyle: newCampaign.greetingStyle,
                    activeHoursStart: newCampaign.activeHoursStart,
                    activeHoursEnd: newCampaign.activeHoursEnd,
                    ...(newCampaign.metaTemplateId ? { 
                        metaTemplateId: newCampaign.metaTemplateId,
                        wabaAccountId: selectedWabaAccountId || undefined,
                        metaVariables,
                        metaMediaUrl
                    } : {})
                }
            });
            setCampaigns([campaign, ...campaigns]);
            setShowModal(false);
            setNewCampaign({ name: '', templateId: '', metaTemplateId: '', flowId: '', instanceId: '', contactIds: [], aiSpinEnabled: true, variationCount: 10, minDelaySec: 5, maxDelaySec: 15, greetingStyle: 'random', activeHoursStart: '08:00', activeHoursEnd: '20:00' });
            setSelectedWabaAccountId('');
            setMetaTemplates([]);
            setContactSearch('');
            setMetaVariables({});
            setMetaMediaUrl('');
            setSuccessMessage('Campanha criada com sucesso!');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsCreating(false);
        }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            setError('');
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await api.post('/uploads/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data?.url) {
                setMetaMediaUrl(res.data.url);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
             setIsUploading(false);
             if (mediaInputRef.current) mediaInputRef.current.value = '';
        }
    };

    const startCampaign = async (id: string) => {
        try {
            setError('');
            const updated = await campaignsService.start(id);
            setCampaigns(campaigns.map(c => c.id === id ? updated : c));
            setSuccessMessage('Campanha iniciada!');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const pauseCampaign = async (id: string) => {
        try {
            setError('');
            const updated = await campaignsService.pause(id);
            setCampaigns(campaigns.map(c => c.id === id ? updated : c));
            setSuccessMessage('Campanha pausada!');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const resumeCampaign = async (id: string) => {
        try {
            setError('');
            const updated = await campaignsService.resume(id);
            setCampaigns(campaigns.map(c => c.id === id ? updated : c));
            setSuccessMessage('Campanha retomada!');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const cancelCampaign = async (id: string) => {
        try {
            setError('');
            await campaignsService.cancel(id);
            setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: 'cancelled' as const } : c));
            setSuccessMessage('Campanha cancelada!');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const deleteCampaign = async () => {
        if (!showDeleteModal) return;
        try {
            setIsDeleting(true);
            setError('');
            await campaignsService.delete(showDeleteModal);
            setCampaigns(campaigns.filter(c => c.id !== showDeleteModal));
            setSuccessMessage('Campanha excluída!');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(null);
        }
    };

    const duplicateCampaign = async (id: string) => {
        try {
            setError('');
            const duplicated = await campaignsService.duplicate(id);
            setCampaigns([duplicated, ...campaigns]);
            setSuccessMessage('Campanha duplicada com sucesso!');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const scheduleCampaign = async () => {
        if (!scheduleModal || !scheduleDateTime) return;
        try {
            setIsScheduling(true);
            setError('');
            const updated = await campaignsService.schedule(scheduleModal.campaignId, scheduleDateTime);
            setCampaigns(campaigns.map(c => c.id === scheduleModal.campaignId ? updated : c));
            setSuccessMessage(`Campanha agendada para ${new Date(scheduleDateTime).toLocaleString('pt-BR')}!`);
            setScheduleModal(null);
            setScheduleDateTime('');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsScheduling(false);
        }
    };

    const cancelSchedule = async (id: string) => {
        try {
            setError('');
            await campaignsService.cancel(id);
            setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: 'draft' as const, scheduledAt: undefined } : c));
            setSuccessMessage('Agendamento cancelado!');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const loadFailureDetails = async (campaignId: string) => {
        setFailureDetails({ campaignId, contacts: [], loading: true, error: undefined });
        try {
            const res = await campaignsService.getContacts(campaignId, { status: 'failed', limit: 100 });
            setFailureDetails({
                campaignId,
                contacts: res.data || [],
                loading: false,
                error: (res.data && res.data.length === 0) ? 'Nenhuma falha registrada.' : undefined
            });
        } catch (err) {
            console.error('Failed to load failure details', err);
            setFailureDetails({
                campaignId,
                contacts: [],
                loading: false,
                error: 'Erro ao carregar detalhes. Tente novamente.'
            });
        }
    };

    const closeFailureDetails = () => {
        setFailureDetails({ campaignId: '', contacts: [], loading: false, error: undefined });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setError('');
            const result = await campaignsService.importContacts(file);
            setSuccessMessage(`${result.imported} contatos importados com sucesso!`);
            // Reload contacts
            const contactsData = await campaignsService.listContacts().catch(() => []);
            setContacts(contactsData);
        } catch (err) {
            setError(getErrorMessage(err));
        }
        // Reset the input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const toggleContact = (contactId: string) => {
        setNewCampaign(prev => ({
            ...prev,
            contactIds: prev.contactIds.includes(contactId)
                ? prev.contactIds.filter(id => id !== contactId)
                : [...prev.contactIds, contactId]
        }));
    };

    const selectAllContacts = () => {
        setNewCampaign(prev => ({
            ...prev,
            contactIds: prev.contactIds.length === contacts.length ? [] : contacts.map(c => c.id)
        }));
    };

    // Filtrar campanhas
    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Contar por status
    const counts = {
        all: campaigns.length,
        running: campaigns.filter(c => c.status === 'running').length,
        scheduled: campaigns.filter(c => c.status === 'scheduled').length,
        completed: campaigns.filter(c => c.status === 'completed').length,
        draft: campaigns.filter(c => c.status === 'draft').length,
    };

    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/campaigns.png" alt="Campanhas" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Campanhas</h1>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nova Campanha
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                    ✅ {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                    <button className="ml-2 underline" onClick={() => setError('')}>Fechar</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="stat-card">
                    <span className="stat-label">Total Campanhas</span>
                    <span className="stat-value">{counts.all}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Em Execução</span>
                    <span className="stat-value text-[var(--accent-success)]">{counts.running}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Agendadas</span>
                    <span className="stat-value text-[var(--accent-warning)]">{counts.scheduled}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Concluídas</span>
                    <span className="stat-value text-[var(--accent-info)]">{counts.completed}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Rascunhos</span>
                    <span className="stat-value text-[var(--text-muted)]">{counts.draft}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Buscar campanhas..."
                        className="input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </div>

                <select
                    className="input w-40"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Todos Status</option>
                    <option value="running">Em execução</option>
                    <option value="paused">Pausadas</option>
                    <option value="scheduled">Agendadas</option>
                    <option value="completed">Concluídas</option>
                    <option value="draft">Rascunhos</option>
                    <option value="cancelled">Canceladas</option>
                </select>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <p className="text-[var(--text-muted)]">Nenhuma campanha encontrada</p>
                    <button
                        className="btn btn-primary mt-4"
                        onClick={() => setShowModal(true)}
                    >
                        Criar primeira campanha
                    </button>
                </div>
            ) : (
                <>
                    {/* Campaigns Table */}
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Campanha</th>
                                    <th>Status</th>
                                    <th>Contatos</th>
                                    <th>Enviadas</th>
                                    <th>Entregues</th>
                                    <th>Lidas</th>
                                    <th>Falhas</th>
                                    <th>Custo (Meta)</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCampaigns.map((campaign) => {
                                    const config = statusConfig[campaign.status] || statusConfig.draft;
                                    const total = campaign.totalContacts || 0;
                                    const sent = campaign.sentCount || 0;
                                    const delivered = campaign.deliveredCount || 0;
                                    const read = campaign.readCount || 0;
                                    const failed = campaign.failedCount || 0;
                                    const progressPercent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
                                    const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '0';
                                    const readRate = delivered > 0 ? ((read / delivered) * 100).toFixed(1) : '0';
                                    
                                    const isMeta = !!campaign.settings?.metaTemplateId;
                                    const estimatedCost = isMeta ? (sent * 0.0633) : 0;

                                    return (
                                        <tr key={campaign.id}>
                                            <td>
                                                <div>
                                                    <p className="font-medium">{campaign.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {campaign.scheduledAt
                                                            ? `Agendada: ${new Date(campaign.scheduledAt).toLocaleDateString()}`
                                                            : `Criada: ${new Date(campaign.createdAt).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-1">
                                                    <span
                                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                                                        style={{ backgroundColor: config.bg, color: config.color }}
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        {config.label}
                                                    </span>
                                                    {/* Barra de Progresso */}
                                                    {campaign.status === 'running' && total > 0 && (
                                                        <div className="w-full">
                                                            <div className="w-24 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
                                                                    style={{ width: `${progressPercent}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-[var(--text-muted)]">{progressPercent}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">{total.toLocaleString()}</td>
                                            <td className="text-center">
                                                <span className={sent > 0 ? 'text-[var(--accent-info)]' : ''}>
                                                    {sent.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div>
                                                    <span className={delivered > 0 ? 'text-[var(--accent-success)]' : ''}>
                                                        {delivered.toLocaleString()}
                                                    </span>
                                                    {sent > 0 && (
                                                        <span className="text-xs text-[var(--text-muted)] ml-1">({deliveryRate}%)</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div>
                                                    <span className={read > 0 ? 'text-[var(--primary)]' : ''}>
                                                        {read.toLocaleString()}
                                                    </span>
                                                    {delivered > 0 && (
                                                        <span className="text-xs text-[var(--text-muted)] ml-1">({readRate}%)</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (failed > 0) loadFailureDetails(campaign.id);
                                                    }}
                                                    disabled={failed === 0}
                                                    className={`font-medium transition-colors ${failed > 0 ? 'text-red-500 hover:text-red-600 underline cursor-pointer' : 'text-[var(--text-muted)] cursor-default'}`}
                                                >
                                                    {failed.toLocaleString()}
                                                </button>
                                            </td>
                                            <td className="text-center">
                                                {isMeta ? (
                                                    <span className="font-mono text-sm px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent)] border border-[var(--border)]" title="Estimativa: Meta marketing message">
                                                        {estimatedCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-[var(--text-muted)]">-</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    {/* Start button - for draft/paused */}
                                                    {(campaign.status === 'draft' || campaign.status === 'paused') && (
                                                        <button
                                                            className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--accent-success)]"
                                                            title="Iniciar"
                                                            onClick={() => startCampaign(campaign.id)}
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                <polygon points="5,3 19,12 5,21" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Pause button - for running */}
                                                    {campaign.status === 'running' && (
                                                        <button
                                                            className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--accent-warning)]"
                                                            title="Pausar"
                                                            onClick={() => pauseCampaign(campaign.id)}
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="6" y="4" width="4" height="16" />
                                                                <rect x="14" y="4" width="4" height="16" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Cancel button - for running/paused/scheduled */}
                                                    {['running', 'paused', 'scheduled'].includes(campaign.status) && (
                                                        <button
                                                            className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-orange-400"
                                                            title="Cancelar campanha"
                                                            onClick={() => cancelCampaign(campaign.id)}
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <line x1="15" y1="9" x2="9" y2="15" />
                                                                <line x1="9" y1="9" x2="15" y2="15" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Schedule button - for draft campaigns */}
                                                    {campaign.status === 'draft' && (
                                                        <button
                                                            className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-400"
                                                            title="Agendar campanha"
                                                            onClick={() => {
                                                                // Set default to tomorrow at 09:00
                                                                const d = new Date();
                                                                d.setDate(d.getDate() + 1);
                                                                d.setHours(9, 0, 0, 0);
                                                                const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                                                setScheduleDateTime(iso);
                                                                setScheduleModal({ campaignId: campaign.id, campaignName: campaign.name });
                                                            }}
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <polyline points="12 6 12 12 16 14" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Duplicate button - always visible */}
                                                    <button
                                                        className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400"
                                                        title="Duplicar campanha"
                                                        onClick={() => duplicateCampaign(campaign.id)}
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    </button>

                                                    {/* Delete button - always visible */}
                                                    <button
                                                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                                                        title="Excluir campanha"
                                                        onClick={() => setShowDeleteModal(campaign.id)}
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 px-2">
                        <span className="text-sm text-[var(--text-muted)]">
                            Mostrando {campaigns.length} de {meta.total || 0} campanhas
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                className="btn btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                                Anterior
                            </button>
                            <div className="flex items-center justify-center min-w-[100px] text-sm font-medium bg-[var(--bg-tertiary)] px-3 py-1 rounded-md border border-[var(--border-primary)]">
                                Página {meta.page || page} de {meta.last_page || 1}
                            </div>
                            <button
                                className="btn btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                                disabled={page >= (meta.last_page || 1)}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Próximo
                                <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modal de Detalhes de Falhas */}
            {failureDetails.campaignId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-3xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Detalhes das Falhas
                            </h2>
                            <button onClick={closeFailureDetails} className="text-[var(--text-muted)] hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {failureDetails.loading ? (
                                <div className="flex justify-center p-8">
                                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : failureDetails.error ? (
                                <div className="text-center p-8 flex flex-col items-center gap-2">
                                    <div className="text-red-500 font-medium">{failureDetails.error}</div>
                                    <button onClick={() => loadFailureDetails(failureDetails.campaignId)} className="text-sm underline text-[var(--text-primary)]">Tentar novamente</button>
                                </div>
                            ) : failureDetails.contacts.length === 0 ? (
                                <div className="text-center p-8 text-[var(--text-muted)]">
                                    Nenhum detalhe de falha encontrado.
                                </div>
                            ) : (
                                <table className="table w-full">
                                    <thead>
                                        <tr>
                                            <th className="text-left">Contato</th>
                                            <th className="text-left">Erro</th>
                                            <th className="text-right">Horário</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {failureDetails.contacts.map((cc, idx) => (
                                            <tr key={idx} className="border-b border-[var(--border-primary)] last:border-0">
                                                <td className="py-3">
                                                    <div className="font-medium text-[var(--text-primary)]">
                                                        {cc.contact?.name || 'Sem nome'}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)]">
                                                        {cc.contact?.phone}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-red-400 text-sm max-w-sm break-words">
                                                    {cc.errorMessage || 'Erro desconhecido'}
                                                </td>
                                                <td className="py-3 text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                                                    {cc.failedAt ? new Date(cc.failedAt).toLocaleString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex justify-end">
                            <button className="btn btn-secondary" onClick={closeFailureDetails}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para criar campanha */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {error && (
                            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                                <button className="ml-2 underline" onClick={() => setError('')}>Fechar</button>
                            </div>
                        )}
                        <h2 className="text-xl font-bold mb-4">Nova Campanha</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nome da Campanha</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: Black Friday 2024"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Template (opcional)</label>
                                <select
                                    className="input w-full"
                                    value={newCampaign.templateId}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, templateId: e.target.value })}
                                >
                                    <option value="">Selecionar template...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Fluxo (opcional)</label>
                                <select
                                    className="input w-full"
                                    value={newCampaign.flowId}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, flowId: e.target.value })}
                                >
                                    <option value="">Selecionar fluxo...</option>
                                    {flows.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Se selecionado, o fluxo será disparado para cada contato.
                                </p>
                            </div>

                            {/* SELEÇÃO DE INSTÂNCIA - OBRIGATÓRIO (ou opcional se usar WABA) */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    {!newCampaign.metaTemplateId && <span className="text-red-400">*</span>} Número WhatsApp (Chip)
                                </label>
                                {instances.length === 0 ? (
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                        <p className="text-sm text-red-400 mb-2">
                                            ⚠️ Nenhum chip conectado encontrado!
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            Vá em Chips → Adicionar Chip e conecte um número antes de criar campanhas.
                                        </p>
                                    </div>
                                ) : (
                                    <select
                                        className="input w-full"
                                        value={newCampaign.instanceId}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, instanceId: e.target.value })}
                                        required={!newCampaign.metaTemplateId}
                                    >
                                        <option value="">Selecione o chip para disparo...</option>
                                        {instances.map(inst => (
                                            <option key={inst.id} value={inst.id}>
                                                📱 {inst.phone || inst.instanceName} — {
                                                    inst.provider === 'evolution' ? '⚡ Evolution API' :
                                                        '🔵 WAHA'
                                                }
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Selecione qual número WhatsApp será usado para enviar as mensagens
                                </p>
                            </div>

                            {/* META TEMPLATES */}
                            {wabaAccounts.length > 0 && (
                                <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">💬</span>
                                        <div>
                                            <h4 className="font-medium text-[var(--text-primary)]">Template Meta (opcional)</h4>
                                            <p className="text-xs text-[var(--text-muted)]">Envie com um template oficial aprovado pela Meta</p>
                                        </div>
                                    </div>

                                    {/* Conta WABA */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Conta WABA</label>
                                        <select
                                            className="input w-full"
                                            value={selectedWabaAccountId}
                                            onChange={(e) => {
                                                setSelectedWabaAccountId(e.target.value);
                                                setNewCampaign(prev => ({ ...prev, metaTemplateId: '' }));
                                                loadMetaTemplates(e.target.value);
                                            }}
                                        >
                                            <option value="">Selecionar conta WABA...</option>
                                            {wabaAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} — {acc.phoneNumber}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Templates da conta selecionada */}
                                    {selectedWabaAccountId && (
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Template</label>
                                            {isLoadingMetaTemplates ? (
                                                <div className="flex items-center gap-2 py-2 text-sm text-[var(--text-muted)]">
                                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                    Carregando templates...
                                                </div>
                                            ) : metaTemplates.length === 0 ? (
                                                <p className="text-sm text-[var(--text-muted)] py-2">
                                                    Nenhum template aprovado encontrado nesta conta.
                                                </p>
                                            ) : (
                                                <select
                                                    className="input w-full"
                                                    value={newCampaign.metaTemplateId}
                                                    onChange={(e) => setNewCampaign(prev => ({ ...prev, metaTemplateId: e.target.value }))}
                                                >
                                                    <option value="">Selecionar template...</option>
                                                    {metaTemplates.map(t => (
                                                        <option key={t.id} value={`${t.name}|${t.language}`}>
                                                            {t.name} ({t.language})
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}

                                    {/* Mapeamento de Variáveis do Template Meta */}
                                    {selectedWabaAccountId && newCampaign.metaTemplateId && (
                                        <div className="mt-4 p-4 border border-blue-500/20 bg-blue-500/5 rounded-lg">
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                <span>⚙️</span> Configuração de Variáveis (Opcional)
                                            </h4>
                                            <p className="text-xs text-[var(--text-muted)] mb-4">
                                                Defina valores fixos para as variáveis do template. Deixe em branco para usar o Nome do Contato automaticamente.
                                            </p>
                                            
                                            {(() => {
                                                const selOpt = metaTemplates.find(t => `${t.name}|${t.language}` === newCampaign.metaTemplateId);
                                                if (!selOpt || !selOpt.components) return null;
                                                
                                                return selOpt.components.map((comp: any, idx: number) => {
                                                    if (comp.type === 'BODY') {
                                                        const text = comp.text || '';
                                                        const matchNum = (text.match(/\{\{\d+\}\}/g) || []).length;
                                                        if (matchNum === 0) return null;
                                                        return (
                                                            <div key={`body-${idx}`} className="mb-3 space-y-2">
                                                                <span className="text-xs font-medium text-purple-400">Variáveis do Texto Principal (Body)</span>
                                                                {Array.from({ length: matchNum }).map((_, i) => (
                                                                    <input 
                                                                        key={`body_var_${i}`}
                                                                        type="text" 
                                                                        placeholder={`\{\{${i+1}\}\}: Padrão será Nome do Contato`}
                                                                        className="input w-full text-sm"
                                                                        value={metaVariables[`body_${i+1}`] || ''}
                                                                        onChange={e => setMetaVariables(prev => ({...prev, [`body_${i+1}`]: e.target.value}))}
                                                                    />
                                                                ))}
                                                            </div>
                                                        );
                                                    } else if (comp.type === 'HEADER' && comp.format === 'TEXT' && comp.text?.includes('{{1}}')) {
                                                        return (
                                                            <div key={`head-${idx}`} className="mb-3 space-y-2">
                                                                <span className="text-xs font-medium text-emerald-400">Variável do Cabeçalho</span>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="{{1}}: Padrão será Nome do Contato"
                                                                    className="input w-full text-sm"
                                                                    value={metaVariables['header_1'] || ''}
                                                                    onChange={e => setMetaVariables(prev => ({...prev, 'header_1': e.target.value}))}
                                                                />
                                                            </div>
                                                        );
                                                    } else if (comp.type === 'HEADER' && ['IMAGE', 'DOCUMENT', 'VIDEO'].includes(comp.format)) {
                                                        return (
                                                            <div key={`headmedia-${idx}`} className="mb-3 space-y-2">
                                                                <span className="text-xs font-medium text-blue-400">Mídia do Cabeçalho ({comp.format})</span>
                                                                <div className="flex gap-2">
                                                                    <input 
                                                                        type="url" 
                                                                        placeholder="URL da mídia (ou faça upload)"
                                                                        className="input w-full text-sm flex-1"
                                                                        value={metaMediaUrl}
                                                                        onChange={e => setMetaMediaUrl(e.target.value)}
                                                                    />
                                                                    <div>
                                                                        <input 
                                                                            type="file" 
                                                                            ref={mediaInputRef}
                                                                            className="hidden" 
                                                                            accept={comp.format === 'IMAGE' ? 'image/*' : comp.format === 'VIDEO' ? 'video/*' : '*/*'} 
                                                                            onChange={handleMediaUpload}
                                                                        />
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => mediaInputRef.current?.click()}
                                                                            disabled={isUploading}
                                                                            className="btn btn-secondary h-full text-xs px-3 whitespace-nowrap"
                                                                        >
                                                                            {isUploading ? 'Enviando...' : 'Upload'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {metaMediaUrl && comp.format === 'IMAGE' && (
                                                                    <div className="mt-2 w-24 h-24 rounded border border-blue-500/30 overflow-hidden relative group">
                                                                        <img src={metaMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                                                                        <button type="button" onClick={() => setMetaMediaUrl('')} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs">Remover</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    } else if (comp.type === 'BUTTONS') {
                                                        return comp.buttons?.map((btn: any, bIdx: number) => {
                                                            if (btn.url?.includes('{{1}}') || btn.text?.includes('{{1}}')) {
                                                                return (
                                                                    <div key={`btn-${bIdx}`} className="mb-3 space-y-2">
                                                                        <span className="text-xs font-medium text-orange-400">Variável do Botão "{btn.text}"</span>
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder="{{1}}: URL ou texto dinâmico"
                                                                            className="input w-full text-sm"
                                                                            value={metaVariables[`button_${bIdx}_1`] || ''}
                                                                            onChange={e => setMetaVariables(prev => ({...prev, [`button_${bIdx}_1`]: e.target.value}))}
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        });
                                                    }
                                                    return null;
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* IA SPIN - VARIAÇÕES DE TEXTO */}
                            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🤖</span>
                                        <div>
                                            <h4 className="font-medium text-[var(--text-primary)]">IA Spin (Variações)</h4>
                                            <p className="text-xs text-[var(--text-muted)]">Gera versões diferentes do texto para evitar bloqueios</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newCampaign.aiSpinEnabled}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, aiSpinEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>

                                {newCampaign.aiSpinEnabled && (
                                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                                        <label className="block text-sm font-medium mb-2">
                                            Número de variações: <span className="text-purple-400 font-bold">{newCampaign.variationCount}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="50"
                                            value={newCampaign.variationCount}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, variationCount: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                            <span>5 (conservador)</span>
                                            <span>50 (máximo)</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DELAY RANDOMIZADO */}
                            <div className="p-4 bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-lg">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">⏱️</span>
                                    <div>
                                        <h4 className="font-medium text-[var(--text-primary)]">Delay Aleatório</h4>
                                        <p className="text-xs text-[var(--text-muted)]">Tempo de espera entre cada envio (simula comportamento humano)</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Mínimo: <span className="text-green-400 font-bold">{newCampaign.minDelaySec}s</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="60"
                                            value={newCampaign.minDelaySec}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setNewCampaign({
                                                    ...newCampaign,
                                                    minDelaySec: val,
                                                    maxDelaySec: Math.max(val, newCampaign.maxDelaySec)
                                                });
                                            }}
                                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Máximo: <span className="text-green-400 font-bold">{newCampaign.maxDelaySec}s</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="120"
                                            value={newCampaign.maxDelaySec}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setNewCampaign({
                                                    ...newCampaign,
                                                    maxDelaySec: val,
                                                    minDelaySec: Math.min(val, newCampaign.minDelaySec)
                                                });
                                            }}
                                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-center text-[var(--text-muted)] mt-2">
                                    Cada mensagem terá um delay de {newCampaign.minDelaySec} a {newCampaign.maxDelaySec} segundos
                                </p>
                            </div>

                            {/* ANTI-BAN AVANÇADO */}
                            <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">🛡️</span>
                                    <div>
                                        <h4 className="font-medium text-[var(--text-primary)]">Proteção Avançada</h4>
                                        <p className="text-xs text-[var(--text-muted)]">Configurações para humanizar o comportamento e evitar banimentos</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Estilo de Saudação */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Estilo de Saudação</label>
                                        <select
                                            className="input w-full"
                                            value={newCampaign.greetingStyle}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, greetingStyle: e.target.value })}
                                        >
                                            <option value="random">🔀 Aleatório (Recomendado)</option>
                                            <option value="casual">👋 Casual (Oi, E aí)</option>
                                            <option value="formal">👔 Formal (Olá, Bom dia)</option>
                                        </select>
                                    </div>

                                    {/* Janela de Atividade */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Horário de Atividade</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                className="input w-full"
                                                value={newCampaign.activeHoursStart}
                                                onChange={(e) => setNewCampaign({ ...newCampaign, activeHoursStart: e.target.value })}
                                            />
                                            <span className="text-[var(--text-muted)]">até</span>
                                            <input
                                                type="time"
                                                className="input w-full"
                                                value={newCampaign.activeHoursEnd}
                                                onChange={(e) => setNewCampaign({ ...newCampaign, activeHoursEnd: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-start gap-2 text-xs text-orange-400">
                                    <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    <p>Envios fora deste horário serão automaticamente pausados e retomados no dia seguinte.</p>
                                </div>
                            </div>

                            {/* Contatos Section */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium">Contatos</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-ghost text-xs py-1 px-2"
                                            onClick={selectAllContacts}
                                        >
                                            {newCampaign.contactIds.length === contacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost text-xs py-1 px-2"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            Importar CSV
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                </div>

                                {/* Campo de Busca de Contatos */}
                                <div className="mb-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                    <label className="block text-sm font-medium mb-2 text-[var(--text-primary)] relative">
                                        Pesquisar Contato por Nome/Telefone
                                    </label>
                                    <div className="relative w-full">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="m21 21-4.35-4.35" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Digite o nome ou telefone para filtrar a lista..."
                                            value={contactSearch}
                                            onChange={(e) => setContactSearch(e.target.value)}
                                            className="input w-full pl-10 py-2 text-sm bg-white dark:bg-zinc-800"
                                        />
                                        {contactSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setContactSearch('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end mb-2">
                                    <select
                                        className="input w-40 text-sm py-2 px-3"
                                        value={selectedTagId}
                                        onChange={(e) => setSelectedTagId(e.target.value)}
                                    >
                                        <option value="">Todas etiquetas</option>
                                        {tags.map(tag => (
                                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {contactSearch && (
                                    <p className="text-xs text-[var(--text-muted)] mb-2">
                                        {filteredContacts.length} de {contacts.length} contatos encontrados
                                    </p>
                                )}

                                {contacts.length === 0 ? (
                                    <div className="text-center py-6 bg-[var(--bg-tertiary)] rounded-lg">
                                        <p className="text-sm text-[var(--text-muted)] mb-2">Nenhum contato cadastrado</p>
                                        <button
                                            type="button"
                                            className="btn btn-ghost text-xs"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Importar contatos via CSV
                                        </button>
                                    </div>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto bg-[var(--bg-tertiary)] rounded-lg p-2">
                                        <div className="space-y-1">
                                            {filteredContacts.length === 0 && contactSearch ? (
                                                <p className="text-sm text-[var(--text-muted)] text-center py-4">
                                                    Nenhum contato encontrado para "{contactSearch}"
                                                </p>
                                            ) : filteredContacts.map(contact => (
                                                <label
                                                    key={contact.id}
                                                    className="flex items-center gap-3 p-2 rounded hover:bg-[var(--bg-glass)] cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={newCampaign.contactIds.includes(contact.id)}
                                                        onChange={() => toggleContact(contact.id)}
                                                        className="w-4 h-4 rounded accent-[var(--primary)]"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{contact.name || contact.phone}</p>
                                                        <p className="text-xs text-[var(--text-muted)]">{contact.phone}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    {newCampaign.contactIds.length} de {contacts.length} contatos selecionados
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => {
                                    setShowModal(false);
                                    setNewCampaign({ name: '', templateId: '', metaTemplateId: '', flowId: '', instanceId: '', contactIds: [], aiSpinEnabled: true, variationCount: 10, minDelaySec: 5, maxDelaySec: 15, greetingStyle: 'random', activeHoursStart: '08:00', activeHoursEnd: '20:00' });
                                    setSelectedWabaAccountId('');
                                    setMetaTemplates([]);
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={createCampaign}
                                disabled={isCreating || !newCampaign.name.trim() || (!newCampaign.instanceId && !newCampaign.metaTemplateId)}
                            >
                                {isCreating ? 'Criando...' : 'Criar Campanha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de exclusão */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-sm text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Excluir Campanha?</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Esta ação irá remover a campanha permanentemente. Os dados de envio serão perdidos.
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => setShowDeleteModal(null)}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
                                onClick={deleteCampaign}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de Agendamento ── */}
            {scheduleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Agendar Campanha</h2>
                                <p className="text-sm text-[var(--text-muted)] truncate max-w-xs">{scheduleModal.campaignName}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="label mb-2 block">📅 Data e Hora do Disparo</label>
                            <input
                                type="datetime-local"
                                className="input w-full"
                                value={scheduleDateTime}
                                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                                onChange={(e) => setScheduleDateTime(e.target.value)}
                                style={{ colorScheme: 'dark' }}
                            />
                            {scheduleDateTime && (
                                <p className="text-xs text-amber-400 mt-2">
                                    ⏰ A campanha será iniciada em: <strong>{new Date(scheduleDateTime).toLocaleString('pt-BR')}</strong>
                                </p>
                            )}
                        </div>

                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-6">
                            <p className="text-xs text-amber-300/80">
                                💡 A campanha será colocada em fila e disparada automaticamente na data/hora selecionada. Você pode cancelar o agendamento antes do disparo.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => { setScheduleModal(null); setScheduleDateTime(''); }}
                                disabled={isScheduling}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn flex-1 text-white font-semibold"
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                onClick={scheduleCampaign}
                                disabled={!scheduleDateTime || isScheduling}
                            >
                                {isScheduling ? '⏳ Agendando...' : '📅 Confirmar Agendamento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
