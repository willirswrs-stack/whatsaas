'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { instancesService, Instance, ChipDetail } from '@/lib/instances';
import { ChipDetailsModal } from './components/ChipDetailsModal';

export default function FarmDashboard() {
    const { user } = useAuth();
    const [instances, setInstances] = useState<Instance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await instancesService.list();
            setInstances(data);
        } catch (error) {
            console.error('Failed to load farm instances:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveChipDetails = async (instanceId: string, details: Partial<ChipDetail>) => {
        try {
            await instancesService.update(instanceId, { chipDetails: details });
            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to update chip details:', error);
            alert('Erro ao salvar os detalhes do chip.');
        }
    };

    const getCarrierLogo = (carrier?: string) => {
        const c = carrier?.toLowerCase() || '';
        if (c.includes('vivo')) return '🟣 Vivo';
        if (c.includes('claro')) return '🔴 Claro';
        if (c.includes('tim')) return '🔵 TIM';
        if (c.includes('oi')) return '🟡 Oi';
        return '📱 ' + (carrier || 'ND');
    };

    const getFlag = (phone?: string) => {
        if (!phone) return '🏳️';
        if (phone.startsWith('55')) return '🇧🇷';
        if (phone.startsWith('1')) return '🇺🇸';
        if (phone.startsWith('351')) return '🇵🇹';
        return '🏳️';
    };

    const calculateMaturationProgress = (day: number) => {
        const target = 60; // Exemplo de target de maturação
        const safeDay = day || 0;
        const progress = Math.min((safeDay / target) * 100, 100);
        let color = 'bg-red-500';
        if (progress > 30) color = 'bg-yellow-500';
        if (progress > 70) color = 'bg-emerald-500';
        return { progress, color, text: `${safeDay}/${target}` };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Farm de Chips (Estoque)
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2">
                        Gerencie seu inventário físico e digital de chips para maturação.
                    </p>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold">Número</th>
                                <th className="p-4 font-semibold">Operadora</th>
                                <th className="p-4 font-semibold">Aparelho / Slot</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Plano</th>
                                <th className="p-4 font-semibold">Recarga / Venc.</th>
                                <th className="p-4 font-semibold">Maturação</th>
                                <th className="p-4 font-semibold text-center">Saúde</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {instances.map((instance) => {
                                const details = instance.chipDetail || {};
                                const mat = calculateMaturationProgress(instance.warmupDay);
                                const isOnline = instance.status === 'connected';

                                return (
                                    <tr key={instance.id} className="hover:bg-[var(--bg-glass)] transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{getFlag(instance.phone)}</span>
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-medium text-[var(--text-primary)]">
                                                        +{instance.phone || 'Sem número'}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted)]">{instance.instanceName}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium">
                                            {getCarrierLogo(details.carrier)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm flex items-center gap-2">
                                                    {details.deviceName || 'Não definido'}
                                                    {details.isInDrawer && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-500 rounded border border-amber-500/30">GAVETA</span>}
                                                </span>
                                                <span className="text-xs text-[var(--text-muted)]">{details.physicalLocation || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="relative flex h-3 w-3">
                                                    {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                </span>
                                                <span className={`text-xs font-semibold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <span className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs">
                                                {details.planType || 'Pós-pago'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col text-sm">
                                                <span className={details.rechargeDate ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>
                                                    R$ {details.rechargeValue || '0,00'}
                                                </span>
                                                <span className="text-xs text-red-400">
                                                    Venc: {details.expirationDate || 'N/D'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="w-24">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>Progresso</span>
                                                    <span>{mat.text}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                    <div className={`h-full ${mat.color}`} style={{ width: `${mat.progress}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center">
                                                <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] border-2 border-emerald-500/50">
                                                    <span className="text-xs font-bold text-emerald-400">{details.healthScore || 100}%</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedInstance(instance);
                                                    setIsModalOpen(true);
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors"
                                            >
                                                Editar Dados
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {instances.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                                        Nenhuma instância encontrada. Crie um chip primeiro no Painel de Chips.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && selectedInstance && (
                <ChipDetailsModal
                    instance={selectedInstance}
                    onClose={() => setIsModalOpen(false)}
                    onSave={(details) => handleSaveChipDetails(selectedInstance.id, details)}
                />
            )}
        </div>
    );
}
