import { StorageService } from './storage.service';

/**
 * Helper (no @Injectable propio, se instancia dentro de cada service de
 * entidad) para no repetir el patrón "leer array bajo una key, default []"
 * en cada uno de los services de core/.
 */
export class CollectionStore<T> {
  constructor(
    private storageService: StorageService,
    private key: string,
  ) {}

  async getAll(): Promise<T[]> {
    return (await this.storageService.get<T[]>(this.key)) ?? [];
  }

  async saveAll(items: T[]): Promise<void> {
    await this.storageService.set(this.key, items);
  }

  /**
   * Mezcla filas que vienen de mudanza-back (ya sea `actualizaciones` de un
   * sync, o una resolución de conflicto) con lo que ya hay en local — por
   * `keyFn`, no por posición. Confía en los valores tal cual llegan (incluido
   * `actualizadoEn`): esto es aplicar lo que el servidor ya decidió, no una
   * escritura local nueva que deba tocar sus propias marcas.
   */
  async upsertMany(nuevas: T[], keyFn: (item: T) => string): Promise<void> {
    if (!nuevas.length) return;
    const todas = await this.getAll();
    const porKey = new Map(todas.map((item) => [keyFn(item), item]));
    for (const nueva of nuevas) {
      porKey.set(keyFn(nueva), nueva);
    }
    await this.saveAll([...porKey.values()]);
  }
}
