import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ManagedCompany, SuperAdmin } from '../types';
import { supabase, supabaseEnabled } from '../lib/supabase';

const SUPER_ADMIN_PASSWORD = 'Levi1234';

const COMPANIES_STORAGE_KEY = 'webprecious.companies.v2';
const COMPANY_SESSION_KEY = 'webprecious.companySession.v2';
const SUPER_ADMIN_SESSION_KEY = 'webprecious.superAdminSession.v2';

type CompanyInput = Omit<ManagedCompany, 'id' | 'createdAt'>;

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
    name: 'Hotel Costa Demo',
    cif: 'B12345678',
    email: 'compras@hotelcosta.es',
    phone: '+34 900 111 222',
    contactPerson: 'Responsable de compras',
    deliveryAddress: 'Avenida del Mar 18, 29640 Fuengirola',
    pin: '123456',
    active: true,
    createdAt: '2026-03-20T00:00:00.000Z',
    notes: 'Cliente demo hosteleria',
  },
  {
    id: 'comp-market-sol',
    name: 'Market Sol S.L.',
    cif: 'B23456789',
    email: 'pedidos@marketsol.es',
    phone: '+34 911 222 333',
    contactPerson: 'Laura Martinez',
    deliveryAddress: 'Calle Sol 24, 28004 Madrid',
    pin: '234567',
    active: true,
    createdAt: '2026-03-20T00:00:00.000Z',
    notes: 'Cliente demo retail',
  },
  {
    id: 'comp-restaurante-marina',
    name: 'Restaurante Marina',
    cif: 'B34567890',
    email: 'compras@restaurantemarina.es',
    phone: '+34 952 333 444',
    contactPerson: 'David Ruiz',
    deliveryAddress: 'Paseo Maritimo 7, 29016 Malaga',
    pin: '345678',
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
  return {
    id: row.id,
    name: row.name,
    cif: row.cif ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    contactPerson: row.contact_person ?? '',
    deliveryAddress: row.delivery_address ?? '',
    pin: row.pin,
    active: row.active,
    createdAt: row.created_at ?? new Date().toISOString(),
    notes: row.notes ?? '',
  };
}

function toSuperAdmin(row: any): SuperAdmin {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    pin: row.pin,
    active: row.active,
    createdAt: row.created_at ?? new Date().toISOString(),
    notes: row.notes ?? '',
  };
}

function fromCompany(company: ManagedCompany) {
  return {
    id: company.id,
    name: company.name,
    cif: company.cif,
    email: company.email,
    phone: company.phone,
    contact_person: company.contactPerson,
    delivery_address: company.deliveryAddress,
    pin: company.pin,
    active: company.active,
    notes: company.notes ?? null,
    created_at: company.createdAt,
  };
}

interface AuthContextType {
  isLoggedIn: boolean;
  isGuest: boolean;
  isSuperAdmin: boolean;
  userEmail: string | null;
  userProfile: ManagedCompany | null;
  currentCompany: ManagedCompany | null;
  companies: ManagedCompany[];
  loginWithPin: (pin: string) => { success: boolean; error?: string };
  login: (email: string, password: string) => { success: boolean; error?: string };
  loginAsSuperAdmin: (email: string, password: string) => { success: boolean; error?: string };
  loginSuperAdminWithPin: (pin: string) => { success: boolean; error?: string };
  loginAsGuest: () => void;
  logout: () => void;
  logoutSuperAdmin: () => void;
  addCompany: (company: CompanyInput) => { success: boolean; error?: string; company?: ManagedCompany };
  updateCompany: (id: string, updates: Partial<CompanyInput>) => { success: boolean; error?: string };
  removeCompany: (id: string) => void;
  generatePin: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>(defaultSuperAdmins);
  const [companies, setCompanies] = useState<ManagedCompany[]>(() => {
    const stored = readJson<ManagedCompany[]>(COMPANIES_STORAGE_KEY, defaultCompanies);
    return stored.length > 0 ? stored : defaultCompanies;
  });
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(() => readText(COMPANY_SESSION_KEY));
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => readText(SUPER_ADMIN_SESSION_KEY) === 'true');

  const currentCompany = useMemo(
    () => companies.find(company => company.id === currentCompanyId && company.active) ?? null,
    [companies, currentCompanyId]
  );

  useEffect(() => {
    if (!supabaseEnabled) return;

    Promise.all([
      supabase.from('super_admins').select('*').order('name', { ascending: true }),
      supabase.from('companies').select('*').order('name', { ascending: true }),
    ]).then(([superAdminsResult, companiesResult]) => {
      if (superAdminsResult.error) {
        console.error('Error loading super admins:', superAdminsResult.error);
      } else if (superAdminsResult.data?.length) {
        setSuperAdmins(superAdminsResult.data.map(toSuperAdmin));
      }

      if (companiesResult.error) {
        console.error('Error loading companies:', companiesResult.error);
      } else if (companiesResult.data?.length) {
        setCompanies(companiesResult.data.map(toCompany));
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    if (!currentCompanyId) return;
    const companyExists = companies.some(company => company.id === currentCompanyId && company.active);
    if (!companyExists) {
      setCurrentCompanyId(null);
      removeStored(COMPANY_SESSION_KEY);
    }
  }, [companies, currentCompanyId]);

  const generatePin = () => {
    let pin = '';
    do {
      pin = String(Math.floor(100000 + Math.random() * 900000));
    } while (companies.some(company => company.pin === pin));
    return pin;
  };

  const loginWithPin = (pin: string): { success: boolean; error?: string } => {
    const cleanPin = normalizePin(pin);
    if (cleanPin.length !== 6) {
      return { success: false, error: 'Introduce un PIN de 6 digitos' };
    }

    const company = companies.find(item => item.pin === cleanPin);
    if (!company) {
      return { success: false, error: 'PIN no encontrado' };
    }
    if (!company.active) {
      return { success: false, error: 'Esta empresa esta desactivada' };
    }

    setCurrentCompanyId(company.id);
    writeText(COMPANY_SESSION_KEY, company.id);
    return { success: true };
  };

  const loginAsSuperAdmin = (email: string, password: string): { success: boolean; error?: string } => {
    const admin = superAdmins.find(item => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!admin) {
      return { success: false, error: 'Email de Super Admin incorrecto' };
    }
    if (password !== SUPER_ADMIN_PASSWORD) {
      return { success: false, error: 'Clave de Super Admin incorrecta' };
    }
    if (!admin.active) {
      return { success: false, error: 'Este Super Admin esta desactivado' };
    }

    setIsSuperAdmin(true);
    writeText(SUPER_ADMIN_SESSION_KEY, 'true');
    return { success: true };
  };

  const loginSuperAdminWithPin = (pin: string): { success: boolean; error?: string } => {
    const cleanPin = normalizePin(pin);
    if (cleanPin.length !== 6) {
      return { success: false, error: 'Introduce un PIN de 6 digitos' };
    }
    const admin = superAdmins.find(item => item.pin === cleanPin);
    if (!admin) {
      return { success: false, error: 'PIN de Super Admin incorrecto' };
    }
    if (!admin.active) {
      return { success: false, error: 'Este Super Admin esta desactivado' };
    }

    setIsSuperAdmin(true);
    writeText(SUPER_ADMIN_SESSION_KEY, 'true');
    return { success: true };
  };

  const loginAsGuest = () => {
    setCurrentCompanyId(null);
    removeStored(COMPANY_SESSION_KEY);
  };

  const logout = () => {
    setCurrentCompanyId(null);
    removeStored(COMPANY_SESSION_KEY);
  };

  const logoutSuperAdmin = () => {
    setIsSuperAdmin(false);
    removeStored(SUPER_ADMIN_SESSION_KEY);
  };

  const ensureCompanyCanUsePin = (pin: string, currentId?: string) => {
    const cleanPin = normalizePin(pin);
    if (cleanPin.length !== 6) {
      return { success: false, error: 'El PIN debe tener 6 digitos' };
    }
    if (companies.some(company => company.pin === cleanPin && company.id !== currentId)) {
      return { success: false, error: 'Ese PIN ya esta asignado a otra empresa' };
    }
    return { success: true, pin: cleanPin };
  };

  const addCompany = (company: CompanyInput) => {
    const pinCheck = ensureCompanyCanUsePin(company.pin);
    if (!pinCheck.success || !pinCheck.pin) return pinCheck;

    const name = company.name.trim();
    if (!name) {
      return { success: false, error: 'La empresa necesita un nombre' };
    }

    const nextCompany: ManagedCompany = {
      ...company,
      id: createCompanyId(name),
      name,
      pin: pinCheck.pin,
      active: company.active,
      createdAt: new Date().toISOString(),
    };

    setCompanies(prev => [nextCompany, ...prev]);
    if (supabaseEnabled) {
      supabase.from('companies').upsert(fromCompany(nextCompany), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Error saving company:', error);
      });
    }
    return { success: true, company: nextCompany };
  };

  const updateCompany = (id: string, updates: Partial<CompanyInput>) => {
    const company = companies.find(item => item.id === id);
    if (!company) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    const cleanUpdates = { ...updates };
    if (cleanUpdates.pin !== undefined) {
      const pinCheck = ensureCompanyCanUsePin(cleanUpdates.pin, id);
      if (!pinCheck.success || !pinCheck.pin) return pinCheck;
      cleanUpdates.pin = pinCheck.pin;
    }

    if (cleanUpdates.name !== undefined && !cleanUpdates.name.trim()) {
      return { success: false, error: 'La empresa necesita un nombre' };
    }

    const updatedCompany: ManagedCompany = {
      ...company,
      ...cleanUpdates,
      name: cleanUpdates.name?.trim() ?? company.name,
    };

    setCompanies(prev => prev.map(item => item.id === id ? updatedCompany : item));
    if (supabaseEnabled) {
      supabase.from('companies').upsert(fromCompany(updatedCompany), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Error updating company:', error);
      });
    }
    return { success: true };
  };

  const removeCompany = (id: string) => {
    setCompanies(prev => prev.filter(company => company.id !== id));
    if (supabaseEnabled) {
      supabase.from('companies').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting company:', error);
      });
    }
    if (currentCompanyId === id) logout();
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: Boolean(currentCompany),
        isGuest: !currentCompany,
        isSuperAdmin,
        userEmail: currentCompany?.email ?? null,
        userProfile: currentCompany,
        currentCompany,
        companies,
        loginWithPin,
        login: loginAsSuperAdmin,
        loginAsSuperAdmin,
        loginSuperAdminWithPin,
        loginAsGuest,
        logout,
        logoutSuperAdmin,
        addCompany,
        updateCompany,
        removeCompany,
        generatePin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
