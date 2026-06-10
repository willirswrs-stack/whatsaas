'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { adminService } from '@/lib/admin';

export default function AdminTenantsPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Global Super Admin Deep-View States
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Modal State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        planId: '',
        userName: '',
        userEmail: '',
        passwordHash: 'Mudar@123' // Default temp pass
    });

    useEffect(() => {
        fetchTenants();
        fetchPlans();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const data = await adminService.getTenants();
            setTenants(data);
        } catch (error) {
            console.error('Erro ao carregar clientes', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const data = await adminService.getPlans();
            setPlans(data);
        } catch (e) {
            console.warn('Erro ao buscar planos', e);
        }
    };

    const handleOpenDetail = async (id: string) => {
        try {
            setDetailLoading(true);
            const data = await adminService.getTenantDetail(id);
            setSelectedTenant(data);
            setShowDetailModal(true);
        } catch (err) {
            alert('Erro ao carregar detalhes profundos do cliente.');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSavePlan = async (planId: string, billingCycle: string) => {
        if (!selectedTenant) return;
        try {
            setSavingSettings(true);
            await adminService.updateTenantPlan(selectedTenant.id, { planId, billingCycle });
            alert('🎉 Plano de conta vinculado com sucesso!');
            const data = await adminService.getTenantDetail(selectedTenant.id);
            setSelectedTenant(data);
            fetchTenants(); // Refresh grid
        } catch (e) {
            alert('Erro ao vincular plano à conta.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveCadastrais = async (cadastrais: any) => {
        if (!selectedTenant) return;
        try {
            setSavingSettings(true);
            await adminService.updateTenant(selectedTenant.id, {
                settings: {
                    ...selectedTenant.settings,
                    cadastrais
                }
            });
            alert('✅ Dados cadastrais e cadastros financeiros salvos com sucesso!');
            const data = await adminService.getTenantDetail(selectedTenant.id);
            setSelectedTenant(data);
        } catch (e) {
            alert('Erro ao salvar informações cadastrais.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveWarmupSettings = async (warmupSettings: any) => {
        if (!selectedTenant) return;
        try {
            setSavingSettings(true);
            await adminService.updateTenant(selectedTenant.id, {
                settings: {
                    ...selectedTenant.settings,
                    warmupSettings
                }
            });
            alert('🔥 Configurações padrão de maturação salvas com sucesso!');
            const data = await adminService.getTenantDetail(selectedTenant.id);
            setSelectedTenant(data);
        } catch (e) {
            alert('Erro ao salvar configurações de maturação.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleToggleFeature = async (featureKey: string) => {
        if (!selectedTenant) return;
        try {
            const currentFeatures = selectedTenant.settings?.features || {};
            const newFeatures = {
                ...currentFeatures,
                [featureKey]: !currentFeatures[featureKey]
            };
            await adminService.updateTenant(selectedTenant.id, {
                settings: {
                    ...selectedTenant.settings,
                    features: newFeatures
                }
            });
            setSelectedTenant({
                ...selectedTenant,
                settings: {
                    ...selectedTenant.settings,
                    features: newFeatures
                }
            });
        } catch (e) {
            alert('Erro ao alternar funcionalidade global.');
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        if (!confirm(`Deseja realmente alterar o status para ${newStatus.toUpperCase()}?`)) return;

        try {
            await adminService.updateTenantStatus(id, newStatus);
            setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        } catch (err) {
            alert('Erro ao mudar status.');
        }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await adminService.createTenant(formData);
            setShowModal(false);
            setFormData({ name: '', email: '', planId: '', userName: '', userEmail: '', passwordHash: 'Mudar@123' });
            alert('🎉 Novo Cliente e Usuário Master criados com sucesso!');
            fetchTenants(); // Refresh list
        } catch (error: any) {
            alert(error.response?.data?.message || 'Erro ao criar novo cliente.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTenants = tenants.filter(t => 
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            case 'suspended': return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
            case 'trial': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
            default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="animate-fadeIn space-y-6 p-6 relative">
            <Header />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="text-emerald-400">🏢</span> Gestão de Clientes
                    </h1>
                    <p className="text-sm text-[var(--text-muted)]">Administre permissões, planos e status das empresas cadastradas.</p>
                </div>
                
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                    <div className="flex bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden focus-within:border-emerald-500/50 transition-colors w-64 md:w-72">
                        <div className="p-3 text-[var(--text-muted)]">🔍</div>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] flex-1 pr-4"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                    >
                        <span>➕</span> Novo Cliente
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden border-[var(--border-color)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                                <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Empresa / Slug</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">E-mail Titular</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Plano</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase text-center">Membros</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Data Cadastro</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase text-center">Status</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-[var(--text-muted)] animate-pulse">
                                        Carregando banco de dados de clientes...
                                    </td>
                                </tr>
                            ) : filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">
                                        Nenhum cliente encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-emerald-900/20">
                                                    {tenant.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">{tenant.name}</p>
                                                    <p className="text-xs font-mono text-[var(--text-muted)]">{tenant.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">
                                            {tenant.email}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                                                {tenant.plan?.name || 'Sem Plano'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-center">
                                            <span className="bg-[var(--bg-tertiary)] px-2 py-1 rounded text-xs text-[var(--text-secondary)]">
                                                👤 {tenant.users?.length || 0}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-muted)]">
                                            {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusBadge(tenant.status)}`}>
                                                {tenant.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenDetail(tenant.id)}
                                                    disabled={detailLoading}
                                                    className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                                                    title="Administrar Configurações da Conta"
                                                >
                                                    ⚙️ Administrar
                                                </button>
                                                <button 
                                                    onClick={() => toggleStatus(tenant.id, tenant.status)}
                                                    className={`p-2 rounded-lg border transition-all ${
                                                        tenant.status === 'suspended' 
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                    }`}
                                                    title={tenant.status === 'suspended' ? 'Ativar Conta' : 'Suspender Conta'}
                                                >
                                                    {tenant.status === 'suspended' ? '🔓' : '🔒'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* NEW CLIENT MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="glass-card w-full max-w-2xl shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)] border-emerald-500/20 overflow-hidden">
                        <div className="bg-emerald-600/10 border-b border-[var(--border-color)] p-5 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                🚀 Registrar Novo Cliente Manualmente
                            </h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl font-light"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleCreateTenant} className="p-6 space-y-6">
                            
                            {/* Section A: Empresa */}
                            <div>
                                <h3 className="text-emerald-500 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                    Dados da Empresa (Tenant)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Nome da Empresa</label>
                                        <input 
                                            required 
                                            type="text"
                                            placeholder="Ex: Tech Soluções LTDA"
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 outline-none"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Email Empresarial</label>
                                        <input 
                                            required
                                            type="email"
                                            placeholder="empresa@email.com"
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Vincular Plano Inicial</label>
                                        <select 
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 outline-none"
                                            value={formData.planId}
                                            onChange={e => setFormData({...formData, planId: e.target.value})}
                                        >
                                            <option value="" className="text-[var(--text-muted)]">Sem plano (Padrão)</option>
                                            {plans.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} - R$ {p.price}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Usuario Master */}
                            <div className="pt-4 border-t border-[var(--border-color)]">
                                <h3 className="text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                                    Usuário Master (Owner)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Nome Completo</label>
                                        <input 
                                            required 
                                            type="text"
                                            placeholder="Ex: João Silva"
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-cyan-500 outline-none"
                                            value={formData.userName}
                                            onChange={e => setFormData({...formData, userName: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Email de Login</label>
                                        <input 
                                            required
                                            type="email"
                                            placeholder="joao@email.com"
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-cyan-500 outline-none"
                                            value={formData.userEmail}
                                            onChange={e => setFormData({...formData, userEmail: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Senha Provisória</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:border-cyan-500 outline-none"
                                            value={formData.passwordHash}
                                            onChange={e => setFormData({...formData, passwordHash: e.target.value})}
                                        />
                                        <span className="text-[10px] text-[var(--text-muted)] mt-1 inline-block">Entregue essa senha ao cliente para o primeiro acesso.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? 'Criando...' : 'Finalizar e Ativar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDetailModal && selectedTenant && (
                <TenantDetailModal 
                    tenant={selectedTenant} 
                    plans={plans}
                    onClose={() => setShowDetailModal(false)} 
                    onSavePlan={handleSavePlan}
                    onSaveCadastrais={handleSaveCadastrais}
                    onSaveWarmupSettings={handleSaveWarmupSettings}
                    onToggleFeature={handleToggleFeature}
                    saving={savingSettings}
                />
            )}
        </div>
    );
}


// ============================================================================
// SUB-COMPONENTE: DASHBOARD GLOBAL DE ADMINISTRAÇÃO DO CLIENTE (MOCKUP REAL)
// ============================================================================

const availableFeatures = [
    { key: 'campaigns', label: 'Campanhas em Massa', icon: '📣' },
    { key: 'flows', label: 'Fluxos de Automação', icon: '🔄' },
    { key: 'whatsapp_instances', label: 'Múltiplas Instâncias', icon: '📱' },
    { key: 'templates', label: 'Templates de Mensagem', icon: '📝' },
    { key: 'contacts', label: 'Gestão de Contatos', icon: '👥' },
    { key: 'proxies', label: 'Conexões via Proxy', icon: '🛡️' },
    { key: 'webhooks', label: 'Integração Webhooks', icon: '🔔' },
    { key: 'ai_spinner', label: 'AI Spinner (Textos)', icon: '✨', highlight: true },
    { key: 'antiban_warmup', label: 'Anti-Ban & Warmup', icon: '🔥', highlight: true },
    { key: 'agent_ai', label: 'Agent AI (Bot)', icon: '🤖', highlight: true },
    { key: 'multi_tenant', label: 'Multi Empresas', icon: '🏢', highlight: true },
    { key: 'white_label', label: 'White Label / Custom', icon: '🎨', highlight: true },
];

function TenantDetailModal({ tenant, plans, onClose, onSavePlan, onSaveCadastrais, onSaveWarmupSettings, onToggleFeature, saving }: any) {
    const [selectedPlan, setSelectedPlan] = useState(tenant.planId || '');
    const [billingCycle, setBillingCycle] = useState(tenant.settings?.billingCycleOverride || 'monthly');
    const [showRenovacao, setShowRenovacao] = useState(!!tenant.settings?.exibirRenovacao);
    
    const initialCadastrais = tenant.settings?.cadastrais || {
        nomeFantasia: '', cnpjCpf: '', endereco: '', complemento: '', cidade: '', estado: '', cep: '',
        email: '', telefone: '', nomeResponsavel: '', telefoneResponsavel: '', responsavelFinanceiro: '',
        emailFinanceiro: '', notas: ''
    };

    const [localCadastrais, setLocalCadastrais] = useState(initialCadastrais);

    const updateCadastralField = (key: string, val: string) => {
        setLocalCadastrais((prev: any) => ({ ...prev, [key]: val }));
    };

    const initialWarmupSettings = tenant.settings?.warmupSettings || {
        warmupDaysColdOutbound: 60,
        warmupDaysWarmOutbound: 30,
        warmupDaysGroups: 30,
        warmupDaysInbound: 14
    };
    const [localWarmupSettings, setLocalWarmupSettings] = useState(initialWarmupSettings);

    const updateWarmupField = (key: string, val: number) => {
        setLocalWarmupSettings((prev: any) => ({ ...prev, [key]: val }));
    };

    const currentFeatures = tenant.settings?.features || {};

    return (
        <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] overflow-y-auto backdrop-blur-md flex flex-col">
            
            {/* HEADER FLUTUANTE */}
            <header className="sticky top-0 z-10 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-8 py-4 flex items-center justify-between shadow-2xl">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        🖥️ Visualizar #{tenant.id.substring(0, 8)} - <span className="text-indigo-600 dark:text-indigo-400">{tenant.name}</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">ID Completo: {tenant.id} • Cadastrado em: {new Date(tenant.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <button 
                    onClick={onClose}
                    className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                    Fechar Painel
                </button>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8 pb-20">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* COLUNA ESQUERDA: PLANOS & DADOS */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        {/* BLOCO: PLANO DA CONTA */}
                        <div className="glass-card border border-[var(--border-color)] p-5 bg-[var(--bg-card)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                                💳 Plano da Conta
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Plano Selecionado</label>
                                    <select 
                                        value={selectedPlan}
                                        onChange={e => setSelectedPlan(e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-indigo-500 outline-none"
                                    >
                                        <option value="">-- Sem plano --</option>
                                        {plans.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name} (R$ {p.price})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Ciclo de Cobrança</label>
                                    <select 
                                        value={billingCycle}
                                        onChange={e => setBillingCycle(e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-indigo-500 outline-none"
                                    >
                                        <option value="monthly">Mensal</option>
                                        <option value="quarterly">Trimestral</option>
                                        <option value="yearly">Anual</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 py-1">
                                    <input 
                                        type="checkbox" 
                                        id="renovacao"
                                        checked={showRenovacao}
                                        onChange={e => setShowRenovacao(e.target.checked)}
                                        className="rounded border-[var(--border-color)] text-indigo-600 bg-[var(--bg-secondary)] focus:ring-0"
                                    />
                                    <label htmlFor="renovacao" className="text-xs text-[var(--text-secondary)] cursor-pointer">Exibir botão "Renovar Plano" na área do cliente</label>
                                </div>

                                <div className="pt-2">
                                    <button 
                                        onClick={() => onSavePlan(selectedPlan, billingCycle)}
                                        disabled={saving}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg shadow transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? 'Salvando...' : 'Vincular Plano'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO: AÇÕES ADMINISTRATIVAS */}
                        <div className="glass-card border border-[var(--border-color)] p-5 bg-[var(--bg-card)] space-y-4">
                            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-widest border-b border-[var(--border-color)] pb-2">
                                ⚡ Ações & Utilitários
                            </h3>
                            
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Limpar chaves de cache IndexedDB no Redis para esta conta:</p>
                                    <button className="w-full bg-[var(--bg-secondary)] border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 text-xs py-1.5 rounded transition-colors">
                                        Reset Frontend Cache
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-[var(--border-color)]">
                                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Invalidar todos os tokens de sessão atuais:</p>
                                    <button className="w-full bg-[var(--bg-secondary)] border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs py-1.5 rounded transition-colors">
                                        Logout All Users
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-[var(--border-color)]">
                                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Vincular Usuário Administrativo à Conta:</p>
                                    <div className="flex gap-2">
                                        <select className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] text-[var(--text-primary)] px-2 rounded">
                                            <option>-- Selecione Usuário --</option>
                                            {tenant.users?.map((u: any) => (
                                                <option key={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                        <button className="bg-emerald-600 text-[10px] px-2 py-1 rounded text-white">Vincular</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: DADOS CADASTRAIS AMPLOS */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* BLOCO: DADOS CADASTRAIS */}
                        <div className="glass-card border border-[var(--border-color)] p-6 bg-[var(--bg-card)]">
                            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-5 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                                📝 Dados Cadastrais & Financeiros
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Nome Fantasia</label>
                                    <input type="text" value={localCadastrais.nomeFantasia} onChange={e => updateCadastralField('nomeFantasia', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">CNPJ / CPF</label>
                                    <input type="text" value={localCadastrais.cnpjCpf} onChange={e => updateCadastralField('cnpjCpf', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Endereço Completo</label>
                                    <input type="text" value={localCadastrais.endereco} onChange={e => updateCadastralField('endereco', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Complemento</label>
                                    <input type="text" value={localCadastrais.complemento} onChange={e => updateCadastralField('complemento', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Cidade</label>
                                    <input type="text" value={localCadastrais.cidade} onChange={e => updateCadastralField('cidade', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">UF / Estado</label>
                                    <input type="text" value={localCadastrais.estado} onChange={e => updateCadastralField('estado', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">CEP</label>
                                    <input type="text" value={localCadastrais.cep} onChange={e => updateCadastralField('cep', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Email Comercial</label>
                                    <input type="email" value={localCadastrais.email} onChange={e => updateCadastralField('email', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Telefone</label>
                                    <input type="text" value={localCadastrais.telefone} onChange={e => updateCadastralField('telefone', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>

                                <div className="pt-2 md:col-span-3 border-t border-[var(--border-color)] my-1">
                                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Contatos & Responsáveis</span>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Nome Responsável</label>
                                    <input type="text" value={localCadastrais.nomeResponsavel} onChange={e => updateCadastralField('nomeResponsavel', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Tel. Responsável</label>
                                    <input type="text" value={localCadastrais.telefoneResponsavel} onChange={e => updateCadastralField('telefoneResponsavel', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Responsável Financeiro</label>
                                    <input type="text" value={localCadastrais.responsavelFinanceiro} onChange={e => updateCadastralField('responsavelFinanceiro', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Email Financeiro</label>
                                    <input type="email" value={localCadastrais.emailFinanceiro} onChange={e => updateCadastralField('emailFinanceiro', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none" />
                                </div>

                                <div className="md:col-span-3 pt-1">
                                    <label className="block text-[10px] text-[var(--text-muted)] mb-1 uppercase">Notas Internas da Conta</label>
                                    <textarea rows={2} value={localCadastrais.notas} onChange={e => updateCadastralField('notas', e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-2 text-xs text-[var(--text-primary)] focus:border-emerald-600 outline-none font-sans resize-none" placeholder="Escreva observações operacionais..."></textarea>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={() => onSaveCadastrais(localCadastrais)}
                                    disabled={saving}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2 rounded-lg shadow flex items-center justify-center transition-all"
                                >
                                    {saving ? 'Salvando...' : 'Salvar Dados Cadastrais'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOCO DE FEATURE FLAGS E LIMITES (A TELA COMPLETA 3) */}
                <section className="glass-card border border-[var(--border-color)] p-6 bg-[var(--bg-card)] relative">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                                🔑 Painel de Recursos Ativados (Feature Flags)
                            </h3>
                            <p className="text-[10px] text-[var(--text-muted)]">Habilite e desabilite rotas, menus e integrações instantaneamente nesta conta de cliente.</p>
                        </div>

                        {/* LIMITS PREVIEW */}
                        <div className="flex gap-3 bg-[var(--bg-secondary)] p-2 rounded-lg border border-[var(--border-color)]">
                            <div className="text-center px-2">
                                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Agentes</p>
                                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">3</p>
                            </div>
                            <div className="text-center border-l border-[var(--border-color)] px-2">
                                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Instâncias</p>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">5</p>
                            </div>
                            <div className="text-center border-l border-[var(--border-color)] px-2">
                                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Mensagens</p>
                                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">50k</p>
                            </div>
                        </div>
                    </div>

                    {/* GRID DE BOTOES / PILLS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {availableFeatures.map((feat) => {
                            const isActive = !!currentFeatures[feat.key];
                            return (
                                <button
                                    key={feat.key}
                                    onClick={() => onToggleFeature(feat.key)}
                                    className={`
                                        group relative flex items-center gap-2.5 p-2.5 rounded-lg border text-left outline-none transition-all duration-200
                                        ${isActive 
                                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.08)]' 
                                            : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-gray-400'
                                        }
                                        ${feat.highlight ? 'ring-1 ring-amber-500/20' : ''}
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 flex items-center justify-center rounded font-mono text-sm transition-all
                                        ${isActive ? 'bg-emerald-500 text-white shadow' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}
                                    `}>
                                        {feat.icon}
                                    </div>
                                    <div className="flex-1 pr-5">
                                        <span className={`text-[11px] font-semibold leading-tight block transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-300 font-bold' : 'text-[var(--text-secondary)]'}`}>
                                            {feat.label}
                                        </span>
                                        {feat.highlight && (
                                            <span className="text-[8px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wide block">Premium / IA</span>
                                        )}
                                    </div>

                                    {/* STATUS ICON (CHECKMARK) */}
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                        <div className={`
                                            w-4 h-4 rounded-full flex items-center justify-center border transition-all
                                            ${isActive ? 'border-emerald-500 bg-emerald-500 text-[9px] text-black font-bold' : 'border-[var(--border-color)] group-hover:border-gray-500'}
                                        `}>
                                            {isActive ? '✓' : ''}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* BLOCO DE MATURAÇÃO/AQUECIMENTO PADRÃO */}
                <section className="glass-card border border-[var(--border-color)] p-6 bg-[var(--bg-card)] relative">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500"></div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                                🔥 Maturação Padrão (Por Perfil)
                            </h3>
                            <p className="text-[10px] text-[var(--text-muted)]">Defina os dias sugeridos de aquecimento para este cliente quando ele conectar um novo chip.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { key: 'warmupDaysColdOutbound', label: 'Prospecção Fria', icon: '🧊', min: 30, max: 90 },
                            { key: 'warmupDaysWarmOutbound', label: 'Prospecção Quente', icon: '🔥', min: 14, max: 60 },
                            { key: 'warmupDaysGroups', label: 'Aquecimento Grupos', icon: '👥', min: 14, max: 60 },
                            { key: 'warmupDaysInbound', label: 'Receptivo', icon: '📥', min: 7, max: 30 },
                        ].map(profile => {
                            const value = localWarmupSettings[profile.key];
                            const pct = ((value - profile.min) / (profile.max - profile.min)) * 100;
                            return (
                                <div key={profile.key} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{profile.icon}</span>
                                        <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{profile.label}</h4>
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                        <span className="text-[10px] text-[var(--text-muted)]">Dias</span>
                                        <span className="text-xl font-black text-orange-400 font-mono">{value}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={profile.min} max={profile.max} step={1}
                                        value={value}
                                        onChange={e => updateWarmupField(profile.key, parseInt(e.target.value))}
                                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer mt-2"
                                        style={{
                                            background: `linear-gradient(to right, var(--primary) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`
                                        }}
                                    />
                                    <div className="flex justify-between text-[8px] text-[var(--text-muted)] mt-1">
                                        <span>Min: {profile.min}</span>
                                        <span>Max: {profile.max}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={() => onSaveWarmupSettings(localWarmupSettings)}
                            disabled={saving}
                            className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-6 py-2 rounded-lg shadow flex items-center justify-center transition-all"
                        >
                            {saving ? 'Salvando...' : 'Salvar Maturação'}
                        </button>
                    </div>
                </section>

                {/* BLOCO DE INSTÂNCIAS (CHIPS) */}
                <section className="glass-card border border-[var(--border-color)] p-6 bg-[var(--bg-card)] relative">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                                📱 Chips Vinculados ({tenant.instances?.length || 0})
                            </h3>
                            <p className="text-[10px] text-[var(--text-muted)]">Visão geral das conexões de WhatsApp desta conta.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tenant.instances && tenant.instances.length > 0 ? (
                            tenant.instances.map((inst: any) => (
                                <div key={inst.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:border-emerald-500/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">📱</span>
                                            <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{inst.instanceName || inst.name || 'Sem nome'}</h4>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            inst.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                            inst.status === 'connecting' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                            inst.status === 'banned' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                            'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                                        }`}>
                                            {inst.status === 'connected' ? '🟢 Conectado' :
                                             inst.status === 'connecting' ? '🟡 Conectando' :
                                             inst.status === 'banned' ? '🔴 Banido' :
                                             '⚪ Desconectado'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-2 space-y-1">
                                        <p className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">Número:</span> 
                                            <strong className="text-[var(--text-primary)]">{inst.phone || 'Não conectado'}</strong>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">Provedor:</span> 
                                            <strong className="text-[var(--text-primary)] uppercase">{inst.provider || 'evolution'}</strong>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">Maturação:</span> 
                                            <strong className="text-orange-400">{inst.warmupDay || 0} dias</strong>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">Criado em:</span> 
                                            <strong className="text-[var(--text-primary)]">{new Date(inst.createdAt).toLocaleDateString('pt-BR')}</strong>
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-8 text-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] border-dashed">
                                <span className="text-3xl block mb-2 opacity-50">📱</span>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Nenhum chip conectado</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Este cliente ainda não cadastrou nenhum número no WhatsApp.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
