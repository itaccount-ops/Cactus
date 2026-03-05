'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getAdminClients, createAdminClient, updateAdminClient, deleteAdminClient,
    addClientContact, deleteClientContact
} from './actions';
import {
    Search, Plus, Edit2, Trash2, X, Building2, Mail, Phone, Globe,
    MapPin, Briefcase, FileText, Users, ChevronLeft, ChevronRight,
    MoreVertical, CheckCircle, XCircle, Loader2, ExternalLink, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// ─────────────────────────────────────────────
// STATUS styles
// ─────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    PROSPECT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    INACTIVE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    VIP: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Activo', PROSPECT: 'Prospecto', INACTIVE: 'Inactivo', VIP: 'VIP'
};

const INITIAL_FORM = {
    name: '', email: '', phone: '', companyName: '', address: '',
    industry: '', website: '', notes: '', status: 'ACTIVE'
};

export default function AdminClientsPage() {
    return (
        <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
            <AdminClientsContent />
        </ProtectedRoute>
    );
}

function AdminClientsContent() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [filters, setFilters] = useState({ search: '', status: 'ALL', page: 1, limit: 20 });

    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState<any | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);

    // Contact add within detail panel
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', position: '', isPrimary: false });
    const [addingContact, setAddingContact] = useState(false);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminClients(filters);
            setClients(data.clients);
            setTotal(data.total);
            setPages(data.pages);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const t = setTimeout(fetchClients, 300);
        return () => clearTimeout(t);
    }, [fetchClients]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await createAdminClient(formData);
            setShowCreate(false);
            setFormData(INITIAL_FORM);
            fetchClients();
        } finally {
            setSaving(false);
        }
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!editingClient) return;
        setSaving(true);
        try {
            await updateAdminClient(editingClient.id, formData);
            setEditingClient(null);
            fetchClients();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(client: any) {
        if (!confirm(`¿Desactivar a "${client.name}"? Se archivará sin eliminarse.`)) return;
        await deleteAdminClient(client.id);
        fetchClients();
    }

    async function handleAddContact(e: React.FormEvent) {
        e.preventDefault();
        if (!showDetail) return;
        setAddingContact(true);
        try {
            await addClientContact(showDetail.id, contactForm);
            setContactForm({ name: '', email: '', phone: '', position: '', isPrimary: false });
            // Refresh detail from list
            const updated = await getAdminClients({ search: showDetail.name, limit: 1 });
            if (updated.clients[0]) setShowDetail(updated.clients[0]);
            fetchClients();
        } finally {
            setAddingContact(false);
        }
    }

    async function handleDeleteContact(contactId: string) {
        if (!confirm('¿Eliminar contacto?')) return;
        await deleteClientContact(contactId);
        const updated = await getAdminClients({ search: showDetail?.name || '', limit: 1 });
        if (updated.clients[0]) setShowDetail(updated.clients[0]);
    }

    function openEdit(client: any) {
        setFormData({
            name: client.name || '', email: client.email || '', phone: client.phone || '',
            companyName: client.companyName || '', address: client.address || '',
            industry: client.industry || '', website: client.website || '',
            notes: client.notes || '', status: client.status || 'ACTIVE'
        });
        setEditingClient(client);
    }

    const inputClass = "w-full p-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg text-sm focus:ring-2 focus:ring-olive-500/20 outline-none";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 border-l-4 border-olive-500 pl-4">
                        Gestión de Clientes
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 ml-5 mt-1 text-sm">
                        {total} clientes registrados
                    </p>
                </div>
                <button
                    onClick={() => { setFormData(INITIAL_FORM); setShowCreate(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-bold shadow-lg shadow-olive-600/20 transition-colors"
                >
                    <Plus size={18} />
                    Nuevo Cliente
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                        placeholder="Buscar por nombre, empresa, email o sector..."
                        className={`${inputClass} pl-9`}
                        value={filters.search}
                        onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                    />
                </div>
                <select
                    className={inputClass}
                    value={filters.status}
                    onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
                >
                    <option value="ALL">Todos los estados</option>
                    <option value="ACTIVE">Activos</option>
                    <option value="PROSPECT">Prospectos</option>
                    <option value="VIP">VIP</option>
                    <option value="INACTIVE">Inactivos</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {loading ? (
                    <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 text-olive-600 animate-spin" /></div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                                <thead className="bg-neutral-50 dark:bg-neutral-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contacto</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sector</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">Leads</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">Proyectos</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {clients.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                                                No se encontraron clientes
                                            </td>
                                        </tr>
                                    ) : clients.map(client => (
                                        <motion.tr
                                            key={client.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                                            onClick={() => setShowDetail(client)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center text-olive-700 dark:text-olive-400 font-bold text-sm shrink-0">
                                                        {client.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">{client.name}</p>
                                                        <p className="text-xs text-neutral-500">{client.companyName || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {client.email && <p className="text-neutral-700 dark:text-neutral-300 text-xs">{client.email}</p>}
                                                {client.phone && <p className="text-neutral-500 text-xs">{client.phone}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
                                                    {client.industry || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {client._count?.leads || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                                    {client._count?.projects || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${STATUS_STYLES[client.status] || STATUS_STYLES.INACTIVE}`}>
                                                    {STATUS_LABELS[client.status] || client.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => openEdit(client)}
                                                        className="p-2 text-neutral-400 hover:text-olive-600 hover:bg-olive-50 dark:hover:bg-olive-900/20 rounded-lg transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(client)}
                                                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        title="Archivar"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/10">
                            <span className="text-xs text-neutral-500">
                                Mostrando {clients.length} de {total} clientes
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={filters.page === 1}
                                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                                    className="p-1 rounded hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="px-3 py-1 bg-white dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 text-xs font-semibold flex items-center">
                                    {filters.page} / {pages || 1}
                                </span>
                                <button
                                    disabled={filters.page >= pages}
                                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                                    className="p-1 rounded hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ─── CREATE / EDIT MODAL ─── */}
            <AnimatePresence>
                {(showCreate || editingClient) && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                                    {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                                </h3>
                                <button
                                    onClick={() => { setShowCreate(false); setEditingClient(null); }}
                                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={editingClient ? handleUpdate : handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Nombre *</label>
                                        <input required value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} className={inputClass} placeholder="LANTANIA S.A." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Razón Social</label>
                                        <input value={formData.companyName} onChange={e => setFormData(d => ({ ...d, companyName: e.target.value }))} className={inputClass} placeholder="Lantania Obras y Proyectos" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Estado</label>
                                        <select value={formData.status} onChange={e => setFormData(d => ({ ...d, status: e.target.value }))} className={inputClass}>
                                            <option value="ACTIVE">Activo</option>
                                            <option value="PROSPECT">Prospecto</option>
                                            <option value="VIP">VIP</option>
                                            <option value="INACTIVE">Inactivo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Email</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} className={inputClass} placeholder="comercial@empresa.es" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Teléfono</label>
                                        <input value={formData.phone} onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} className={inputClass} placeholder="+34 91 555 0000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Sector</label>
                                        <input value={formData.industry} onChange={e => setFormData(d => ({ ...d, industry: e.target.value }))} className={inputClass} placeholder="Construcción, Energía..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Web</label>
                                        <input value={formData.website} onChange={e => setFormData(d => ({ ...d, website: e.target.value }))} className={inputClass} placeholder="https://..." />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Dirección</label>
                                        <input value={formData.address} onChange={e => setFormData(d => ({ ...d, address: e.target.value }))} className={inputClass} placeholder="Calle, Ciudad, CP" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Notas internas</label>
                                        <textarea rows={3} value={formData.notes} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} className={`${inputClass} resize-none`} placeholder="Información relevante del cliente..." />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => { setShowCreate(false); setEditingClient(null); }} className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium transition-colors">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-bold transition-all shadow-lg shadow-olive-600/20 disabled:opacity-60 flex gap-2 items-center justify-center">
                                        {saving && <Loader2 size={14} className="animate-spin" />}
                                        {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── DETAIL PANEL ─── */}
            <AnimatePresence>
                {showDetail && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDetail(null)} />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-lg h-full bg-white dark:bg-neutral-900 shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center font-black text-olive-700 dark:text-olive-300">
                                        {showDetail.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-neutral-900 dark:text-white text-base leading-tight">{showDetail.name}</h2>
                                        <p className="text-xs text-neutral-500">{showDetail.companyName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetail(null)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {showDetail.email && (
                                        <a href={`mailto:${showDetail.email}`} className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-olive-300 transition-colors text-sm text-neutral-700 dark:text-neutral-300 group">
                                            <Mail className="w-4 h-4 text-neutral-400 group-hover:text-olive-500 shrink-0" />
                                            <span className="truncate text-xs">{showDetail.email}</span>
                                        </a>
                                    )}
                                    {showDetail.phone && (
                                        <a href={`tel:${showDetail.phone}`} className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-olive-300 transition-colors text-sm text-neutral-700 dark:text-neutral-300 group">
                                            <Phone className="w-4 h-4 text-neutral-400 group-hover:text-olive-500 shrink-0" />
                                            <span className="truncate text-xs">{showDetail.phone}</span>
                                        </a>
                                    )}
                                    {showDetail.website && (
                                        <a href={showDetail.website} target="_blank" className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-olive-300 transition-colors group col-span-2">
                                            <Globe className="w-4 h-4 text-neutral-400 group-hover:text-olive-500 shrink-0" />
                                            <span className="text-xs text-blue-600 dark:text-blue-400 truncate">{showDetail.website}</span>
                                            <ExternalLink size={12} className="ml-auto text-neutral-400 shrink-0" />
                                        </a>
                                    )}
                                    {showDetail.industry && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 col-span-2">
                                            <Tag className="w-4 h-4 text-neutral-400 shrink-0" />
                                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{showDetail.industry}</span>
                                        </div>
                                    )}
                                    {showDetail.address && (
                                        <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 col-span-2">
                                            <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{showDetail.address}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Leads', value: showDetail._count?.leads || 0, icon: Briefcase, color: 'blue' },
                                        { label: 'Proyectos', value: showDetail._count?.projects || 0, icon: Building2, color: 'green' },
                                        { label: 'Facturas', value: showDetail._count?.invoices || 0, icon: FileText, color: 'purple' },
                                    ].map(stat => (
                                        <div key={stat.label} className={`p-3 rounded-xl text-center border border-${stat.color}-100 dark:border-${stat.color}-900/30 bg-${stat.color}-50 dark:bg-${stat.color}-900/20`}>
                                            <p className={`text-2xl font-black text-${stat.color}-700 dark:text-${stat.color}-400`}>{stat.value}</p>
                                            <p className={`text-xs text-${stat.color}-600 dark:text-${stat.color}-400/70 font-medium`}>{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Notes */}
                                {showDetail.notes && (
                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Notas internas</p>
                                        <p className="text-sm text-amber-700 dark:text-amber-300/80 leading-relaxed">{showDetail.notes}</p>
                                    </div>
                                )}

                                {/* Contacts */}
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-neutral-500" />
                                        Contactos ({showDetail.contacts?.length || 0})
                                    </h3>
                                    <div className="space-y-2 mb-4">
                                        {showDetail.contacts?.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{c.name}</span>
                                                        {c.isPrimary && <span className="text-[10px] font-bold text-olive-600 bg-olive-100 dark:bg-olive-900/30 px-1.5 py-0.5 rounded">Principal</span>}
                                                    </div>
                                                    {c.position && <p className="text-xs text-neutral-500">{c.position}</p>}
                                                    <div className="flex gap-3 mt-0.5">
                                                        {c.email && <span className="text-xs text-blue-600 dark:text-blue-400">{c.email}</span>}
                                                        {c.phone && <span className="text-xs text-neutral-500">{c.phone}</span>}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Contact Form */}
                                    <form onSubmit={handleAddContact} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 space-y-3">
                                        <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2">Añadir contacto</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input required value={contactForm.name} onChange={e => setContactForm(c => ({ ...c, name: e.target.value }))} className={inputClass} placeholder="Nombre *" />
                                            <input value={contactForm.position} onChange={e => setContactForm(c => ({ ...c, position: e.target.value }))} className={inputClass} placeholder="Cargo" />
                                            <input type="email" value={contactForm.email} onChange={e => setContactForm(c => ({ ...c, email: e.target.value }))} className={inputClass} placeholder="Email" />
                                            <input value={contactForm.phone} onChange={e => setContactForm(c => ({ ...c, phone: e.target.value }))} className={inputClass} placeholder="Teléfono" />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={contactForm.isPrimary} onChange={e => setContactForm(c => ({ ...c, isPrimary: e.target.checked }))} className="rounded border-neutral-300 text-olive-600 focus:ring-olive-500" />
                                            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Marcar como contacto principal</span>
                                        </label>
                                        <button type="submit" disabled={addingContact} className="w-full py-2 bg-olive-600 text-white rounded-lg text-sm font-bold hover:bg-olive-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                                            {addingContact && <Loader2 size={14} className="animate-spin" />}
                                            Añadir Contacto
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0 flex gap-2">
                                <button onClick={() => { openEdit(showDetail); setShowDetail(null); }} className="flex-1 flex items-center justify-center gap-2 bg-olive-600 hover:bg-olive-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                                    <Edit2 size={15} />
                                    Editar Cliente
                                </button>
                                <button onClick={() => handleDelete(showDetail)} className="px-4 py-2.5 bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
