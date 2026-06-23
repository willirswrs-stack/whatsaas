'use client';

import { useState } from 'react';
import { Instance, ChipDetail } from '@/lib/instances';

interface ChipDetailsModalProps {
    instance: Instance;
    onClose: () => void;
    onSave: (details: Partial<ChipDetail>) => void;
}

export function ChipDetailsModal({ instance, onClose, onSave }: ChipDetailsModalProps) {
    const defaultDetails = instance.chipDetail || {};
    
    const [formData, setFormData] = useState({
        carrier: defaultDetails.carrier || '',
        deviceName: defaultDetails.deviceName || '',
        planType: defaultDetails.planType || 'Pre-pago',
        physicalLocation: defaultDetails.physicalLocation || '',
        iccid: defaultDetails.iccid || '',
        rechargeValue: defaultDetails.rechargeValue || 0,
        rechargeDate: defaultDetails.rechargeDate ? defaultDetails.rechargeDate.split('T')[0] : '',
        expirationDate: defaultDetails.expirationDate ? defaultDetails.expirationDate.split('T')[0] : '',
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                ...formData,
                rechargeValue: Number(formData.rechargeValue)
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Detalhes do Chip</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Instância: {instance.instanceName} | +{instance.phone}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors p-2">
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="chip-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Operadora</label>
                            <select 
                                name="carrier" 
                                value={formData.carrier} 
                                onChange={handleChange}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white focus:border-[var(--primary)] outline-none"
                            >
                                <option value="">Selecione...</option>
                                <option value="Vivo">Vivo</option>
                                <option value="Claro">Claro</option>
                                <option value="TIM">TIM</option>
                                <option value="Oi">Oi</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Aparelho</label>
                            <input 
                                type="text" 
                                name="deviceName" 
                                value={formData.deviceName} 
                                onChange={handleChange}
                                placeholder="Ex: Moto G8, iPhone 11"
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white focus:border-[var(--primary)] outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Plano</label>
                            <select 
                                name="planType" 
                                value={formData.planType} 
                                onChange={handleChange}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white focus:border-[var(--primary)] outline-none"
                            >
                                <option value="Pre-pago">Pré-pago</option>
                                <option value="Controle">Controle</option>
                                <option value="Pos-pago">Pós-pago</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Localização Física</label>
                            <input 
                                type="text" 
                                name="physicalLocation" 
                                value={formData.physicalLocation} 
                                onChange={handleChange}
                                placeholder="Ex: Gaveta 3, Lote A"
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white focus:border-[var(--primary)] outline-none"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">ICCID (Serial do Chip)</label>
                            <input 
                                type="text" 
                                name="iccid" 
                                value={formData.iccid} 
                                onChange={handleChange}
                                placeholder="8955..."
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-[var(--primary)] outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Valor da Recarga (R$)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                name="rechargeValue" 
                                value={formData.rechargeValue} 
                                onChange={handleChange}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white focus:border-[var(--primary)] outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Data da Recarga</label>
                            <input 
                                type="date" 
                                name="rechargeDate" 
                                value={formData.rechargeDate} 
                                onChange={handleChange}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white focus:border-[var(--primary)] outline-none [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Data Limite (Validade)</label>
                            <input 
                                type="date" 
                                name="expirationDate" 
                                value={formData.expirationDate} 
                                onChange={handleChange}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-white focus:border-[var(--primary)] outline-none [color-scheme:dark]"
                            />
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="chip-form"
                        disabled={isSaving}
                        className="px-6 py-2 rounded-lg font-medium bg-[var(--primary)] text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Detalhes'}
                    </button>
                </div>

            </div>
        </div>
    );
}
