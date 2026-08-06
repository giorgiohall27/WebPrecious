import { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { ManagedCompany } from '../../types';

type CompanyDraft = Omit<ManagedCompany, 'id' | 'createdAt'>;

function createEmptyDraft(pin: string): CompanyDraft {
  return {
    name: '',
    cif: '',
    email: '',
    phone: '',
    contactPerson: '',
    deliveryAddress: '',
    pin,
    active: true,
    notes: '',
  };
}

function toDraft(company: ManagedCompany): CompanyDraft {
  return {
    name: company.name,
    cif: company.cif,
    email: company.email,
    phone: company.phone,
    contactPerson: company.contactPerson,
    deliveryAddress: company.deliveryAddress,
    pin: company.pin,
    active: company.active,
    notes: company.notes ?? '',
  };
}

function normalizePin(pin: string) {
  return pin.replace(/\D/g, '').slice(0, 6);
}

export default function Companies() {
  const { companies, addCompany, updateCompany, removeCompany, generatePin } = useAuth();
  const [draft, setDraft] = useState<CompanyDraft>(() => createEmptyDraft(generatePin()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CompanyDraft | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeCompanies = companies.filter(company => company.active).length;
  const inactiveCompanies = companies.length - activeCompanies;

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter(company =>
      [company.name, company.cif, company.email, company.contactPerson, company.pin]
        .some(value => value.toLowerCase().includes(query))
    );
  }, [companies, search]);

  const setDraftField = (field: keyof CompanyDraft, value: string | boolean) => {
    setDraft(prev => ({
      ...prev,
      [field]: field === 'pin' && typeof value === 'string' ? normalizePin(value) : value,
    }));
  };

  const setEditField = (field: keyof CompanyDraft, value: string | boolean) => {
    setEditDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: field === 'pin' && typeof value === 'string' ? normalizePin(value) : value,
      };
    });
  };

  const resetDraft = () => {
    setDraft(createEmptyDraft(generatePin()));
  };

  const showMessage = (text: string) => {
    setMessage(text);
    setError('');
    window.setTimeout(() => setMessage(''), 2200);
  };

  const showError = (text: string) => {
    setError(text);
    setMessage('');
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const result = addCompany(draft);
    if (!result.success) {
      showError(result.error || 'No se pudo crear la empresa');
      return;
    }
    resetDraft();
    showMessage('Empresa creada');
  };

  const startEditing = (company: ManagedCompany) => {
    setEditingId(company.id);
    setEditDraft(toDraft(company));
    setError('');
    setMessage('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEditing = (id: string) => {
    if (!editDraft) return;
    const result = updateCompany(id, editDraft);
    if (!result.success) {
      showError(result.error || 'No se pudo guardar la empresa');
      return;
    }
    cancelEditing();
    showMessage('Empresa actualizada');
  };

  const toggleCompany = (company: ManagedCompany) => {
    const result = updateCompany(company.id, { active: !company.active });
    if (!result.success) {
      showError(result.error || 'No se pudo cambiar el estado');
      return;
    }
    showMessage(company.active ? 'Empresa desactivada' : 'Empresa activada');
  };

  const copyPin = async (company: ManagedCompany) => {
    try {
      await navigator.clipboard.writeText(company.pin);
      setCopiedId(company.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      showError('No se pudo copiar el PIN');
    }
  };

  const inputClass = 'w-full px-3 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Super Admin</p>
          <h1 className="text-2xl font-bold text-surface-900">Empresas y PINs</h1>
          <p className="text-sm text-surface-500 mt-1">Alta, acceso y datos comerciales de cada empresa.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar empresa, CIF o PIN"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Empresas', value: companies.length, icon: Building2, color: 'bg-primary-600 text-white' },
          { label: 'Activas', value: activeCompanies, icon: Check, color: 'bg-emerald-500 text-white' },
          { label: 'Pausadas', value: inactiveCompanies, icon: Power, color: 'bg-surface-800 text-white' },
        ].map(item => (
          <div key={item.label} className="bg-white border border-surface-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-surface-900">{item.value}</p>
            </div>
            <p className="text-sm text-surface-500 mt-3">{item.label}</p>
          </div>
        ))}
      </div>

      {(message || error) && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-6 items-start">
        <form onSubmit={handleCreate} className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-[#0C1E35] text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/12 border border-white/15 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">Nueva empresa</h2>
              <p className="text-xs text-white/60">Se genera un PIN unico de 6 digitos.</p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <input className={inputClass} placeholder="Nombre empresa" value={draft.name} onChange={event => setDraftField('name', event.target.value)} required />
            <input className={inputClass} placeholder="CIF / NIF" value={draft.cif} onChange={event => setDraftField('cif', event.target.value)} />
            <input className={inputClass} placeholder="Email" type="email" value={draft.email} onChange={event => setDraftField('email', event.target.value)} />
            <input className={inputClass} placeholder="Telefono" value={draft.phone} onChange={event => setDraftField('phone', event.target.value)} />
            <input className={inputClass} placeholder="Persona de contacto" value={draft.contactPerson} onChange={event => setDraftField('contactPerson', event.target.value)} />
            <textarea className={`${inputClass} min-h-[76px] resize-none`} placeholder="Direccion de entrega" value={draft.deliveryAddress} onChange={event => setDraftField('deliveryAddress', event.target.value)} />
            <textarea className={`${inputClass} min-h-[64px] resize-none`} placeholder="Notas internas" value={draft.notes} onChange={event => setDraftField('notes', event.target.value)} />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  className={`${inputClass} pl-9 font-bold tracking-[0.25em]`}
                  placeholder="PIN"
                  value={draft.pin}
                  onChange={event => setDraftField('pin', event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setDraftField('pin', generatePin())}
                className="btn-secondary px-3"
                aria-label="Generar PIN"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-surface-700 font-medium">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={event => setDraftField('active', event.target.checked)}
                className="w-4 h-4 rounded border-surface-300 text-primary-600"
              />
              Empresa activa
            </label>

            <button type="submit" className="btn-primary w-full justify-center">
              <Plus className="w-4 h-4" />
              Crear empresa
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {filteredCompanies.map(company => {
            const editing = editingId === company.id;
            const currentDraft = editing ? editDraft : null;

            return (
              <div key={company.id} className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-surface-900">{company.name}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${company.active ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
                        {company.active ? 'Activa' : 'Pausada'}
                      </span>
                    </div>
                    <p className="text-xs text-surface-400">{company.cif || 'Sin CIF'} - {company.email || 'Sin email'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => copyPin(company)} className="btn-secondary text-sm">
                      {copiedId === company.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {company.pin}
                    </button>
                    <button onClick={() => toggleCompany(company)} className="btn-secondary text-sm">
                      <Power className="w-4 h-4" />
                      {company.active ? 'Pausar' : 'Activar'}
                    </button>
                    <button onClick={() => startEditing(company)} className="btn-secondary text-sm">Editar</button>
                    <button onClick={() => removeCompany(company.id)} className="btn-secondary text-sm text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editing && currentDraft ? (
                  <div className="border-t border-surface-100 bg-surface-50 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input className={inputClass} placeholder="Nombre empresa" value={currentDraft.name} onChange={event => setEditField('name', event.target.value)} />
                      <input className={inputClass} placeholder="CIF / NIF" value={currentDraft.cif} onChange={event => setEditField('cif', event.target.value)} />
                      <input className={inputClass} placeholder="Email" type="email" value={currentDraft.email} onChange={event => setEditField('email', event.target.value)} />
                      <input className={inputClass} placeholder="Telefono" value={currentDraft.phone} onChange={event => setEditField('phone', event.target.value)} />
                      <input className={inputClass} placeholder="Persona de contacto" value={currentDraft.contactPerson} onChange={event => setEditField('contactPerson', event.target.value)} />
                      <div className="flex gap-2">
                        <input
                          className={`${inputClass} font-bold tracking-[0.25em]`}
                          placeholder="PIN"
                          value={currentDraft.pin}
                          onChange={event => setEditField('pin', event.target.value)}
                          inputMode="numeric"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setEditField('pin', generatePin())}
                          className="btn-secondary px-3"
                          aria-label="Generar PIN"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea className={`${inputClass} md:col-span-2 min-h-[72px] resize-none`} placeholder="Direccion de entrega" value={currentDraft.deliveryAddress} onChange={event => setEditField('deliveryAddress', event.target.value)} />
                      <textarea className={`${inputClass} md:col-span-2 min-h-[64px] resize-none`} placeholder="Notas internas" value={currentDraft.notes} onChange={event => setEditField('notes', event.target.value)} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                      <label className="flex items-center gap-2 text-sm text-surface-700 font-medium">
                        <input
                          type="checkbox"
                          checked={currentDraft.active}
                          onChange={event => setEditField('active', event.target.checked)}
                          className="w-4 h-4 rounded border-surface-300 text-primary-600"
                        />
                        Empresa activa
                      </label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={cancelEditing} className="btn-secondary">
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                        <button type="button" onClick={() => saveEditing(company.id)} className="btn-primary">
                          <Save className="w-4 h-4" />
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-surface-100 px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] text-surface-400 uppercase tracking-wide">Contacto</p>
                      <p className="font-medium text-surface-800">{company.contactPerson || '-'}</p>
                      <p className="text-surface-500">{company.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-surface-400 uppercase tracking-wide">Entrega</p>
                      <p className="font-medium text-surface-800 line-clamp-2">{company.deliveryAddress || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-surface-400 uppercase tracking-wide">Notas</p>
                      <p className="font-medium text-surface-800 line-clamp-2">{company.notes || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredCompanies.length === 0 && (
            <div className="bg-white border border-dashed border-surface-300 rounded-xl p-10 text-center">
              <Building2 className="w-10 h-10 text-surface-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-surface-600">No hay empresas con esa busqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
