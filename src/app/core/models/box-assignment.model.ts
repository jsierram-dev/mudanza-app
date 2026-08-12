import { Syncable } from '../utils/sync-meta';

/**
 * Relación artículo↔caja. SIN id propio — la clave es la pareja
 * (itemId, boxId). Un artículo puede repartirse entre varias cajas
 * distintas (ej. 12 vasos: 6 en la caja 3, 6 en la caja 7), cada fila con su
 * propia cantidad; el total de unidades del artículo es la suma de sus
 * asignaciones. Un artículo sin ninguna fila = registrado pero aún no empacado.
 */
export interface BoxAssignment extends Syncable {
  itemId: string;
  boxId: string;
  quantity: number;
  assignedAt: string;
}
