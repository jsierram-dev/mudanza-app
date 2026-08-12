import { Category } from '../models';

/**
 * Semilla inicial de categorías, sembrada una sola vez en el primer arranque
 * (ver CategoryService.getAll). id=slug: estable, legible, sin necesidad de
 * generar UUID para datos que ya conocemos de antemano. El usuario puede
 * agregar categorías propias después — esto no es una lista cerrada.
 *
 * updatedAt/deletedAt presentes solo para cumplir la interfaz Category (todo
 * lo sincronizable los necesita) — en la práctica no importan: los defaults
 * NUNCA viajan a mudanza-back (ver CategoryService.getAllForSync), cada
 * dispositivo los siembra localmente por su cuenta.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'electronica', name: 'Electrónica' },
  { id: 'ropa', name: 'Ropa y calzado' },
  { id: 'cocina', name: 'Cocina y electrodomésticos' },
  { id: 'bano', name: 'Baño y aseo personal' },
  { id: 'libros', name: 'Libros y papelería' },
  { id: 'decoracion', name: 'Decoración' },
  { id: 'juguetes', name: 'Juguetes' },
  { id: 'herramientas', name: 'Herramientas' },
  { id: 'documentos', name: 'Documentos importantes' },
  { id: 'muebles', name: 'Muebles' },
  { id: 'jardin', name: 'Jardín y exterior' },
  { id: 'otros', name: 'Otros' },
].map((c) => ({ ...c, updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null }));
