/**
 * Todo lo que sincroniza con mudanza-back lleva estas dos marcas — ver
 * ROADMAP-mudanza.md, sección "Sincronización multi-dispositivo". Mismo
 * contrato que los DTOs del backend (mudanza-back/src/modules/sync/types.ts).
 */
export interface Syncable {
  updatedAt: string;
  deletedAt: string | null;
}

export function now(): string {
  return new Date().toISOString();
}

/** Filtra las filas borradas (tombstone) — lo que ve la UI, nunca lo que se manda a sync. */
export function active<T extends Syncable>(items: T[]): T[] {
  return items.filter((item) => item.deletedAt == null);
}
