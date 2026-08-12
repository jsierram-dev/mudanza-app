import { Syncable } from '../utils/sync-meta';

/**
 * Relación many-to-many: un artículo puede tener varias categorías a la vez
 * (ej. "libro de cocina" → Libros + Cocina). SIN id propio — la clave es la
 * pareja (itemId, categoryId).
 */
export interface ItemCategory extends Syncable {
  itemId: string;
  categoryId: string;
}
