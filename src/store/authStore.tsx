import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ManagedCompany, ManagedSupplier, SuperAdmin } from '../types';
import { supabase, supabaseEnabled } from '../lib/supabase';

const SUPER_ADMIN_PASSWORD = 'Levi1234';

const COMPANIES_STORAGE_KEY = 'webprecious.companies.v2';
const COMPANY_SESSION_KEY = 'webprecious.companySession.v3';
const COMPANY_PROFILE_KEY = 'webprecious.companyProfile.v3';
const SUPER_ADMIN_SESSION_KEY = 'webprecious.superAdminSession.v3';
const SUPPLIER_SESSION_KEY = 'webprecious.supplierSession.v1';
const SUPPLIER_PROFILE_KEY = 'webprecious.supplierProfile.v1';

type CompanyInput = Omit<ManagedCompany, 'id' | 'createdAt'>;
type SupplierInput = Omit<ManagedSupplier, 'id' | 'createdAt'>;
type ActionResult<T = unknown> = Promise<{ success: boolean; error?: string } & T>;

const defaultSuperAdmins: SuperAdmin[] = [
  {
    id: 'super-admin-main',
    name: 'Levi Super Admin',
    email: 'leviturjeman@gmail.com',
    pin: '909090',
    active: true,
    createdAt: '2026-03-20T00:00:00.000Z',
    notes: 'Administrador principal de Precious Spain',
  },
];

const defaultCompanies: ManagedCompany[] = [
  {
    id: 'comp-hotel-costa-demo',
    legalName: 'Hotel Costa Demo S.L.',
    name: 'Hotel Costa Demo',
    cif: 'B12345678',
    email: 'compras@hotelcosta.es',
    phone: '+34 900 111 222',
    contactPerson: 'Responsable de compras',
    deliveryAddress: 'Avenida del Mar 18, 29640 Fuengirola',
    pin: '123456',
    pinHint: '56',
    active: true,
    createdAt: '2026-03-20T00:00:00.000Z',
    notes: 'Cliente demo hosteleria',
  },
  {
    id: 'comp-market-sol',
    legalName: 'Market Sol S.L.',
    name: 'Market Sol S.L.',
    cif: 'B23456789',
    email: 'pedidos@marketsol.es',
    phone: '+34 911 222 333',
    contactPerson: 'Laura Martinez',
    deliveryAddress: 'Calle Sol 24, 28004 Madrid',
    pin: '234567',
    pinHint: '67',
    active: true,
    createdAt: '2026-03-20T00:00:00.000Z',
    notes: 'Cliente demo retail',
  },
  {
    id: 'comp-restaurante-marina',
    legalName: 'Restaurante Marina S.L.',
    name: 'Restaurante Marina',
    cif: 'B34567890',
    email: 'compras@restaurantemarina.es',
    phone: '+34 952 333 444',
    contactPerson: 'David Ruiz',
    deliveryAddress: 'Paseo Maritimo 7, 29016 Malaga',
    pin: '345678',
    pinHint: '78',
    active: true,
    createdAt: '2026-03-20T00:00:00.000Z',
    notes: 'Cliente demo restauracion',
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readText(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

function writeText(key: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeStored(key: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}

function normalizePin(pin: string) {
  return pin.replace(/\D/g, '').slice(0, 6);
}

function createCompanyId(name: string) {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return `comp-${slug || 'empresa'}-${Date.now()}`;
}

function toCompany(row: any): ManagedCompany {
  const pin = row.pin ?? '';

  return {
    id: row.id,
    legalName: row.legal_name ?? row.legalName ?? '',
    name: row.name,
    cif: row.cif ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    contactPerson: row.contact_person ?? row.contactPerson ?? '',
    deliveryAddress: row.delivery_address ?? row.deliveryAddress ?? '',
    pin,
    pinHint: row.pin_hint ?? row.pinHint ?? (pin ? pin.slice(-2) : ''),
    active: row.active,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    notes: row.notes ?? '',
  };
}

function companyToPayload(company: Partial<CompanyInput> & { id?: string }) {
  return {
    id: company.id,
    legal_name: company.legalName,
    name: company.name,
    cif: company.cif,
    email: company.email,
    phone: company.phone,
    contact_person: company.contactPerson,
    delivery_address: company.deliveryAddress,
    active: company.active,
    notes: company.notes ?? null,
  };
}

function toSupplier(row: any): ManagedSupplier {
  const pin = row.pin ?? '';
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    contactPerson: row.contact_person ?? '',
    pin,
    pinHint: row.pin_hint ?? (pin ? pin.slice(-2) : ''),
    active: row.active,
    createdAt: row.created_at ?? new Date().toISOString(),
    notes: row.notes ?? '',
  };
}

function supplierToPayload(supplier: Partial<SupplierInput> & { id?: string }) {
  return {
    id: supplier.id,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    contact_person: supplier.contactPerson,
    active: supplier.active,
    notes: supplier.notes ?? null,
  };
}

interface AuthContextType {
  isLoggedIn: boolean;
  isGuest: boolean;
  isSuperAdmin: boolean;
  isSupplier: boolean;
  userEmail: string | null;
  userProfile: ManagedCompany | null;
  currentCompany: ManagedCompany | null;
  companies: ManagedCompany[];
  suppliers: ManagedSupplier[];
  supplierProfile: ManagedSupplier | null;
  companySessionToken: string | null;
  superAdminSessionToken: string | null;
  supplierSessionToken: string | null;
  loginWithPin: (pin: string) => ActionResult;
  login: (email: string, password: string) => ActionResult;
  loginAsSuperAdmin: (email: string, password: string) => ActionResult;
  loginSuperAdminWithPin: (pin: string) => ActionResult;
  loginSupplierWithPin: (pin: string) => ActionResult;
  loginAsGuest: () => void;
  logout: () => void;
  logoutSuperAdmin: () => void;
  logoutSupplier: () => void;
  addCompany: (company: CompanyInput) => ActionResult<{ company?: ManagedCompany }>;
  updateCompany: (id: string, updates: Partial<CompanyInput>) => ActionResult<{ company?: ManagedCompany }>;
  removeCompany: (id: string) => Promise<void>;
  generatePin: () => string;
  refreshCompanies: () => Promise<void>;
  addSupplier: (supplier: SupplierInput) => ActionResult<{ supplier?: ManagedSupplier }>;
  updateSupplier: (id: string, updates: Partial<SupplierInput>) => ActionResult<{ supplier?: ManagedSupplier }>;
  removeSupplier: (id: string) => Promise<void>;
  generateSupplierPin: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<ManagedCompany[]>(() => {
    if (supabaseEnabled) return [];
    const stored = readJson<ManagedCompany[]>(COMPANIES_STORAGE_KEY, defaultCompanies);
    return stored.length > 0 ? stored : defaultCompanies;
  });
  const [currentCompany, setCurrentCompany] = useState<ManagedCompany | null>(() =>
    supabaseEnabled ? readJson<ManagedCompany | null>(COMPANY_PROFILE_KEY, null) : null
  );
  const [companySessionToken, setCompanySessionToken] = useState<string | null>(() => readText(COMPANY_SESSION_KEY));
  const [superAdminSessionToken, setSuperAdminSessionToken] = useState<string | null>(() => readText(SUPER_ADMIN_SESSION_KEY));
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => Boolean(readText(SUPER_ADMIN_SESSION_KEY)));
  const [suppliers, setSuppliers] = useState<ManagedSupplier[]>([]);
  const [supplierSessionToken, setSupplierSessionToken] = useState<string | null>(() => readText(SUPPLIER_SESSION_KEY));
  const [supplierProfile, setSupplierProfile] = useState<ManagedSupplier | null>(() => readJson<ManagedSupplier | null>(SUPPLIER_PROFILE_KEY, null));
  const isSupplier = Boolean(supplierSessionToken && supplierProfile);

  const userEmail = currentCompany?.email ?? null;

  const refreshCompanies = async () => {
    if (!supabaseEnabled) return;
    if (!superAdminSessionToken && !supplierSessionToken) {
      setCompanies([]);
      return;
    }

    const { data, error } = superAdminSessionToken
      ? await supabase.rpc('list_admin_companies', { p_admin_token: superAdminSessionToken })
      : await supabase.rpc('list_supplier_companies', { p_supplier_token: supplierSessionToken });

    if (error) {
      console.error('Error loading companies:', error);
      return;
    }

    setCompanies((data ?? []).map(toCompany));
  };

  const refreshSuppliers = async () => {
    if (!supabaseEnabled || !superAdminSessionToken) return;
    const { data, error } = await supabase.rpc('list_admin_suppliers', { p_admin_token: superAdminSessionToken });
    if (error) console.error('Error loading suppliers:', error);
    else setSuppliers((data ?? []).map(toSupplier));
  };

  useEffect(() => {
    if (!supabaseEnabled) return;
    if (!companySessionToken) {
      setCurrentCompany(null);
      removeStored(COMPANY_PROFILE_KEY);
      return;
    }

    supabase.rpc('validate_company_session', { p_session_token: companySessionToken }).then(({ data, error }) => {
      const company = data?.[0] ? toCompany(data[0]) : null;
      if (error || !company) {
        setCompanySessionToken(null);
        setCurrentCompany(null);
        removeStored(COMPANY_SESSION_KEY);
        removeStored(COMPANY_PROFILE_KEY);
        return;
      }

      setCurrentCompany(company);
      writeJson(COMPANY_PROFILE_KEY, company);
    });
  }, [companySessionToken]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    if (!superAdminSessionToken) {
      setIsSuperAdmin(false);
      setCompanies([]);
      return;
    }

    supabase.rpc('validate_super_admin_session', { p_session_token: superAdminSessionToken }).then(({ data, error }) => {
      if (error || !data?.length) {
        setIsSuperAdmin(false);
        setSuperAdminSessionToken(null);
        removeStored(SUPER_ADMIN_SESSION_KEY);
        setCompanies([]);
        return;
      }

      setIsSuperAdmin(true);
      refreshCompanies();
      refreshSuppliers();
    });
  }, [superAdminSessionToken]);

  useEffect(() => {
    if (!supabaseEnabled || !supplierSessionToken) return;
    supabase.rpc('validate_supplier_session', { p_session_token: supplierSessionToken }).then(({ data, error }) => {
      const supplier = data?.[0] ? toSupplier(data[0]) : null;
      if (error || !supplier) {
        setSupplierSessionToken(null);
        setSupplierProfile(null);
        removeStored(SUPPLIER_SESSION_KEY);
        removeStored(SUPPLIER_PROFILE_KEY);
        return;
      }
      setSupplierProfile(supplier);
      writeJson(SUPPLIER_PROFILE_KEY, supplier);
      refreshCompanies();
    });
  }, [supplierSessionToken]);

  useEffect(() => {
    if (typeof window === 'undefined' || supabaseEnabled) return;
    window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  const generatePin = () => {
    let pin = '';
    do {
      pin = String(Math.floor(100000 + Math.random() * 900000));
    } while (companies.some(company => company.pin === pin));
    return pin;
  };

  const generateSupplierPin = () => {
    let pin = '';
    do pin = String(Math.floor(100000 + Math.random() * 900000));
    while (suppliers.some(supplier => supplier.pin === pin));
    return pin;
  };

  const loginWithPin = async (pin: string): ActionResult => {
    const cleanPin = normalizePin(pin);
    if (cleanPin.length !== 6) {
      return { success: false, error: 'Introduce un PIN de 6 digitos' };
    }

    if (supabaseEnabled) {
      const { data, error } = await supabase.rpc('verify_company_pin', { p_pin: cleanPin });
      const row = data?.[0];
      if (error || !row?.session_token) {
        return { success: false, error: 'PIN no encontrado o bloqueado temporalmente' };
      }

      const company = toCompany(row);
      setCompanySessionToken(row.session_token);
      setCurrentCompany(company);
      writeText(COMPANY_SESSION_KEY, row.session_token);
      writeJson(COMPANY_PROFILE_KEY, company);
      return { success: true };
    }

    const company = companies.find(item => item.pin === cleanPin);
    if (!company) return { success: false, error: 'PIN no encontrado' };
    if (!company.active) return { success: false, error: 'Esta empresa esta desactivada' };

    setCurrentCompany(company);
    writeJson(COMPANY_PROFILE_KEY, company);
    return { success: true };
  };

  const loginAsSuperAdmin = async (email: string, password: string): ActionResult => {
    if (supabaseEnabled) {
      return { success: false, error: 'Usa el PIN de Super Admin' };
    }

    const admin = defaultSuperAdmins.find(item => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!admin) return { success: false, error: 'Email de Super Admin incorrecto' };
    if (password !== SUPER_ADMIN_PASSWORD) return { success: false, error: 'Clave de Super Admin incorrecta' };
    if (!admin.active) return { success: false, error: 'Este Super Admin esta desactivado' };

    setIsSuperAdmin(true);
    writeText(SUPER_ADMIN_SESSION_KEY, 'local-super-admin');
    return { success: true };
  };

  const loginSuperAdminWithPin = async (pin: string): ActionResult => {
    const cleanPin = normalizePin(pin);
    if (cleanPin.length !== 6) {
      return { success: false, error: 'Introduce un PIN de 6 digitos' };
    }

    if (supabaseEnabled) {
      const { data, error } = await supabase.rpc('verify_super_admin_pin', { p_pin: cleanPin });
      const row = data?.[0];
      if (error || !row?.session_token) {
        return { success: false, error: 'PIN de Super Admin incorrecto o bloqueado temporalmente' };
      }

      setSuperAdminSessionToken(row.session_token);
      setIsSuperAdmin(true);
      writeText(SUPER_ADMIN_SESSION_KEY, row.session_token);
      return { success: true };
    }

    const admin = defaultSuperAdmins.find(item => item.pin === cleanPin);
    if (!admin) return { success: false, error: 'PIN de Super Admin incorrecto' };
    if (!admin.active) return { success: false, error: 'Este Super Admin esta desactivado' };

    setIsSuperAdmin(true);
    writeText(SUPER_ADMIN_SESSION_KEY, 'local-super-admin');
    return { success: true };
  };

  const loginSupplierWithPin = async (pin: string): ActionResult => {
    const cleanPin = normalizePin(pin);
    if (cleanPin.length !== 6) return { success: false, error: 'Introduce un PIN de 6 digitos' };
    if (!supabaseEnabled) return { success: false, error: 'El acceso de proveedor requiere conexión a la base de datos' };
    const { data, error } = await supabase.rpc('verify_supplier_pin', { p_pin: cleanPin });
    const row = data?.[0];
    if (error || !row?.session_token) return { success: false, error: 'PIN de proveedor incorrecto o bloqueado temporalmente' };
    const supplier = toSupplier(row);
    setSupplierSessionToken(row.session_token);
    setSupplierProfile(supplier);
    writeText(SUPPLIER_SESSION_KEY, row.session_token);
    writeJson(SUPPLIER_PROFILE_KEY, supplier);
    return { success: true };
  };

  const loginAsGuest = () => {
    setCurrentCompany(null);
    setCompanySessionToken(null);
    removeStored(COMPANY_SESSION_KEY);
    removeStored(COMPANY_PROFILE_KEY);
  };

  const logout = () => {
    setCurrentCompany(null);
    setCompanySessionToken(null);
    removeStored(COMPANY_SESSION_KEY);
    removeStored(COMPANY_PROFILE_KEY);
  };

  const logoutSuperAdmin = () => {
    setIsSuperAdmin(false);
    setSuperAdminSessionToken(null);
    setCompanies(supabaseEnabled ? [] : companies);
    removeStored(SUPER_ADMIN_SESSION_KEY);
  };

  const logoutSupplier = () => {
    setSupplierSessionToken(null);
    setSupplierProfile(null);
    setCompanies([]);
    removeStored(SUPPLIER_SESSION_KEY);
    removeStored(SUPPLIER_PROFILE_KEY);
  };

  const addSupplier = async (supplier: SupplierInput): ActionResult<{ supplier?: ManagedSupplier }> => {
    const cleanPin = normalizePin(supplier.pin);
    if (!supplier.name.trim()) return { success: false, error: 'El proveedor necesita un nombre' };
    if (cleanPin.length !== 6) return { success: false, error: 'El PIN debe tener 6 digitos' };
    if (!superAdminSessionToken) return { success: false, error: 'Sesion de Super Admin caducada' };
    const { data, error } = await supabase.rpc('admin_create_supplier', {
      p_admin_token: superAdminSessionToken,
      p_supplier: supplierToPayload({ ...supplier, id: `supplier-${Date.now()}` }),
      p_pin: cleanPin,
    });
    const created = data?.[0] ? toSupplier(data[0]) : null;
    if (error || !created) return { success: false, error: error?.message || 'No se pudo crear el proveedor' };
    setSuppliers(current => [created, ...current]);
    return { success: true, supplier: created };
  };

  const updateSupplier = async (id: string, updates: Partial<SupplierInput>): ActionResult<{ supplier?: ManagedSupplier }> => {
    if (!superAdminSessionToken) return { success: false, error: 'Sesion de Super Admin caducada' };
    const cleanPin = updates.pin ? normalizePin(updates.pin) : '';
    const { data, error } = await supabase.rpc('admin_update_supplier', {
      p_admin_token: superAdminSessionToken,
      p_supplier_id: id,
      p_updates: supplierToPayload(updates),
      p_pin: cleanPin || null,
    });
    const updated = data?.[0] ? toSupplier(data[0]) : null;
    if (error || !updated) return { success: false, error: error?.message || 'No se pudo actualizar el proveedor' };
    setSuppliers(current => current.map(item => item.id === id ? { ...updated, pin: updated.pin || cleanPin } : item));
    return { success: true, supplier: updated };
  };

  const removeSupplier = async (id: string) => {
    if (!superAdminSessionToken) return;
    const { error } = await supabase.rpc('admin_delete_supplier', { p_admin_token: superAdminSessionToken, p_supplier_id: id });
    if (!error) setSuppliers(current => current.filter(item => item.id !== id));
  };

  const ensureCompanyCanUsePinLocally = (pin: string, currentId?: string) => {
    const cleanPin = normalizePin(pin);
    if (cleanPin.length !== 6) {
      return { success: false, error: 'El PIN debe tener 6 digitos' };
    }
    if (companies.some(company => company.pin === cleanPin && company.id !== currentId)) {
      return { success: false, error: 'Ese PIN ya esta asignado a otra empresa' };
    }
    return { success: true, pin: cleanPin };
  };

  const addCompany = async (company: CompanyInput): ActionResult<{ company?: ManagedCompany }> => {
    const name = company.name.trim();
    if (!name) return { success: false, error: 'La empresa necesita un nombre' };
    const legalName = company.legalName?.trim() ?? '';
    if (!legalName) return { success: false, error: 'El cliente necesita un nombre fiscal' };

    const cleanPin = normalizePin(company.pin);
    if (cleanPin.length !== 6) return { success: false, error: 'El PIN debe tener 6 digitos' };

    const nextCompany: ManagedCompany = {
      ...company,
      id: createCompanyId(name),
      name,
      legalName,
      pin: cleanPin,
      pinHint: cleanPin.slice(-2),
      active: company.active,
      createdAt: new Date().toISOString(),
    };

    if (supabaseEnabled) {
      if (!superAdminSessionToken) return { success: false, error: 'Sesion de Super Admin caducada' };
      const { data, error } = await supabase.rpc('admin_create_company', {
        p_admin_token: superAdminSessionToken,
        p_company: companyToPayload(nextCompany),
        p_pin: cleanPin,
      });
      const created = data?.[0] ? toCompany(data[0]) : null;
      if (error || !created) return { success: false, error: error?.message || 'No se pudo crear la empresa' };

      setCompanies(prev => [created, ...prev.filter(item => item.id !== created.id)]);
      return { success: true, company: created };
    }

    const pinCheck = ensureCompanyCanUsePinLocally(cleanPin);
    if (!pinCheck.success) return pinCheck;

    setCompanies(prev => [nextCompany, ...prev]);
    return { success: true, company: nextCompany };
  };

  const updateCompany = async (id: string, updates: Partial<CompanyInput>): ActionResult<{ company?: ManagedCompany }> => {
    const company = companies.find(item => item.id === id);
    if (!company) return { success: false, error: 'Empresa no encontrada' };

    const cleanUpdates = { ...updates };
    const cleanPin = cleanUpdates.pin ? normalizePin(cleanUpdates.pin) : '';
    if (cleanUpdates.pin !== undefined && cleanPin.length > 0 && cleanPin.length !== 6) {
      return { success: false, error: 'El PIN debe tener 6 digitos' };
    }
    if (cleanUpdates.name !== undefined && !cleanUpdates.name.trim()) {
      return { success: false, error: 'La empresa necesita un nombre' };
    }
    if (cleanUpdates.legalName !== undefined && !cleanUpdates.legalName.trim()) {
      return { success: false, error: 'El nombre fiscal es obligatorio' };
    }

    if (supabaseEnabled) {
      if (!superAdminSessionToken) return { success: false, error: 'Sesion de Super Admin caducada' };
      const { data, error } = await supabase.rpc('admin_update_company', {
        p_admin_token: superAdminSessionToken,
        p_company_id: id,
        p_updates: companyToPayload(cleanUpdates),
        p_pin: cleanPin || null,
      });
      const updated = data?.[0] ? toCompany(data[0]) : null;
      if (error || !updated) return { success: false, error: error?.message || 'No se pudo guardar la empresa' };

      setCompanies(prev => prev.map(item => item.id === id ? { ...updated, pin: updated.pin || cleanPin || '' } : item));
      return { success: true, company: updated };
    }

    if (cleanPin) {
      const pinCheck = ensureCompanyCanUsePinLocally(cleanPin, id);
      if (!pinCheck.success) return pinCheck;
      cleanUpdates.pin = cleanPin;
    }

    const updatedCompany: ManagedCompany = {
      ...company,
      ...cleanUpdates,
      name: cleanUpdates.name?.trim() ?? company.name,
      legalName: cleanUpdates.legalName?.trim() ?? company.legalName,
      pin: cleanPin || company.pin,
      pinHint: cleanPin ? cleanPin.slice(-2) : company.pinHint,
    };

    setCompanies(prev => prev.map(item => item.id === id ? updatedCompany : item));
    return { success: true, company: updatedCompany };
  };

  const removeCompany = async (id: string) => {
    setCompanies(prev => prev.filter(company => company.id !== id));

    if (supabaseEnabled && superAdminSessionToken) {
      const { error } = await supabase.rpc('admin_delete_company', {
        p_admin_token: superAdminSessionToken,
        p_company_id: id,
      });
      if (error) console.error('Error deleting company:', error);
    }

    if (currentCompany?.id === id) logout();
  };

  const value = useMemo<AuthContextType>(() => ({
    isLoggedIn: Boolean(currentCompany),
    isGuest: !currentCompany,
    isSuperAdmin,
    isSupplier,
    userEmail,
    userProfile: currentCompany,
    currentCompany,
    companies,
    suppliers,
    supplierProfile,
    companySessionToken,
    superAdminSessionToken,
    supplierSessionToken,
    loginWithPin,
    login: loginAsSuperAdmin,
    loginAsSuperAdmin,
    loginSuperAdminWithPin,
    loginSupplierWithPin,
    loginAsGuest,
    logout,
    logoutSuperAdmin,
    logoutSupplier,
    addCompany,
    updateCompany,
    removeCompany,
    generatePin,
    refreshCompanies,
    addSupplier,
    updateSupplier,
    removeSupplier,
    generateSupplierPin,
  }), [currentCompany, isSuperAdmin, isSupplier, userEmail, companies, suppliers, supplierProfile, companySessionToken, superAdminSessionToken, supplierSessionToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
