/**
 * Relación many-to-many: un artículo puede tener varias categorías a la vez
 * (ej. "libro de cocina" → Libros + Cocina). SIN id propio — la clave es la
 * pareja (articuloId, categoriaId).
 */
export interface ArticuloCategoria {
  articuloId: string;
  categoriaId: string;
}
