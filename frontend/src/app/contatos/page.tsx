'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { contactsApi, Contact, Tag, ContactStats, ContactQueryParams, CustomField } from '@/lib/contacts';

export default function ContactsPage() {
    // State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [stats, setStats] = useState<ContactStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [bulkSelectedTags, setBulkSelectedTags] = useState<string[]>([]); // For bulk actions
    const [filterCategory, setFilterCategory] = useState('');
    const [filterOptedOut, setFilterOptedOut] = useState<boolean | undefined>(undefined);

    // Selection
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    // Modals
    const [showContactModal, setShowContactModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showBulkTagModal, setShowBulkTagModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);

    // Form state for contact modal
    const [formData, setFormData] = useState({
        phone: '',
        name: '',
        email: '',
        category: '',
        tagIds: [] as string[],
        customFields: {} as Record<string, any>,
    });

    // Form state for tag modal
    const [tagFormData, setTagFormData] = useState({
        name: '',
        color: '#a855f7',
        description: '',
    });

    // Load data
    const loadContacts = useCallback(async () => {
        try {
            setLoading(true);
            const params: ContactQueryParams = {
                page,
                limit: 25,
                search: search || undefined,
                tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
                category: filterCategory || undefined,
                optedOut: filterOptedOut,
            };
            const response = await contactsApi.getContacts(params);
            setContacts(response.data);
            setTotal(response.total);
            setTotalPages(response.totalPages);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar contatos');
        } finally {
            setLoading(false);
        }
    }, [page, search, selectedTagIds, filterCategory, filterOptedOut]);

    const loadTags = async () => {
        try {
            const data = await contactsApi.getTags();
            setTags(data);
        } catch (err) {
            console.error('Erro ao carregar tags:', err);
        }
    };

    const loadCustomFields = async () => {
        try {
            const data = await contactsApi.getCustomFields();
            setCustomFields(data);
        } catch (err) {
            console.error('Erro ao carregar campos:', err);
        }
    };

    const loadStats = async () => {
        try {
            const data = await contactsApi.getStats();
            setStats(data);
        } catch (err) {
            console.error('Erro ao carregar estatísticas:', err);
        }
    };

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    useEffect(() => {
        loadTags();
        loadCustomFields();
        loadStats();
    }, []);

    // Handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadContacts();
    };

    const handleSelectContact = (id: string) => {
        const newSelected = new Set(selectedContacts);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedContacts(newSelected);
        setSelectAll(newSelected.size === contacts.length);
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedContacts(new Set());
        } else {
            setSelectedContacts(new Set(contacts.map(c => c.id)));
        }
        setSelectAll(!selectAll);
    };

    const handleCreateContact = () => {
        setEditingContact(null);
        setFormData({ phone: '', name: '', email: '', category: '', tagIds: [], customFields: {} });
        setShowContactModal(true);
    };

    const handleEditContact = (contact: Contact) => {
        setEditingContact(contact);
        setFormData({
            phone: contact.phone,
            name: contact.name || '',
            email: contact.email || '',
            category: contact.category || '',
            tagIds: contact.tags.map(t => t.id),
            customFields: contact.customFields || {},
        });
        setShowContactModal(true);
    };

    const handleSaveContact = async () => {
        try {
            if (editingContact) {
                await contactsApi.updateContact(editingContact.id, formData);
            } else {
                await contactsApi.createContact(formData);
            }
            setShowContactModal(false);
            loadContacts();
            loadStats();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao salvar contato');
        }
    };

    const handleDeleteContact = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este contato?')) return;
        try {
            await contactsApi.deleteContact(id);
            loadContacts();
            loadStats();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao excluir contato');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedContacts.size === 0) return;
        if (!confirm(`Excluir ${selectedContacts.size} contatos?`)) return;
        try {
            await contactsApi.bulkDeleteContacts(Array.from(selectedContacts));
            setSelectedContacts(new Set());
            loadContacts();
            loadStats();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao excluir contatos');
        }
    };

    const handleCreateTag = () => {
        setEditingTag(null);
        setTagFormData({ name: '', color: '#a855f7', description: '' });
        setShowTagModal(true);
    };

    const handleEditTag = (tag: Tag) => {
        setEditingTag(tag);
        setTagFormData({
            name: tag.name,
            color: tag.color,
            description: tag.description || '',
        });
        setShowTagModal(true);
    };

    const handleSaveTag = async () => {
        try {
            if (editingTag) {
                await contactsApi.updateTag(editingTag.id, tagFormData);
            } else {
                await contactsApi.createTag(tagFormData);
            }
            setShowTagModal(false);
            loadTags();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao salvar tag');
        }
    };

    const handleDeleteTag = async (id: string) => {
        if (!confirm('Excluir esta tag?')) return;
        try {
            await contactsApi.deleteTag(id);
            loadTags();
            loadContacts();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao excluir tag');
        }
    };

    const handleBulkAddTags = async (tagIds: string[]) => {
        try {
            await contactsApi.bulkAddTags(Array.from(selectedContacts), tagIds);
            setShowBulkTagModal(false);
            setSelectedContacts(new Set());
            loadContacts();
            loadTags();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao adicionar tags');
        }
    };

    const handleExport = async () => {
        try {
            const data = await contactsApi.exportContacts(selectedTagIds);
            const csv = convertToCSV(data);
            downloadCSV(csv, 'contatos.csv');
        } catch (err: any) {
            alert('Erro ao exportar contatos');
        }
    };

    const convertToCSV = (data: Contact[]) => {
        const headers = ['Telefone', 'Nome', 'Email', 'Categoria', 'Tags', 'Válido', 'Criado em'];
        const rows = data.map(c => [
            c.phone,
            c.name || '',
            c.email || '',
            c.category || '',
            c.tags.map(t => t.name).join('; '),
            c.isValid ? 'Sim' : 'Não',
            new Date(c.createdAt).toLocaleDateString('pt-BR'),
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    };

    const downloadCSV = (csv: string, filename: string) => {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    const handleImport = async (file: File) => {
        try {
            const result = await contactsApi.importContactsFile(file);
            alert(`Processamento Concluído!\n\nImportados/Atualizados: ${result.imported}\nPulados (Duplicados): ${result.skipped || 0}\nErros: ${result.errors?.length || 0}`);

            if (result.errors?.length > 0) {
                console.warn('Erros na importação:', result.errors);
            }

            setShowImportModal(false);
            loadContacts();
            loadStats();
        } catch (err: any) {
            console.error('Erro ao importar:', err);
            alert('Erro ao importar contatos: ' + (err.response?.data?.message || err.message));
        }
    };

    const formatPhone = (phone: string) => {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 13) {
            return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
        }
        return phone;
    };

    const tagColors = [
        '#a855f7', '#6366f1', '#3b82f6', '#22c55e', '#f59e0b',
        '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6', '#f97316',
    ];

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Contatos</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {total.toLocaleString()} contatos cadastrados
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                        <span>Importar</span>
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        <span>Exportar</span>
                    </button>
                    <button className="btn btn-primary" onClick={handleCreateContact}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Novo Contato</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="stat-card">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">{stats.total.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Válidos</span>
                        <span className="stat-value text-[var(--accent-success)]">{stats.valid.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">No WhatsApp</span>
                        <span className="stat-value text-[var(--whatsapp)]">{stats.onWhatsapp.toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Opt-out</span>
                        <span className="stat-value text-[var(--accent-warning)]">{stats.optedOut.toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por nome, telefone ou email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input w-full pl-10"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                        </div>
                    </form>

                    {/* Category Filter */}
                    <div className="w-[200px]">
                        <input
                            type="text"
                            placeholder="Filtrar categoria..."
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    {/* Tag Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-secondary)]">Tags:</span>
                        <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 5).map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => {
                                        if (selectedTagIds.includes(tag.id)) {
                                            setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                                        } else {
                                            setSelectedTagIds([...selectedTagIds, tag.id]);
                                        }
                                        setPage(1);
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedTagIds.includes(tag.id)
                                        ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)]'
                                        : 'opacity-60 hover:opacity-100'
                                        }`}
                                    style={{
                                        backgroundColor: `${tag.color}20`,
                                        color: tag.color,
                                        borderColor: tag.color,
                                    }}
                                >
                                    {tag.name}
                                </button>
                            ))}
                            <button
                                onClick={handleCreateTag}
                                className="px-2 py-1 rounded-full text-xs border border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                            >
                                + Tag
                            </button>
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {(search || selectedTagIds.length > 0) && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setSelectedTagIds([]);
                                setFilterCategory('');
                                setPage(1);
                            }}
                            className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)]"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedContacts.size > 0 && (
                <div className="glass-card p-4 mb-4 flex items-center justify-between">
                    <span className="text-sm">
                        <strong>{selectedContacts.size}</strong> contatos selecionados
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowBulkTagModal(true)}
                            className="btn btn-secondary text-sm py-2"
                        >
                            Adicionar Tags
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="btn btn-ghost text-sm py-2 text-[var(--accent-danger)]"
                        >
                            Excluir Selecionados
                        </button>
                    </div>
                </div>
            )}

            {/* Contacts Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th className="w-10">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded"
                                />
                            </th>
                            <th>Contato</th>
                            <th>Categoria</th>
                            <th>Tags</th>
                            <th>Status</th>
                            <th>Adicionado</th>
                            <th className="w-20">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-[var(--text-muted)]">
                                    Carregando...
                                </td>
                            </tr>
                        ) : contacts.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-[var(--text-muted)]">
                                    Nenhum contato encontrado
                                </td>
                            </tr>
                        ) : (
                            contacts.map(contact => (
                                <tr key={contact.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedContacts.has(contact.id)}
                                            onChange={() => handleSelectContact(contact.id)}
                                            className="w-4 h-4 rounded"
                                        />
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                                                {contact.name?.charAt(0).toUpperCase() || contact.phone.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{contact.name || 'Sem nome'}</p>
                                                <p className="text-sm text-[var(--text-muted)]">{formatPhone(contact.phone)}</p>
                                                {contact.email && (
                                                    <p className="text-xs text-[var(--text-muted)]">{contact.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-sm">{contact.category || '-'}</span>
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {contact.tags.map(tag => (
                                                <span
                                                    key={tag.id}
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: `${tag.color}20`,
                                                        color: tag.color,
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        {contact.optedOut ? (
                                            <span className="badge badge-warning">Opt-out</span>
                                        ) : contact.isValid ? (
                                            <span className="badge badge-success">Válido</span>
                                        ) : (
                                            <span className="badge badge-error">Inválido</span>
                                        )}
                                    </td>
                                    <td className="text-sm text-[var(--text-muted)]">
                                        {new Date(contact.createdAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditContact(contact)}
                                                className="p-2 rounded-lg hover:bg-[var(--bg-glass)] transition-colors"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteContact(contact.id)}
                                                className="p-2 rounded-lg hover:bg-[var(--bg-glass)] transition-colors"
                                                title="Excluir"
                                            >
                                                <svg className="w-4 h-4 text-[var(--accent-danger)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3,6 5,6 21,6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-[var(--text-muted)]">
                        Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn btn-secondary py-2 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="btn btn-secondary py-2 disabled:opacity-50"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}

            {/* Contact Modal */}
            {showContactModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card w-full max-w-lg p-6 m-4 animate-fadeIn">
                        <h2 className="text-xl font-bold mb-4">
                            {editingContact ? 'Editar Contato' : 'Novo Contato'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefone *</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="5511999999999"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nome do contato"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoria</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="Ex: Clientes VIP"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@exemplo.com"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => {
                                                if (formData.tagIds.includes(tag.id)) {
                                                    setFormData({ ...formData, tagIds: formData.tagIds.filter(id => id !== tag.id) });
                                                } else {
                                                    setFormData({ ...formData, tagIds: [...formData.tagIds, tag.id] });
                                                }
                                            }}
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${formData.tagIds.includes(tag.id) ? 'ring-2' : 'opacity-60'
                                                }`}
                                            style={{
                                                backgroundColor: `${tag.color}20`,
                                                color: tag.color,
                                            }}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Fields */}
                            {customFields.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-medium mb-1">
                                        {field.name} {field.required && '*'}
                                    </label>
                                    {field.type === 'select' ? (
                                        <select
                                            value={formData.customFields[field.key] || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                customFields: { ...formData.customFields, [field.key]: e.target.value }
                                            })}
                                            className="input w-full"
                                        >
                                            <option value="">Selecione...</option>
                                            {field.options?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : field.type === 'boolean' ? (
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.customFields[field.key] || false}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...formData.customFields, [field.key]: e.target.checked }
                                                })}
                                                className="w-4 h-4 rounded"
                                            />
                                            <span className="text-sm">Sim</span>
                                        </label>
                                    ) : (
                                        <input
                                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                            value={formData.customFields[field.key] || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                customFields: { ...formData.customFields, [field.key]: e.target.value }
                                            })}
                                            className="input w-full"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowContactModal(false)} className="btn btn-ghost">
                                Cancelar
                            </button>
                            <button onClick={handleSaveContact} className="btn btn-primary">
                                {editingContact ? 'Salvar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tag Modal */}
            {showTagModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card w-full max-w-md p-6 m-4 animate-fadeIn">
                        <h2 className="text-xl font-bold mb-4">
                            {editingTag ? 'Editar Tag' : 'Nova Tag'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={tagFormData.name}
                                    onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                                    placeholder="Nome da tag"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Cor</label>
                                <div className="flex flex-wrap gap-2">
                                    {tagColors.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setTagFormData({ ...tagFormData, color })}
                                            className={`w-8 h-8 rounded-full transition-all ${tagFormData.color === color ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] scale-110' : ''
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Descrição</label>
                                <textarea
                                    value={tagFormData.description}
                                    onChange={(e) => setTagFormData({ ...tagFormData, description: e.target.value })}
                                    placeholder="Descrição opcional"
                                    className="input w-full"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowTagModal(false)} className="btn btn-ghost">
                                Cancelar
                            </button>
                            <button onClick={handleSaveTag} className="btn btn-primary">
                                {editingTag ? 'Salvar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card w-full max-w-md p-6 m-4 animate-fadeIn">
                        <h2 className="text-xl font-bold mb-4">Importar Contatos</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            Faça upload de um arquivo CSV com as colunas: <strong>telefone, nome, email</strong>
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                            className="input w-full"
                        />
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setShowImportModal(false)} className="btn btn-ghost">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Tag Modal */}
            {showBulkTagModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card w-full max-w-md p-6 m-4 animate-fadeIn">
                        <h2 className="text-xl font-bold mb-4">Adicionar Tags</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            Selecione as tags para adicionar aos {selectedContacts.size} contatos selecionados:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {tags.map(tag => {
                                const isSelected = bulkSelectedTags.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => {
                                            setBulkSelectedTags(prev =>
                                                isSelected
                                                    ? prev.filter(id => id !== tag.id)
                                                    : [...prev, tag.id]
                                            );
                                        }}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${isSelected ? 'ring-2 ring-offset-1' : 'opacity-60'
                                            }`}
                                        style={{
                                            backgroundColor: `${tag.color}20`,
                                            color: tag.color,
                                            borderColor: tag.color
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowBulkTagModal(false);
                                    setBulkSelectedTags([]);
                                }}
                                className="btn btn-ghost"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    handleBulkAddTags(bulkSelectedTags);
                                    setBulkSelectedTags([]);
                                    setShowBulkTagModal(false);
                                }}
                                className="btn btn-primary"
                                disabled={bulkSelectedTags.length === 0}
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
