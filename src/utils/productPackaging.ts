import { Product } from '../types';

const PACKAGING_PATTERNS = [
  /\b(\d{1,3})\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|gr|gramos|kg|ml|cl|l|lt|oz)\b/i,
  /\b\d+\s*pk\s*x\s*(\d{1,3})\b/i,
  /\b\d+\s*pk\s+(\d{1,3})\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|gr|gramos|kg|ml|cl|l|lt|oz)\b/i,
  /\b(\d{1,3})\s*(?:uds?|unidades|units?)\s*x\s*\d+/i,
  /\b(?:caja|box|pack|case|display)\s*(?:de|of)?\s*(\d{1,3})\b/i,
  /\b(?:c\/|cx)\s*(\d{1,3})\b/i,
];

export function inferUnitsPerBox(...sources: Array<string | null | undefined>) {
  for (const source of sources) {
    if (!source) continue;
    for (const pattern of PACKAGING_PATTERNS) {
      const match = source.match(pattern);
      const value = Number.parseInt(match?.[1] ?? '', 10);
      if (value > 0) return value;
    }
  }
  return undefined;
}

export function normalizeProductPackaging(product: Product): Product {
  const inferred = inferUnitsPerBox(product.description, product.unitMeasure, product.name);
  return {
    ...product,
    unitsPerBox: inferred ?? product.unitsPerBox ?? 1,
  };
}

function formatMeasure(value: string) {
  return value
    .trim()
    .replace(/\s*[xX×]\s*/g, ' × ')
    .replace(/(\d+(?:[.,]\d+)?)\s*(kg|gr|g|ml|cl|lt|l|oz)\b/gi, (_, amount: string, unit: string) => {
      const normalizedUnit = unit.toLowerCase() === 'gr' ? 'g' : unit.toLowerCase() === 'lt' ? 'l' : unit.toLowerCase();
      return `${amount.replace(',', '.')} ${normalizedUnit}`;
    })
    .replace(/(\d+)\s*pk\b/gi, '$1 pack')
    .replace(/\s+/g, ' ');
}

export function formatProductPackaging(product: Pick<Product, 'unitMeasure' | 'unitsPerBox'>) {
  const measure = formatMeasure(product.unitMeasure ?? '');
  const unitsPerBox = product.unitsPerBox || 1;

  if (!measure) return `${unitsPerBox} ud.`;
  if (/^\d+\s*(?:×|pack\b)/i.test(measure)) return measure;
  return unitsPerBox > 1 ? `${unitsPerBox} × ${measure}` : measure;
}
