/**
 * Todo lo que sincroniza con mudanza-back lleva estas dos marcas — ver
 * ROADMAP-mudanza.md, sección "Sincronización multi-dispositivo". Mismo
 * contrato que los DTOs del backend (mudanza-back/src/modules/sync/types.ts).
 */
export interface ConMarcaDeSync {
  actualizadoEn: string;
  eliminadoEn: string | null;
}

export function ahora(): string {
  return new Date().toISOString();
}

/** Filtra las filas borradas (tombstone) — lo que ve la UI, nunca lo que se manda a sync. */
export function activos<T extends ConMarcaDeSync>(items: T[]): T[] {
  return items.filter((item) => item.eliminadoEn == null);
}
