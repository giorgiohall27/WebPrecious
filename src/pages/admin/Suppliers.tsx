import { useMemo, useState } from 'react';
import { Copy, KeyRound, Pencil, Plus, Power, RefreshCw, Save, Search, Trash2, Truck, X } from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { ManagedSupplier } from '../../types';

type SupplierDraft = Omit<ManagedSupplier, 'id' | 'createdAt' | 'pinHint'>;

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, removeSupplier, generateSupplierPin } = useAuth();
  const emptyDraft = (): SupplierDraft => ({ name: '', email: '', phone: '', contactPerson: '', pin: generateSupplierPin(), active: true, notes: '' });
  const [draft, setDraft] = useState<SupplierDraft>(emptyDraft);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SupplierDraft | null>(null);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter(supplier => !query || [supplier.name, supplier.email, supplier.phone, supplier.contactPerson].some(value => value.toLowerCase().includes(query)));
  }, [search, suppliers]);

  const createSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await addSupplier(draft);
    if (!result.success) {
      setError(result.error || 'No se pudo crear el proveedor');
      return;
    }
    setDraft(emptyDraft());
    setError('');
    setMessage('Proveedor creado. Ya puede acceder con su PIN.');
  };

  const copyPin = async (supplier: ManagedSupplier) => {
    if (!supplier.pin) {
      setError('Genera un PIN nuevo para poder copiarlo.');
      return;
    }
    await navigator.clipboard.writeText(supplier.pin);
    setMessage(`PIN de ${supplier.name} copiado.`);
  };

  const startEditing = (supplier: ManagedSupplier) => {
    setEditingId(supplier.id);
    setEditDraft({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      contactPerson: supplier.contactPerson,
      pin: '',
      active: supplier.active,
      notes: supplier.notes ?? '',
    });
    setError('');
    setMessage('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const setEditField = (field: keyof SupplierDraft, value: string | boolean) => {
    setEditDraft(current => current ? {
      ...current,
      [field]: field === 'pin' && typeof value === 'string' ? value.replace(/\D/g, '').slice(0, 6) : value,
    } : current);
  };

  const saveSupplier = async (supplier: ManagedSupplier) => {
    if (!editDraft) return;
    if (editDraft.pin && editDraft.pin.length !== 6) {
      setError('El PIN del proveedor debe tener 6 dígitos.');
      return;
    }
    const result = await updateSupplier(supplier.id, editDraft);
    if (!result.success) {
      setError(result.error || 'No se pudo actualizar el proveedor');
      return;
    }
    cancelEditing();
    setError('');
    setMessage(editDraft.pin ? `Proveedor actualizado y PIN de ${supplier.name} cambiado.` : 'Proveedor actualizado.');
  };

  const inputClass = 'input-field';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Super Admin</p>
          <h1 className="text-2xl font-bold text-surface-900">Proveedores</h1>
          <p className="text-sm text-surface-500 mt-1">Crea accesos para que cada proveedor prepare sus preventas desde la web.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} className="input-field pl-9" placeholder="Buscar proveedor" />
        </div>
      </div>

      {(message || error) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}

      <form onSubmit={createSupplier} className="card p-5 space-y-4">
        <div className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary-600" /><h2 className="font-bold">Crear proveedor</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input required className={inputClass} placeholder="Nombre del proveedor *" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} />
          <input className={inputClass} type="email" placeholder="Email" value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} />
          <input className={inputClass} placeholder="Teléfono" value={draft.phone} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} />
          <input className={inputClass} placeholder="Persona de contacto" value={draft.contactPerson} onChange={event => setDraft(current => ({ ...current, contactPerson: event.target.value }))} />
          <div className="flex gap-2">
            <input required inputMode="numeric" maxLength={6} className={`${inputClass} font-mono tracking-widest`} placeholder="PIN" value={draft.pin} onChange={event => setDraft(current => ({ ...current, pin: event.target.value.replace(/\D/g, '').slice(0, 6) }))} />
            <button type="button" className="btn-secondary px-3" onClick={() => setDraft(current => ({ ...current, pin: generateSupplierPin() }))} title="Generar PIN"><KeyRound className="w-4 h-4" /></button>
          </div>
          <input className={inputClass} placeholder="Notas" value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} />
        </div>
        <button className="btn-primary" type="submit"><Truck className="w-4 h-4" />Crear proveedor</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(supplier => {
          const editing = editingId === supplier.id && editDraft;
          return (
          <article key={supplier.id} className="card p-5 space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-surface-900">Editar proveedor</h3>
                  <button type="button" onClick={cancelEditing} className="btn-icon" title="Cancelar"><X className="h-4 w-4" /></button>
                </div>
                <input required className={inputClass} placeholder="Nombre del proveedor" value={editDraft.name} onChange={event => setEditField('name', event.target.value)} />
                <input className={inputClass} type="email" placeholder="Email" value={editDraft.email} onChange={event => setEditField('email', event.target.value)} />
                <input className={inputClass} placeholder="Teléfono" value={editDraft.phone} onChange={event => setEditField('phone', event.target.value)} />
                <input className={inputClass} placeholder="Persona de contacto" value={editDraft.contactPerson} onChange={event => setEditField('contactPerson', event.target.value)} />
                <div>
                  <label className="input-label">Cambiar PIN (opcional)</label>
                  <div className="flex gap-2">
                    <input inputMode="numeric" maxLength={6} className={`${inputClass} font-mono tracking-widest`} placeholder="Nuevo PIN de 6 dígitos" value={editDraft.pin} onChange={event => setEditField('pin', event.target.value)} />
                    <button type="button" className="btn-secondary px-3" onClick={() => setEditField('pin', generateSupplierPin())} title="Generar PIN"><RefreshCw className="w-4 h-4" /></button>
                  </div>
                  <p className="mt-1 text-[11px] text-surface-400">Déjalo vacío para conservar el PIN actual.</p>
                </div>
                <input className={inputClass} placeholder="Notas" value={editDraft.notes} onChange={event => setEditField('notes', event.target.value)} />
                <label className="flex items-center gap-2 text-sm text-surface-700">
                  <input type="checkbox" checked={editDraft.active} onChange={event => setEditField('active', event.target.checked)} /> Proveedor activo
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={cancelEditing} className="btn-secondary flex-1"><X className="w-4 h-4" />Cancelar</button>
                  <button type="button" onClick={() => saveSupplier(supplier)} className="btn-primary flex-1"><Save className="w-4 h-4" />Guardar</button>
                </div>
              </div>
            ) : (<>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-bold text-surface-900">{supplier.name}</h3><p className="text-xs text-surface-400">{supplier.contactPerson || 'Sin contacto'}</p></div>
              <span className={`badge border ${supplier.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-surface-100 text-surface-500 border-surface-200'}`}>{supplier.active ? 'Activo' : 'Desactivado'}</span>
            </div>
            <div className="text-sm text-surface-600 space-y-1"><p>{supplier.email || 'Sin email'}</p><p>{supplier.phone || 'Sin teléfono'}</p></div>
            <div className="flex items-center justify-between rounded-lg bg-surface-50 border border-surface-100 px-3 py-2">
              <span className="font-mono font-bold tracking-widest">{supplier.pin || `••••${supplier.pinHint || ''}`}</span>
              <button type="button" onClick={() => copyPin(supplier)} className="btn-icon" title="Copiar PIN"><Copy className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => updateSupplier(supplier.id, { active: !supplier.active })}><Power className="w-4 h-4" />{supplier.active ? 'Desactivar' : 'Activar'}</button>
              <button type="button" className="btn-secondary px-3" onClick={() => startEditing(supplier)} title="Editar proveedor y PIN"><Pencil className="w-4 h-4" /></button>
              <button type="button" className="btn-icon text-red-500 hover:bg-red-50" onClick={() => removeSupplier(supplier.id)} title="Eliminar"><Trash2 className="w-4 h-4" /></button>
            </div>
            </>)}
          </article>
        );})}
      </div>
    </div>
  );
}
