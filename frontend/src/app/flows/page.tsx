'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { flowsApi, foldersApi, Flow, FlowStats, FlowFolder } from '@/lib/flows';

export default function FlowsPage() {
    const [flows, setFlows] = useState<Flow[]>([]);
    const [stats, setStats] = useState<FlowStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [folders, setFolders] = useState<FlowFolder[]>([]);
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<FlowFolder | null>(null);
    const [deletingFolder, setDeletingFolder] = useState<string | null>(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
    const [showDeleteFlowModal, setShowDeleteFlowModal] = useState(false);
    const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

    // Form states
    const [newFlowName, setNewFlowName] = useState('');
    const [newFlowDescription, setNewFlowDescription] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<string>('');
    const [showChannelModal, setShowChannelModal] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<string>('');


    const [activeTab, setActiveTab] = useState<'geral' | 'arquivadas'>('geral');
    const [searchTerm, setSearchTerm] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadFlows = async () => {
        try {
            setLoading(true);
            const [flowsData, statsData, foldersData] = await Promise.all([
                flowsApi.getFlows(),
                flowsApi.getStats(),
                foldersApi.getFolders(),
            ]);
            setFlows(flowsData);
            setStats(statsData);
            setFolders(foldersData);
        } catch (error) {
            console.error('Erro ao carregar fluxos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFlows();
    }, []);

    const handleCreateFlow = async () => {
        if (!newFlowName.trim()) return;
        try {
            const flow = await flowsApi.createFlow({
                name: newFlowName,
                description: newFlowDescription,
                channel: selectedChannel || 'whatsapp-web',
            });
            setShowCreateModal(false);
            setNewFlowName('');
            setNewFlowDescription('');
            setSelectedChannel('');
            window.location.href = `/flows/${flow.id}`;
        } catch (error: any) {
            console.error('Erro ao criar fluxo:', error);
            alert(error.response?.data?.message || 'Erro ao criar fluxo');
        }
    };

    const handleDeleteFlowClick = (id: string) => {
        setFlowToDelete(id);
        setShowDeleteFlowModal(true);
    };

    const handleConfirmDeleteFlow = async () => {
        if (!flowToDelete) return;

        try {
            setDeleting(flowToDelete);
            await flowsApi.deleteFlow(flowToDelete);
            setFlows(prev => prev.filter(f => f.id !== flowToDelete));
            loadFlows();
        } catch (error: any) {
            console.error('Erro ao excluir fluxo:', error);
            alert(error.response?.data?.message || 'Erro ao excluir fluxo. Verifique se você tem permissão.');
        } finally {
            setDeleting(null);
            setShowDeleteFlowModal(false);
            setFlowToDelete(null);
        }
    };

    const handleDuplicateFlow = async (id: string) => {
        try {
            await flowsApi.duplicateFlow(id);
            loadFlows();
        } catch (error: any) {
            console.error('Erro ao duplicar fluxo:', error);
            alert(error.response?.data?.message || 'Erro ao duplicar fluxo');
        }
    };

    const handleToggleStatus = async (flow: Flow) => {
        try {
            if (flow.status === 'active') {
                await flowsApi.pauseFlow(flow.id);
            } else {
                await flowsApi.activateFlow(flow.id);
            }
            loadFlows();
        } catch (error: any) {
            console.error('Erro ao alterar status:', error);
            alert(error.response?.data?.message || 'Erro ao alterar status');
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            return;
        }
        try {
            setCreatingFolder(true);
            await foldersApi.createFolder({ name: newFolderName });
            setShowFolderModal(false);
            setNewFolderName('');
            // Reload folders
            const foldersData = await foldersApi.getFolders();
            setFolders(foldersData);
        } catch (error: any) {
            console.error('Erro ao criar pasta:', error);
            alert(error.response?.data?.message || 'Erro ao criar pasta');
        } finally {
            setCreatingFolder(false);
        }
    };

    const handleDeleteFolderClick = (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setFolderToDelete(folderId);
        setShowDeleteFolderModal(true);
    };

    const handleConfirmDeleteFolder = async () => {
        if (!folderToDelete) return;

        try {
            setDeletingFolder(folderToDelete);
            await foldersApi.deleteFolder(folderToDelete);
            setFolders(prev => prev.filter(f => f.id !== folderToDelete));
            if (selectedFolder?.id === folderToDelete) {
                setSelectedFolder(null);
            }
        } catch (error: any) {
            console.error('Erro ao excluir:', error);
            alert(error.response?.data?.message || error.message || 'Erro ao excluir pasta');
        } finally {
            setDeletingFolder(null);
            setShowDeleteFolderModal(false);
            setFolderToDelete(null);
        }
    };

    const handleMoveToFolder = async (flowId: string, folderId: string | null) => {
        try {
            await flowsApi.updateFlow(flowId, { folderId });
            loadFlows();
        } catch (error: any) {
            console.error('Erro ao mover fluxo:', error);
            alert(error.response?.data?.message || error.message || 'Erro ao mover fluxo para pasta');
        }
    };

    const handleFolderClick = (folder: FlowFolder) => {
        if (selectedFolder?.id === folder.id) {
            setSelectedFolder(null); // Deseleciona
        } else {
            setSelectedFolder(folder); // Seleciona
        }
    };

    const handleImportFlow = async () => {
        try {
            let flowData: any;

            if (importFile) {
                const text = await importFile.text();
                flowData = JSON.parse(text);
            } else if (importData.trim()) {
                flowData = JSON.parse(importData);
            } else {
                alert('Selecione um arquivo ou cole o JSON do fluxo');
                return;
            }

            // Create new flow with imported data
            const flow = await flowsApi.createFlow({
                name: flowData.name || 'Fluxo Importado',
                description: flowData.description || 'Importado via JSON',
            });

            // Update with nodes and edges
            if (flowData.nodes || flowData.edges) {
                await flowsApi.updateFlow(flow.id, {
                    nodes: flowData.nodes || [],
                    edges: flowData.edges || [],
                });
            }

            setShowImportModal(false);
            setImportFile(null);
            setImportData('');
            loadFlows();
            alert('Fluxo importado com sucesso!');
        } catch (error: any) {
            console.error('Erro ao importar fluxo:', error);
            alert('Erro ao importar fluxo. Verifique se o JSON está válido.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImportFile(file);
            setImportData('');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700',
            draft: 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700',
            paused: 'px-2 py-1 text-xs rounded-full bg-red-100 text-red-700',
            archived: 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700',
        };
        const labels: Record<string, string> = {
            active: 'Ativo',
            draft: 'Rascunho',
            paused: 'Pausado',
            archived: 'Arquivado',
        };
        return <span className={styles[status] || 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700'}>{labels[status] || status}</span>;
    };

    const filteredFlows = flows.filter(flow => {
        const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'geral' ? flow.status !== 'archived' : flow.status === 'archived';
        const matchesFolder = selectedFolder
            ? (flow as any).folderId === selectedFolder.id
            : true; // Se nenhuma pasta selecionada, mostra todos
        return matchesSearch && matchesTab && matchesFolder;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[var(--bg-primary)]">
            {/* Header */}
            <div className="bg-white dark:bg-[var(--bg-secondary)] border-b border-gray-200 dark:border-[var(--border-color)] px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/icons/sidebar/flows.png" alt="Fluxos" className="w-10 h-10 object-contain drop-shadow-md" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Fluxos</h1>
                        <button
                            onClick={() => setShowChannelModal(true)}
                            className="px-4 py-2 bg-[#22c55e] text-white rounded-full font-semibold text-sm hover:bg-[#16a34a] transition-colors"
                        >
                            CRIAR
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                            Fluxos são utilizados para criar sequência de mensagens com o público, alimentar seus funis para uma visualização analítica do negócio
                        </p>
                    </div>
                    <button className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg font-medium text-sm hover:bg-[#7c3aed] transition-colors flex items-center gap-2">
                        <span>❓</span>
                        Como funciona?
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-[var(--bg-secondary)] border-b border-gray-200 dark:border-[var(--border-color)] px-6">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('geral')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'geral'
                            ? 'border-[#14b8a6] text-[#14b8a6]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('arquivadas')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'arquivadas'
                            ? 'border-[#14b8a6] text-[#14b8a6]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Pastas arquivadas
                    </button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-[#14b8a6] font-medium text-sm">Meus Fluxos</span>
                    <input
                        type="text"
                        placeholder="🔍 Buscar fluxo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)] w-64"
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFolderModal(true)}
                        className="px-4 py-2 border-2 border-[#14b8a6] text-[#14b8a6] rounded-lg font-medium text-sm hover:bg-[#14b8a6]/10 transition-colors flex items-center gap-2"
                    >
                        <span>📁</span>
                        NOVA PASTA
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="px-4 py-2 border-2 border-[#14b8a6] text-[#14b8a6] rounded-lg font-medium text-sm hover:bg-[#14b8a6]/10 transition-colors flex items-center gap-2"
                    >
                        <span>📥</span>
                        IMPORTAR FLUXO
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
                {/* Folders Section */}
                {folders.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">📁 Pastas</h3>
                            {selectedFolder && (
                                <button
                                    onClick={() => setSelectedFolder(null)}
                                    className="text-sm text-[#14b8a6] hover:underline"
                                >
                                    ← Voltar para todos
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {folders.map(folder => (
                                <div
                                    key={folder.id}
                                    onClick={() => handleFolderClick(folder)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const flowId = e.dataTransfer.getData('flowId');
                                        if (flowId) handleMoveToFolder(flowId, folder.id);
                                    }}
                                    className={`group flex items-center gap-2 px-4 py-2 rounded-lg border transition-all cursor-pointer ${selectedFolder?.id === folder.id
                                        ? 'bg-[#14b8a6] text-white border-[#14b8a6]'
                                        : 'bg-white dark:bg-[var(--bg-glass)] border-gray-200 dark:border-[var(--border-color)] hover:shadow-md hover:border-[#14b8a6]'
                                        }`}
                                >
                                    <span>{selectedFolder?.id === folder.id ? '📂' : '📁'}</span>
                                    <span className="font-medium">{folder.name}</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleDeleteFolderClick(folder.id, e);
                                        }}
                                        className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${selectedFolder?.id === folder.id
                                            ? 'text-white/70 hover:text-white'
                                            : 'text-red-400 hover:text-red-600'
                                            }`}
                                        title="Excluir pasta"
                                    >
                                        {deletingFolder === folder.id ? '...' : '🗑️'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {selectedFolder && (
                            <p className="mt-3 text-sm text-gray-500">
                                Mostrando fluxos da pasta <strong>{selectedFolder.name}</strong>.
                                Arraste um fluxo para outra pasta para movê-lo.
                            </p>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Carregando...</div>
                ) : filteredFlows.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-64 h-64 mb-8 relative">
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                                <ellipse cx="100" cy="180" rx="80" ry="15" fill="#e5e7eb" opacity="0.5" />
                                <rect x="60" y="80" width="80" height="70" rx="10" fill="#14b8a6" />
                                <rect x="65" y="85" width="70" height="60" rx="8" fill="#0d9488" />
                                <rect x="55" y="35" width="90" height="55" rx="12" fill="#14b8a6" />
                                <rect x="60" y="40" width="80" height="45" rx="10" fill="#0d9488" />
                                <circle cx="80" cy="60" r="12" fill="white" />
                                <circle cx="120" cy="60" r="12" fill="white" />
                                <circle cx="82" cy="62" r="6" fill="#1f2937" />
                                <circle cx="122" cy="62" r="6" fill="#1f2937" />
                                <line x1="100" y1="35" x2="100" y2="20" stroke="#14b8a6" strokeWidth="4" />
                                <circle cx="100" cy="15" r="8" fill="#8b5cf6" />
                                <rect x="35" y="90" width="25" height="12" rx="6" fill="#14b8a6" />
                                <rect x="140" y="90" width="25" height="12" rx="6" fill="#14b8a6" />
                                <rect x="70" y="150" width="15" height="30" rx="5" fill="#14b8a6" />
                                <rect x="115" y="150" width="15" height="30" rx="5" fill="#14b8a6" />
                                <circle cx="165" cy="50" r="5" fill="#fbbf24" />
                                <circle cx="35" cy="70" r="4" fill="#ec4899" />
                                <rect x="150" cy="100" width="8" height="8" fill="#8b5cf6" transform="rotate(45 154 104)" />
                                <rect x="155" y="30" width="30" height="20" rx="5" fill="#e5e7eb" />
                                <polygon points="155,45 150,55 165,45" fill="#e5e7eb" />
                                <rect x="10" y="45" width="25" height="15" rx="4" fill="#e5e7eb" />
                                <polygon points="35,55 40,62 28,55" fill="#e5e7eb" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                            Crie seu primeiro fluxo
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                            Defina as mensagens que serão enviadas pelo fluxo.
                        </p>
                        <button
                            onClick={() => setShowChannelModal(true)}
                            className="px-6 py-3 bg-[#14b8a6] text-white rounded-lg font-semibold hover:bg-[#0d9488] transition-colors"
                        >
                            Criar primeiro fluxo
                        </button>
                    </div>
                ) : (
                    /* Flows Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFlows.map(flow => (
                            <div
                                key={flow.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('flowId', flow.id);
                                }}
                                className="bg-white dark:bg-[var(--bg-glass)] rounded-xl p-4 border border-gray-200 dark:border-[var(--border-color)] hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1 text-gray-800 dark:text-white">{flow.name}</h3>
                                        {flow.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {flow.description}
                                            </p>
                                        )}
                                    </div>
                                    {getStatusBadge(flow.status)}
                                </div>

                                <div className="flex gap-4 mb-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">Nós: </span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{flow.nodes.length}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Execuções: </span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{flow.executionCount}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-[var(--border-color)]">
                                    <Link
                                        href={`/flows/${flow.id}`}
                                        className="flex-1 py-2 text-sm text-center bg-[#14b8a6] text-white rounded-lg hover:bg-[#0d9488] transition-colors"
                                    >
                                        Editar
                                    </Link>
                                    <button
                                        onClick={() => handleToggleStatus(flow)}
                                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-[var(--bg-glass)] rounded-lg hover:bg-gray-200 transition-colors"
                                        title={flow.status === 'active' ? 'Pausar' : 'Ativar'}
                                    >
                                        {flow.status === 'active' ? '⏸️' : '▶️'}
                                    </button>
                                    <button
                                        onClick={() => handleDuplicateFlow(flow.id)}
                                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-[var(--bg-glass)] rounded-lg hover:bg-gray-200 transition-colors"
                                        title="Duplicar"
                                    >
                                        📋
                                    </button>
                                    <button
                                        onClick={() => handleDeleteFlowClick(flow.id)}
                                        disabled={deleting === flow.id}
                                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-[var(--bg-glass)] rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                                        title="Excluir"
                                    >
                                        {deleting === flow.id ? '...' : '🗑️'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Channel Selection Modal - Premium Design with 3D Icons */}
            {showChannelModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#1a1a2e] rounded-3xl w-full max-w-xl p-8 m-4 shadow-2xl border border-gray-200 dark:border-gray-800">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Selecione o canal
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                    Escolha qual plataforma vai utilizar no fluxo
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowChannelModal(false);
                                    setSelectedChannel('');
                                }}
                                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Channel Grid with 3D Icons */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {/* WhatsApp Web */}
                            <button
                                onClick={() => setSelectedChannel('whatsapp-web')}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${selectedChannel === 'whatsapp-web'
                                    ? 'border-[#25D366] bg-[#25D366]/10 dark:bg-[#25D366]/20 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[#25D366]/60 hover:shadow-md'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                                    <img src="/icons/whatsapp.jpg" alt="WhatsApp" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <span className="font-semibold text-gray-900 dark:text-white block">WhatsApp Web</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">API não-oficial</span>
                                </div>
                                {selectedChannel === 'whatsapp-web' && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* WhatsApp Meta */}
                            <button
                                onClick={() => setSelectedChannel('whatsapp-meta')}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${selectedChannel === 'whatsapp-meta'
                                    ? 'border-[#0668E1] bg-[#0668E1]/10 dark:bg-[#0668E1]/20 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[#0668E1]/60 hover:shadow-md'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                                    <img src="/icons/meta.jpg" alt="Meta" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <span className="font-semibold text-gray-900 dark:text-white block">WhatsApp Meta</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">API oficial</span>
                                </div>
                                {selectedChannel === 'whatsapp-meta' && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#0668E1] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* Telegram */}
                            <button
                                onClick={() => setSelectedChannel('telegram')}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${selectedChannel === 'telegram'
                                    ? 'border-[#0088CC] bg-[#0088CC]/10 dark:bg-[#0088CC]/20 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[#0088CC]/60 hover:shadow-md'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                                    <img src="/icons/telegram.jpg" alt="Telegram" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <span className="font-semibold text-gray-900 dark:text-white block">Telegram</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Bot API</span>
                                </div>
                                {selectedChannel === 'telegram' && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#0088CC] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* Instagram */}
                            <button
                                onClick={() => setSelectedChannel('instagram')}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${selectedChannel === 'instagram'
                                    ? 'border-[#E4405F] bg-[#E4405F]/10 dark:bg-[#E4405F]/20 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[#E4405F]/60 hover:shadow-md'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                                    <img src="/icons/instagram.jpg" alt="Instagram" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <span className="font-semibold text-gray-900 dark:text-white block">Instagram</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">DM & Stories</span>
                                </div>
                                {selectedChannel === 'instagram' && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-[#833AB4] to-[#E4405F] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* Messenger */}
                            <button
                                onClick={() => setSelectedChannel('messenger')}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${selectedChannel === 'messenger'
                                    ? 'border-[#0084FF] bg-[#0084FF]/10 dark:bg-[#0084FF]/20 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[#0084FF]/60 hover:shadow-md'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                                    <img src="/icons/messenger.jpg" alt="Messenger" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <span className="font-semibold text-gray-900 dark:text-white block">Messenger</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Facebook Chat</span>
                                </div>
                                {selectedChannel === 'messenger' && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-[#0084FF] to-[#A033FF] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* SMS */}
                            <button
                                onClick={() => setSelectedChannel('sms')}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${selectedChannel === 'sms'
                                    ? 'border-[#10B981] bg-[#10B981]/10 dark:bg-[#10B981]/20 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[#10B981]/60 hover:shadow-md'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                                    <img src="/icons/sms.jpg" alt="SMS" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <span className="font-semibold text-gray-900 dark:text-white block">SMS</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Mensagem de texto</span>
                                </div>
                                {selectedChannel === 'sms' && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* Email - Full Width */}
                            <button
                                onClick={() => setSelectedChannel('email')}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] col-span-2 ${selectedChannel === 'email'
                                    ? 'border-[#EA4335] bg-[#EA4335]/10 dark:bg-[#EA4335]/20 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[#EA4335]/60 hover:shadow-md'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                                    <img src="/icons/email.jpg" alt="Email" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left flex-1">
                                    <span className="font-semibold text-gray-900 dark:text-white block">Email</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Campanhas de email marketing</span>
                                </div>
                                {selectedChannel === 'email' && (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-[#EA4335] to-[#FBBC04] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={() => {
                                if (selectedChannel) {
                                    setShowChannelModal(false);
                                    setShowCreateModal(true);
                                }
                            }}
                            className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-300 ${selectedChannel
                                ? 'bg-gradient-to-r from-[#14b8a6] to-[#0d9488] hover:from-[#0d9488] hover:to-[#0f766e] shadow-lg hover:shadow-xl hover:scale-[1.01]'
                                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }`}
                            disabled={!selectedChannel}
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            )}

            {/* Create Flow Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl w-full max-w-md p-6 m-4 shadow-2xl border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Novo Fluxo</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nome do Fluxo *</label>
                                <input
                                    type="text"
                                    value={newFlowName}
                                    onChange={(e) => setNewFlowName(e.target.value)}
                                    placeholder="Ex: Boas-vindas, Suporte, Vendas..."
                                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Descrição</label>
                                <textarea
                                    value={newFlowDescription}
                                    onChange={(e) => setNewFlowDescription(e.target.value)}
                                    placeholder="Descreva o objetivo deste fluxo..."
                                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 outline-none transition-all resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateFlow}
                                className="px-6 py-2.5 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white rounded-xl font-semibold hover:from-[#0d9488] hover:to-[#0f766e] transition-all shadow-lg shadow-[#14b8a6]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!newFlowName.trim()}
                            >
                                Criar e Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Folder Modal */}
            {showFolderModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md p-6 m-4 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Nova Pasta</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nome da Pasta *</label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Ex: Vendas, Suporte, Marketing..."
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-gray-800 dark:text-white placeholder-gray-400"
                                    autoFocus
                                />
                            </div>
                            <p className="text-sm text-gray-500">
                                As pastas ajudam a organizar seus fluxos por categoria ou projeto.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowFolderModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="px-6 py-2 bg-[#14b8a6] text-white rounded-lg font-medium hover:bg-[#0d9488] transition-colors disabled:opacity-50"
                                disabled={!newFolderName.trim()}
                            >
                                Criar Pasta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Flow Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl w-full max-w-lg p-6 m-4 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Importar Fluxo</h2>
                        <div className="space-y-4">
                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                    Selecionar Arquivo JSON
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 dark:border-[var(--border-color)] rounded-lg p-6 text-center cursor-pointer hover:border-[#14b8a6] transition-colors"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div className="text-4xl mb-2">📄</div>
                                    {importFile ? (
                                        <p className="text-[#14b8a6] font-medium">{importFile.name}</p>
                                    ) : (
                                        <p className="text-gray-500">Clique para selecionar um arquivo .json</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-[var(--border-color)]"></div>
                                <span className="text-sm text-gray-500">ou</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-[var(--border-color)]"></div>
                            </div>

                            {/* JSON Paste */}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    Colar JSON do Fluxo
                                </label>
                                <textarea
                                    value={importData}
                                    onChange={(e) => {
                                        setImportData(e.target.value);
                                        setImportFile(null);
                                    }}
                                    placeholder='{"name": "Meu Fluxo", "nodes": [...], "edges": [...]}'
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-gray-800 dark:text-white resize-none font-mono text-sm"
                                    rows={5}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportFile(null);
                                    setImportData('');
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImportFlow}
                                className="px-6 py-2 bg-[#14b8a6] text-white rounded-lg font-medium hover:bg-[#0d9488] transition-colors disabled:opacity-50"
                                disabled={!importFile && !importData.trim()}
                            >
                                Importar Fluxo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Folder Confirmation Modal */}
            {showDeleteFolderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-[var(--border-color)]">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                            ⚠️ Excluir Pasta
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Tem certeza que deseja excluir esta pasta? Os fluxos dentro dela serão movidos para fora.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteFolderModal(false);
                                    setFolderToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDeleteFolder}
                                disabled={deletingFolder !== null}
                                className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {deletingFolder ? 'Excluindo...' : 'Excluir Pasta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Flow Confirmation Modal */}
            {showDeleteFlowModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-[var(--border-color)]">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                            ⚠️ Excluir Fluxo
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteFlowModal(false);
                                    setFlowToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDeleteFlow}
                                disabled={deleting !== null}
                                className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Excluindo...' : 'Excluir Fluxo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
