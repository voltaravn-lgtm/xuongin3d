import type { ProductVariant } from '../types';

export const VARIANT_TEMPLATES_KEY = 'xuong-in-3d-variant-templates-v1';
export type VariantTemplates = Record<string, { name: string; size: string }>;

export function readVariantTemplates(raw: string | null): VariantTemplates {
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, value]) =>
      id && value && typeof value === 'object' && typeof value.name === 'string' && value.name.trim()
    ).map(([id, value]) => [id, { name: value.name.trim(), size: typeof value.size === 'string' ? value.size.trim() : '' }]));
  } catch { return {}; }
}

export function variantsFromTemplates(templates: VariantTemplates): ProductVariant[] {
  return Object.entries(templates).map(([id, template]) => ({ id, ...template }));
}
