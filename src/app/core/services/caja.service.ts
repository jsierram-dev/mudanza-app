import { Injectable } from '@angular/core';
import { Caja } from '../models';
import { AsignacionCajaService } from './asignacion-caja.service';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

/** Asset bundleado por defecto — ver ROADMAP-mudanza.md, sección "Diseños de caja". */
const FOTO_PORTADA_DEFAULT = 'assets/cajas/estandar.png';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private store: CollectionStore<Caja>;

  constructor(
    storageService: StorageService,
    private asignacionCajaService: AsignacionCajaService,
  ) {
    this.store = new CollectionStore<Caja>(storageService, 'cajas');
  }

  async getPorMudanza(mudanzaId: string): Promise<Caja[]> {
    const todas = await this.store.getAll();
    return todas.filter((c) => c.mudanzaId === mudanzaId);
  }

  async crear(
    mudanzaId: string,
    datos: Partial<Pick<Caja, 'nombre' | 'habitacionDestino' | 'fotoPortadaUri'>> = {},
  ): Promise<Caja> {
    const todas = await this.store.getAll();
    const deLaMudanza = todas.filter((c) => c.mudanzaId === mudanzaId);
    const siguienteNumero = deLaMudanza.length ? Math.max(...deLaMudanza.map((c) => c.numero)) + 1 : 1;

    const nueva: Caja = {
      id: crypto.randomUUID(),
      mudanzaId,
      numero: siguienteNumero,
      estado: 'vacia',
      fotoPortadaUri: datos.fotoPortadaUri ?? FOTO_PORTADA_DEFAULT,
      nombre: datos.nombre,
      habitacionDestino: datos.habitacionDestino,
    };
    todas.push(nueva);
    await this.store.saveAll(todas);
    return nueva;
  }

  async actualizar(caja: Caja): Promise<void> {
    const todas = await this.store.getAll();
    const idx = todas.findIndex((c) => c.id === caja.id);
    if (idx === -1) return;
    todas[idx] = caja;
    await this.store.saveAll(todas);
  }

  async eliminar(cajaId: string): Promise<void> {
    const todas = await this.store.getAll();
    await this.store.saveAll(todas.filter((c) => c.id !== cajaId));
    await this.asignacionCajaService.eliminarPorCaja(cajaId);
  }
}
