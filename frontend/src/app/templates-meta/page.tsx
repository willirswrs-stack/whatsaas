'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components';
import {
    metaTemplatesService,
    WabaAccount,
    MetaTemplate,
    CreateWabaAccountDto,
    UpdateProfileDto,
    CreateTemplateDto,
    BUSINESS_CATEGORIES,
    TEMPLATE_LANGUAGES
} from '@/lib/meta-templates';
import { getErrorMessage } from '@/lib/auth';

export default function TemplatesMetaPage() {
    const [accounts, setAccounts] = useState<WabaAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<WabaAccount | null>(null);
    const [templates, setTemplates] = useState<MetaTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

    // Modal states
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showConfigProfile, setShowConfigProfile] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showCreateTemplate, setShowCreateTemplate] = useState(false);

    // Form states
    const [newAccount, setNewAccount] = useState<CreateWabaAccountDto>({
        name: '',
        wabaId: '',
        phoneNumberId: '',
        phoneNumber: '',
        accessToken: '',
        appId: '',
    });

    const [profileForm, setProfileForm] = useState<UpdateProfileDto>({
        about: '',
        description: '',
        category: 'OTHER',
        email: '',
        appId: '',
    });

    const [newTemplate, setNewTemplate] = useState<CreateTemplateDto>({
        name: '',
        category: 'MARKETING',
        language: 'pt_BR',
        body: '',
        footer: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            setIsLoading(true);
            const data = await metaTemplatesService.listAccounts();
            setAccounts(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const loadTemplates = async (accountId: string) => {
        try {
            setIsLoadingTemplates(true);
            const data = await metaTemplatesService.listTemplates(accountId);
            setTemplates(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    const handleAddAccount = async () => {
        if (!newAccount.name || !newAccount.wabaId || !newAccount.phoneNumberId || !newAccount.accessToken) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setIsSubmitting(true);
            const account = await metaTemplatesService.createAccount(newAccount);
            setAccounts([account, ...accounts]);
            setShowAddAccount(false);
            setNewAccount({ name: '', wabaId: '', phoneNumberId: '', phoneNumber: '', accessToken: '', appId: '' });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!selectedAccount) return;

        try {
            setIsSubmitting(true);
            await metaTemplatesService.updateProfile(selectedAccount.id, profileForm);
            await loadAccounts();
            setShowConfigProfile(false);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!selectedAccount || !newTemplate.name || !newTemplate.body) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setIsSubmitting(true);
            await metaTemplatesService.createTemplate(selectedAccount.id, newTemplate);
            await loadTemplates(selectedAccount.id);
            setShowCreateTemplate(false);
            setNewTemplate({ name: '', category: 'MARKETING', language: 'pt_BR', body: '', footer: '' });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (!confirm('Tem certeza que deseja remover esta conta?')) return;

        try {
            await metaTemplatesService.deleteAccount(accountId);
            setAccounts(accounts.filter(a => a.id !== accountId));
            if (selectedAccount?.id === accountId) {
                setSelectedAccount(null);
                setTemplates([]);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleSelectAccount = async (account: WabaAccount) => {
        setSelectedAccount(account);
        setProfileForm({
            about: account.about || '',
            description: account.description || '',
            category: account.category || 'OTHER',
            email: account.email || '',
            appId: account.appId || '',
        });
        await loadTemplates(account.id);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'badge badge-success';
            case 'PENDING': return 'badge badge-warning';
            case 'REJECTED': return 'badge badge-danger';
            default: return 'badge badge-info';
        }
    };

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case 'GREEN': return 'text-green-400';
            case 'YELLOW': return 'text-yellow-400';
            case 'RED': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="animate-fadeIn">
            <Header />

            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/templates_meta.png" alt="Templates Meta" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title mb-0">Templates Meta</h1>
                        <p className="text-[var(--text-muted)]">
                            Gerencie seus templates da API Oficial do WhatsApp
                        </p>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddAccount(true)}
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar Conta
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                    <button className="ml-2 underline" onClick={() => setError('')}>Fechar</button>
                </div>
            )}

            {/* Info Banner */}
            <div className="glass p-4 rounded-xl mb-8 flex items-start gap-3">
                <svg className="w-6 h-6 text-[var(--primary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <p className="font-medium text-white">Selecione um número</p>
                    <p className="text-sm text-[var(--text-muted)]">
                        Clique em uma caixa de entrada para gerenciar seus templates da API Oficial do WhatsApp
                    </p>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Accounts List */}
                    <div className="space-y-4">
                        {accounts.map((account) => (
                            <div
                                key={account.id}
                                className={`glass-card p-6 cursor-pointer transition-all ${selectedAccount?.id === account.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : ''
                                    }`}
                                onClick={() => handleSelectAccount(account)}
                            >
                                {/* Account Header */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white">{account.name}</h3>
                                        <p className="text-sm text-[var(--text-muted)]">{account.phoneNumber}</p>
                                        <p className="text-xs text-[var(--text-muted)]">ID: {account.wabaId?.substring(0, 10)}...</p>
                                    </div>
                                </div>

                                {/* Status Row */}
                                <div className="flex items-center gap-4 mb-4 text-sm">
                                    <span className="text-[var(--text-muted)]">Status:</span>
                                    <span className={account.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>
                                        {account.status === 'active' ? 'Conectado' : 'Pendente'}
                                    </span>
                                    <span className="text-[var(--text-muted)]">Qualidade:</span>
                                    <span className={getQualityColor(account.qualityRating)}>
                                        ● {account.qualityRating === 'GREEN' ? 'Alta' : account.qualityRating === 'YELLOW' ? 'Média' : 'Baixa'}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        className={`btn flex-1 ${selectedAccount?.id === account.id ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectAccount(account);
                                        }}
                                    >
                                        📄 Templates
                                    </button>
                                    <button
                                        className="btn btn-secondary flex-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAccount(account);
                                            setProfileForm({
                                                about: account.about || '',
                                                description: account.description || '',
                                                category: account.category || 'OTHER',
                                                email: account.email || '',
                                                appId: account.appId || '',
                                            });
                                            setShowConfigProfile(true);
                                        }}
                                    >
                                        ⚙️ Configurar
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {accounts.length === 0 && !isLoading && (
                            <div className="glass-card p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <p className="text-[var(--text-muted)] mb-4">Nenhuma conta configurada</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowAddAccount(true)}
                                >
                                    Adicionar primeira conta
                                </button>
                            </div>
                        )}

                        <p className="text-sm text-[var(--text-muted)] text-center">
                            Total: {accounts.length} caixa(s) de entrada
                        </p>
                    </div>

                    {/* Templates Panel */}
                    <div className="glass-card p-6">
                        {selectedAccount ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-white">
                                        Templates - {selectedAccount.name}
                                    </h3>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowCreateTemplate(true)}
                                    >
                                        + Novo Template
                                    </button>
                                </div>

                                {isLoadingTemplates ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : templates.length > 0 ? (
                                    <div className="space-y-3">
                                        {templates.map((template) => (
                                            <div key={template.id} className="glass p-4 rounded-lg">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-medium text-white">{template.name}</h4>
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            {template.category} • {template.language}
                                                        </p>
                                                    </div>
                                                    <span className={getStatusBadge(template.status)}>
                                                        {template.status === 'APPROVED' && '✓ '}
                                                        {template.status === 'PENDING' && '⏳ '}
                                                        {template.status === 'REJECTED' && '✗ '}
                                                        {template.status}
                                                    </span>
                                                </div>
                                                {template.rejected_reason && (
                                                    <p className="text-xs text-red-400 mt-2">
                                                        Motivo: {template.rejected_reason}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-[var(--text-muted)]">Nenhum template encontrado</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <svg className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                <p className="text-[var(--text-muted)]">
                                    Selecione uma conta para ver os templates
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal - Add Account */}
            {showAddAccount && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-8 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Adicionar Conta WABA</h2>
                            <button
                                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg"
                                onClick={() => setShowAddAccount(false)}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nome da Conta *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: API Principal"
                                    value={newAccount.name}
                                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">WABA ID *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: 123456789012345"
                                    value={newAccount.wabaId}
                                    onChange={(e) => setNewAccount({ ...newAccount, wabaId: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Encontre em: Meta Business Suite → WhatsApp Accounts
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Phone Number ID *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: 123456789012345"
                                    value={newAccount.phoneNumberId}
                                    onChange={(e) => setNewAccount({ ...newAccount, phoneNumberId: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Número de Telefone *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: +55 11 99999-9999"
                                    value={newAccount.phoneNumber}
                                    onChange={(e) => setNewAccount({ ...newAccount, phoneNumber: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Access Token *</label>
                                <input
                                    type="password"
                                    className="input w-full"
                                    placeholder="Token de acesso permanente"
                                    value={newAccount.accessToken}
                                    onChange={(e) => setNewAccount({ ...newAccount, accessToken: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    🔒 O token será armazenado de forma criptografada
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">APP ID (Opcional)</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: 1234567890123456"
                                    value={newAccount.appId}
                                    onChange={(e) => setNewAccount({ ...newAccount, appId: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    💡 Obtenha em <a href="https://developers.facebook.com/apps" target="_blank" className="text-[var(--primary)] underline">developers.facebook.com/apps</a>
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddAccount(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddAccount}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Salvando...' : 'Adicionar Conta'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Config Profile */}
            {showConfigProfile && selectedAccount && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="glass-card p-8 w-full max-w-2xl my-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">⚙️ Configurar Perfil Comercial</h2>
                                <p className="text-sm text-[var(--text-muted)]">
                                    {selectedAccount.name} • {selectedAccount.phoneNumber}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowPreview(true)}
                                >
                                    👁 Ver Preview
                                </button>
                                <button
                                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg"
                                    onClick={() => setShowConfigProfile(false)}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* APP_ID Section */}
                            <div className="glass p-4 rounded-xl border-2 border-[var(--primary)]/30">
                                <h3 className="font-medium text-[var(--primary)] mb-2">✏️ Configuração do APP_ID (Templates com Mídia)</h3>
                                <p className="text-xs text-[var(--text-muted)] mb-3">
                                    Necessário para fazer upload de mídia ao criar templates (imagem/vídeo/documento)
                                </p>
                                <div>
                                    <label className="block text-sm font-medium mb-2">🆔 APP_ID da Meta</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="Ex: 1234567890123456"
                                        value={profileForm.appId}
                                        onChange={(e) => setProfileForm({ ...profileForm, appId: e.target.value })}
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        💡 Obtenha em <a href="https://developers.facebook.com/apps" target="_blank" className="text-[var(--primary)] underline">developers.facebook.com/apps</a>
                                    </p>
                                </div>
                                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                                    ⚠️ <strong>Importante:</strong> Configure o APP_ID apenas uma vez por número. É necessário para fazer upload de mídia ao criar templates com imagem, vídeo ou documento.
                                </div>
                            </div>

                            {/* Display Name */}
                            <div>
                                <label className="block text-sm font-medium mb-2">😊 Nome de exibição</label>
                                <div className="glass p-3 rounded-lg">
                                    <p className="font-medium text-white">{selectedAccount.displayName || selectedAccount.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        ℹ️ O nome de exibição só pode ser alterado pelo Meta Business Manager e requer aprovação.
                                    </p>
                                </div>
                            </div>

                            {/* About */}
                            <div>
                                <label className="block text-sm font-medium mb-2">📝 Sobre sua empresa *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Frase curta sobre sua empresa"
                                    maxLength={139}
                                    value={profileForm.about}
                                    onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1 text-right">
                                    {profileForm.about?.length || 0}/139 caracteres
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium mb-2">📄 Descrição Detalhada</label>
                                <textarea
                                    className="input w-full h-24 resize-none"
                                    placeholder="Descrição completa da sua empresa..."
                                    maxLength={512}
                                    value={profileForm.description}
                                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1 text-right">
                                    {profileForm.description?.length || 0}/512 caracteres
                                </p>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium mb-2">🏢 Categoria do Negócio</label>
                                <select
                                    className="input w-full"
                                    value={profileForm.category}
                                    onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                                >
                                    {BUSINESS_CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Ajuda clientes a encontrar seu negócio
                                </p>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-2">📧 Email Comercial</label>
                                <input
                                    type="email"
                                    className="input w-full"
                                    placeholder="contato@empresa.com"
                                    value={profileForm.email}
                                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Será visível publicamente no perfil
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowConfigProfile(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleUpdateProfile}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Salvando...' : '💾 Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Preview */}
            {showPreview && selectedAccount && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="glass-card p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <button className="text-[var(--text-muted)]">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button className="text-[var(--text-muted)]">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <div className="w-24 h-24 rounded-full bg-[var(--primary)]/30 mx-auto mb-3 flex items-center justify-center text-4xl">
                                🏢
                            </div>
                            <h3 className="text-xl font-semibold text-white">{selectedAccount.displayName || selectedAccount.name}</h3>
                            <p className="text-sm text-[var(--text-muted)]">{selectedAccount.phoneNumber}</p>

                            <button className="btn btn-primary mt-4">
                                🔗 Compartilhar
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🏢</span>
                                <span className="text-sm text-[var(--text-secondary)]">
                                    {BUSINESS_CATEGORIES.find(c => c.value === profileForm.category)?.label || 'Outro'}
                                </span>
                            </div>

                            {profileForm.about && (
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">ℹ️</span>
                                    <span className="text-sm text-[var(--text-secondary)]">{profileForm.about}</span>
                                </div>
                            )}

                            {profileForm.description && (
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">📝</span>
                                    <span className="text-sm text-[var(--text-secondary)]">{profileForm.description}</span>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                            Esta experiência pode variar dependendo do dispositivo.
                        </p>

                        <button
                            className="btn btn-secondary w-full mt-4"
                            onClick={() => setShowPreview(false)}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal - Create Template */}
            {showCreateTemplate && selectedAccount && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="glass-card p-8 w-full max-w-2xl my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">📝 Criar Novo Template</h2>
                            <button
                                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg"
                                onClick={() => setShowCreateTemplate(false)}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nome do Template *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: boas_vindas_cliente"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Use apenas letras minúsculas, números e underscores
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Categoria *</label>
                                    <select
                                        className="input w-full"
                                        value={newTemplate.category}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
                                    >
                                        <option value="MARKETING">Marketing</option>
                                        <option value="UTILITY">Utilitário</option>
                                        <option value="AUTHENTICATION">Autenticação</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Idioma *</label>
                                    <select
                                        className="input w-full"
                                        value={newTemplate.language}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                                    >
                                        {TEMPLATE_LANGUAGES.map((lang) => (
                                            <option key={lang.value} value={lang.value}>{lang.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Corpo da Mensagem *</label>
                                <textarea
                                    className="input w-full h-32 resize-none"
                                    placeholder="Olá {{1}}! Seja bem-vindo à nossa empresa. Estamos felizes em tê-lo conosco."
                                    value={newTemplate.body}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    💡 Use {"{{1}}"}, {"{{2}}"}, etc. para variáveis dinâmicas
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Rodapé (Opcional)</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: Responda SAIR para cancelar"
                                    maxLength={60}
                                    value={newTemplate.footer}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, footer: e.target.value })}
                                />
                            </div>

                            <div className="p-4 glass rounded-xl">
                                <h4 className="font-medium text-white mb-2">📋 Preview</h4>
                                <div className="bg-[#075E54] p-3 rounded-lg text-white text-sm">
                                    {newTemplate.body || 'O corpo da mensagem aparecerá aqui...'}
                                    {newTemplate.footer && (
                                        <p className="text-xs text-white/60 mt-2">{newTemplate.footer}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateTemplate(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateTemplate}
                                    disabled={isSubmitting || !newTemplate.name || !newTemplate.body}
                                >
                                    {isSubmitting ? 'Enviando...' : '📤 Enviar para Aprovação'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
