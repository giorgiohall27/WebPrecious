import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { useAuth } from './authStore';

export interface Promotion {
  productId: string;
  promoPrice: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
}

interface PromotionsContextType {
  promotions: Promotion[];
  loading: boolean;
  upsertPromotion: (promotion: Promotion) => Promise<{ success: boolean; error?: string }>;
  upsertPromotions: (promotions: Promotion[]) => Promise<{ success: boolean; error?: string }>;
  removePromotion: (productId: string) => Promise<{ success: boolean; error?: string }>;
  clearPromotions: () => Promise<{ success: boolean; error?: string }>;
}

const STORAGE_KEY = 'webprecious-weekly-promotions';
const PromotionsContext = createContext<PromotionsContextType | undefined>(undefined);

function persistPromotions(promotions: Promotion[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
  } catch (error) {
    console.error('No se pudieron guardar las promociones en el dispositivo:', error);
  }
}

function readPromotions() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    const now = Date.now();
    return Array.isArray(parsed) ? parsed.filter(item =>
      item.productId && Number(item.promoPrice) >= 0 && item.endsAt && new Date(item.endsAt).getTime() > now
    ) : [];
  } catch {
    return [];
  }
}

function toPromotion(row: any): Promotion {
  return {
    productId: row.product_id ?? row.productId,
    promoPrice: Number(row.promo_price ?? row.promoPrice),
    active: row.active !== false,
    startsAt: row.starts_at ?? row.startsAt,
    endsAt: row.ends_at ?? row.endsAt,
  };
}

function mergePromotions(current: Promotion[], incoming: Promotion[]) {
  const replacements = new Map(incoming.map(promotion => [promotion.productId, promotion]));
  return [
    ...current.map(promotion => replacements.get(promotion.productId) ?? promotion),
    ...incoming.filter(promotion => !current.some(item => item.productId === promotion.productId)),
  ];
}

export function PromotionsProvider({ children }: { children: ReactNode }) {
  const { companySessionToken, superAdminSessionToken, supplierSessionToken } = useAuth();
  const catalogToken = companySessionToken || superAdminSessionToken || supplierSessionToken;
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(Boolean(supabaseEnabled && catalogToken));

  const writePromotions = useCallback((next: Promotion[]) => {
    setPromotions(next);
    persistPromotions(next);
  }, []);

  const saveLocally = useCallback((incoming: Promotion[]) => {
    setPromotions(current => {
      const next = mergePromotions(current, incoming);
      persistPromotions(next);
      return next;
    });
  }, []);

  const upsertPromotions = useCallback(async (incoming: Promotion[]) => {
    if (incoming.length === 0) return { success: true };
    saveLocally(incoming);

    if (!supabaseEnabled) return { success: true };
    if (!superAdminSessionToken) return { success: false, error: 'La sesión de Super Admin ha caducado.' };

    const payload = incoming.map(promotion => ({
      product_id: promotion.productId,
      promo_price: promotion.promoPrice,
      active: promotion.active,
      starts_at: promotion.startsAt,
      ends_at: promotion.endsAt,
    }));
    const { data, error } = await supabase.rpc('admin_upsert_promotions', {
      p_admin_token: superAdminSessionToken,
      p_promotions: payload,
    });
    if (error) {
      console.error('Error saving promotions:', error);
      return { success: false, error: 'La oferta se ve en este dispositivo, pero no se pudo guardar en la nube.' };
    }

    const saved = (data ?? []).map(toPromotion);
    if (saved.length > 0) saveLocally(saved);
    return { success: true };
  }, [saveLocally, superAdminSessionToken]);

  const upsertPromotion = useCallback(
    (promotion: Promotion) => upsertPromotions([promotion]),
    [upsertPromotions],
  );

  const removePromotion = useCallback(async (productId: string) => {
    setPromotions(current => {
      const next = current.filter(item => item.productId !== productId);
      persistPromotions(next);
      return next;
    });

    if (!supabaseEnabled) return { success: true };
    if (!superAdminSessionToken) return { success: false, error: 'La sesión de Super Admin ha caducado.' };
    const { error } = await supabase.rpc('admin_delete_promotion', {
      p_admin_token: superAdminSessionToken,
      p_product_id: productId,
    });
    return error
      ? { success: false, error: 'No se pudo eliminar la oferta de la nube.' }
      : { success: true };
  }, [superAdminSessionToken]);

  const clearPromotions = useCallback(async () => {
    writePromotions([]);
    if (!supabaseEnabled) return { success: true };
    if (!superAdminSessionToken) return { success: false, error: 'La sesión de Super Admin ha caducado.' };
    const { error } = await supabase.rpc('admin_clear_promotions', {
      p_admin_token: superAdminSessionToken,
    });
    return error
      ? { success: false, error: 'No se pudieron eliminar las ofertas de la nube.' }
      : { success: true };
  }, [superAdminSessionToken, writePromotions]);

  useEffect(() => {
    if (!catalogToken) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    if (!supabaseEnabled) {
      setPromotions(readPromotions());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase.rpc('list_active_promotions', { p_session_token: catalogToken }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error('Error loading promotions:', error);
        setLoading(false);
        return;
      }
      const remote = (data ?? []).map(toPromotion);
      setPromotions(current => {
        const activeLocal = current.filter(item => new Date(item.endsAt).getTime() > Date.now());
        const combined = mergePromotions(activeLocal, remote);
        persistPromotions(combined);
        return combined;
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [catalogToken]);

  useEffect(() => {
    const removeExpired = () => {
      const now = Date.now();
      setPromotions(current => {
        const active = current.filter(item => item.endsAt && new Date(item.endsAt).getTime() > now);
        if (active.length === current.length) return current;
        persistPromotions(active);
        return active;
      });
    };
    removeExpired();
    const timer = window.setInterval(removeExpired, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncPromotions = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && catalogToken) setPromotions(readPromotions());
    };
    window.addEventListener('storage', syncPromotions);
    return () => window.removeEventListener('storage', syncPromotions);
  }, [catalogToken]);

  const value = useMemo(
    () => ({ promotions, loading, upsertPromotion, upsertPromotions, removePromotion, clearPromotions }),
    [clearPromotions, loading, promotions, removePromotion, upsertPromotion, upsertPromotions],
  );

  return React.createElement(PromotionsContext.Provider, { value, children });
}

export function usePromotions() {
  const context = useContext(PromotionsContext);
  if (!context) throw new Error('usePromotions must be used within PromotionsProvider');
  return context;
}
