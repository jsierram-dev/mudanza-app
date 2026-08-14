import { DEFAULT_CATEGORIES } from '../data/categories-default';
import { Category } from '../models';
import { TranslationKey } from '../i18n/en';

/**
 * Las 12 categorías por defecto (id=slug) tienen traducción propia — el
 * usuario puede crear categorías suyas (CategoryService.create), esas no se
 * pueden traducir (son texto libre) y se muestran tal cual quedaron guardadas.
 */
const DEFAULT_CATEGORY_KEYS: Record<string, TranslationKey> = {
  electronica: 'categories.electronica',
  ropa: 'categories.ropa',
  cocina: 'categories.cocina',
  bano: 'categories.bano',
  libros: 'categories.libros',
  decoracion: 'categories.decoracion',
  juguetes: 'categories.juguetes',
  herramientas: 'categories.herramientas',
  documentos: 'categories.documentos',
  muebles: 'categories.muebles',
  jardin: 'categories.jardin',
  otros: 'categories.otros',
};

const DEFAULT_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

export function categoryLabelKey(categoryId: string): TranslationKey | null {
  return DEFAULT_IDS.has(categoryId) ? (DEFAULT_CATEGORY_KEYS[categoryId] ?? null) : null;
}

/** t = TranslationService.t (o un bind equivalente) — ver core/services/translation.service.ts. */
export function categoryDisplayName(category: Category, t: (key: TranslationKey) => string): string {
  const key = categoryLabelKey(category.id);
  return key ? t(key) : category.name;
}
