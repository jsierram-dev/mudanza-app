import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

/**
 * Envoltorio delgado sobre Ionic Storage. El resto de los services de la app
 * NO deben inyectar `Storage` directamente — pasan por acá, para poder migrar
 * a otro motor (ej. @capacitor-community/sqlite) más adelante sin tocarlos
 * (ver ROADMAP-mudanza.md, sección "Arquitectura").
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private lista: Storage | null = null;
  private listo: Promise<void>;

  constructor(private ionicStorage: Storage) {
    this.listo = this.inicializar();
  }

  private async inicializar(): Promise<void> {
    this.lista = await this.ionicStorage.create();
  }

  async get<T>(key: string): Promise<T | null> {
    await this.listo;
    return (await this.lista!.get(key)) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.listo;
    await this.lista!.set(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.listo;
    await this.lista!.remove(key);
  }
}
