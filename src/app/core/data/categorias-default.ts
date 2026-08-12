import { Categoria } from '../models';

/**
 * Semilla inicial de categorías, sembrada una sola vez en el primer arranque
 * (ver CategoriaService.getAll). id=slug: estable, legible, sin necesidad de
 * generar UUID para datos que ya conocemos de antemano. El usuario puede
 * agregar categorías propias después — esto no es una lista cerrada.
 *
 * actualizadoEn/eliminadoEn presentes solo para cumplir la interfaz Categoria
 * (todo lo sincronizable los necesita) — en la práctica no importan: los
 * defaults NUNCA viajan a mudanza-back (ver CategoriaService.getAllParaSync),
 * cada dispositivo los siembra localmente por su cuenta.
 */
export const CATEGORIAS_DEFAULT: Categoria[] = [
  { id: 'electronica', nombre: 'Electrónica' },
  { id: 'ropa', nombre: 'Ropa y calzado' },
  { id: 'cocina', nombre: 'Cocina y electrodomésticos' },
  { id: 'bano', nombre: 'Baño y aseo personal' },
  { id: 'libros', nombre: 'Libros y papelería' },
  { id: 'decoracion', nombre: 'Decoración' },
  { id: 'juguetes', nombre: 'Juguetes' },
  { id: 'herramientas', nombre: 'Herramientas' },
  { id: 'documentos', nombre: 'Documentos importantes' },
  { id: 'muebles', nombre: 'Muebles' },
  { id: 'jardin', nombre: 'Jardín y exterior' },
  { id: 'otros', nombre: 'Otros' },
].map((c) => ({ ...c, actualizadoEn: '2026-01-01T00:00:00.000Z', eliminadoEn: null }));
