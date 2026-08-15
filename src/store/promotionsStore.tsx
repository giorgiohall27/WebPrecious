import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export interface Promotion {
  productId: string;
  promoPrice: number;
  active: boolean;
}

interface PromotionsContextType {
  promotions: Promotion[];
  upsertPromotion: (promotion: Promotion) => void;
  removePromotion: (productId: string) => void;
  clearPromotions: () => void;
}

const STORAGE_KEY = 'webprecious-weekly-promotions';
const PromotionsContext = createContext<PromotionsContextType | undefined>(undefined);

function readPromotions() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item.productId && Number(item.promoPrice) >= 0) : [];
  } catch {
    return [];
  }
}

export function PromotionsProvider({ children }: { children: ReactNode }) {
  const [promotions, setPromotions] = useState<Promotion[]>(readPromotions);

  const writePromotions = useCallback((next: Promotion[]) => {
    setPromotions(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const upsertPromotion = useCallback((promotion: Promotion) => {
    writePromotions(
      promotions.some(item => item.productId === promotion.productId)
        ? promotions.map(item => item.productId === promotion.productId ? promotion : item)
        : [...promotions, promotion],
    );
  }, [promotions, writePromotions]);

  const removePromotion = useCallback((productId: string) => {
    writePromotions(promotions.filter(item => item.productId !== productId));
  }, [promotions, writePromotions]);

  const clearPromotions = useCallback(() => {
    writePromotions([]);
  }, [writePromotions]);

  const value = useMemo(
    () => ({ promotions, upsertPromotion, removePromotion, clearPromotions }),
    [clearPromotions, promotions, removePromotion, upsertPromotion],
  );

  return React.createElement(PromotionsContext.Provider, { value, children });
}

export function usePromotions() {
  const context = useContext(PromotionsContext);
  if (!context) throw new Error('usePromotions must be used within PromotionsProvider');
  return context;
}
