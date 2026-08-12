import { Syncable } from '../utils/sync-meta';

/**
 * Deliberadamente SIN boxId y SIN moveId — ver ROADMAP-mudanza.md.
 * El artículo es un catálogo personal reusable entre mudanzas; su relación con
 * una caja (y por lo tanto con una mudanza) vive en BoxAssignment, no acá.
 */
export interface Item extends Syncable {
  id: string;
  name: string;
  photoUri: string;
  registeredAt: string;
  weightKg?: number; // peso unitario, opcional
  fragile: boolean;
  essential: boolean; // "abrir primero" — necesario apenas se llega
}
