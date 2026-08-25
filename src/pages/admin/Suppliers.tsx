import { useMemo, useState } from 'react';
import { Copy, KeyRound, Plus, Power, Search, Trash2, Truck } from 'lucide-react';
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
        {filtered.map(supplier => (
          <article key={supplier.id} className="card p-5 space-y-4">
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
              <button type="button" className="btn-icon text-red-500 hover:bg-red-50" onClick={() => removeSupplier(supplier.id)} title="Eliminar"><Trash2 className="w-4 h-4" /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
