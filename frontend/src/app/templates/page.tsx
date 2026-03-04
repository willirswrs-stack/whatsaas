'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components';
import { campaignsService, Template } from '@/lib/campaigns';
import { getErrorMessage } from '@/lib/auth';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: '', content: '', category: 'geral' });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const responseData = await campaignsService.listTemplates();
            if (Array.isArray(responseData)) {
                setTemplates(responseData);
            } else if (responseData && typeof responseData === 'object' && Array.isArray((responseData as any).data)) {
                setTemplates((responseData as any).data);
            } else {
                setTemplates([]);
            }
        } catch (err) {
            setError(getErrorMessage(err));
            setTemplates([]);
        } finally {
            setIsLoading(false);
        }
    };

    const createTemplate = async () => {
        if (!newTemplate.name.trim() || !newTemplate.content.trim()) return;

        try {
            // Extrair variáveis do conteúdo
            const variables = (newTemplate.content.match(/\{\{(\w+)\}\}/g) || [])
                .map(v => v.replace(/\{\{|\}\}/g, ''));

            const template = await campaignsService.createTemplate({
                name: newTemplate.name,
                content: newTemplate.content,
                category: newTemplate.category,
                variables
            });
            setTemplates([template, ...templates]);
            setIsCreating(false);
            setNewTemplate({ name: '', content: '', category: 'geral' });
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const filteredTemplates = Array.isArray(templates) ? templates.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    const contentTypeIcons: Record<string, string> = {
        text: '📝',
        image: '🖼️',
        video: '🎬',
        audio: '🎵',
        document: '📄',
        geral: '📝',
    };

    return (
        <div className="animate-fadeIn">
            <Header />

            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/templates.png" alt="Templates" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Templates</h1>
                        <p className="text-[var(--text-muted)]">
                            Gerencie seus templates de mensagens reutilizáveis
                        </p>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsCreating(true)}
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Template
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                    <button className="ml-2 underline" onClick={() => setError('')}>Fechar</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <span className="stat-label">Total de Templates</span>
                    <span className="stat-value">{templates.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Categorias</span>
                    <span className="stat-value">{new Set(templates.map(t => t.category)).size}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Com Variáveis</span>
                    <span className="stat-value">{templates.filter(t => t.variables.length > 0).length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Esta Semana</span>
                    <span className="stat-value">{templates.filter(t => {
                        const date = new Date(t.createdAt);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return date > weekAgo;
                    }).length}</span>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar templates..."
                    className="input w-full max-w-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                /* Templates Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className="glass-card p-6 cursor-pointer hover:border-[var(--primary)] transition-all"
                            onClick={() => setSelectedTemplate(template)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{contentTypeIcons[template.category] || '📝'}</span>
                                    <div>
                                        <h3 className="font-semibold text-white">{template.name}</h3>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            Criado em {new Date(template.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <span className="badge badge-info">{template.category}</span>
                            </div>

                            <div className="glass p-3 rounded-lg mb-4 text-sm text-[var(--text-secondary)]">
                                {template.content.length > 100
                                    ? template.content.substring(0, 100) + '...'
                                    : template.content}
                            </div>

                            {/* Variables */}
                            {template.variables.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {template.variables.map((v) => (
                                        <span
                                            key={v}
                                            className="px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded text-xs"
                                        >
                                            {`{{${v}}}`}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Empty State */}
                    {filteredTemplates.length === 0 && !isLoading && (
                        <div className="col-span-full text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-[var(--text-muted)]">Nenhum template encontrado</p>
                            <button
                                className="btn btn-primary mt-4"
                                onClick={() => setIsCreating(true)}
                            >
                                Criar primeiro template
                            </button>
                        </div>
                    )}

                    {/* Create New Card */}
                    {filteredTemplates.length > 0 && (
                        <div
                            className="glass-card p-6 border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] cursor-pointer transition-all flex flex-col items-center justify-center min-h-[280px]"
                            onClick={() => setIsCreating(true)}
                        >
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <span className="text-[var(--text-muted)]">Criar novo template</span>
                        </div>
                    )}
                </div>
            )}

            {/* Modal - Create Template */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-8 w-full max-w-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Novo Template</h2>
                            <button
                                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg"
                                onClick={() => setIsCreating(false)}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nome do Template</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: Boas-vindas Novo Cliente"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Categoria</label>
                                <select
                                    className="input w-full"
                                    value={newTemplate.category}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                                >
                                    <option value="geral">📝 Geral</option>
                                    <option value="promocao">🔥 Promoção</option>
                                    <option value="boas-vindas">👋 Boas-vindas</option>
                                    <option value="lembrete">⏰ Lembrete</option>
                                    <option value="suporte">💬 Suporte</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Conteúdo da Mensagem</label>
                                <textarea
                                    className="input w-full h-32 resize-none"
                                    placeholder="Digite sua mensagem aqui... Use {{variavel}} para campos dinâmicos"
                                    value={newTemplate.content}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    💡 Variáveis disponíveis: {`{{nome}}`}, {`{{empresa}}`}, {`{{telefone}}`}, {`{{email}}`}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setIsCreating(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={createTemplate}
                                    disabled={!newTemplate.name.trim() || !newTemplate.content.trim()}
                                >
                                    Criar Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - View Template */}
            {selectedTemplate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-8 w-full max-w-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">{selectedTemplate.name}</h2>
                            <button
                                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg"
                                onClick={() => setSelectedTemplate(null)}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Categoria</label>
                                <span className="badge badge-info">{selectedTemplate.category}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Conteúdo</label>
                                <div className="glass p-4 rounded-lg text-[var(--text-secondary)]">
                                    {selectedTemplate.content}
                                </div>
                            </div>

                            {selectedTemplate.variables.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Variáveis</label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTemplate.variables.map((v) => (
                                            <span
                                                key={v}
                                                className="px-3 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded"
                                            >
                                                {`{{${v}}}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedTemplate(null)}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
