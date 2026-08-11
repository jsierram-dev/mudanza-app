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
}
