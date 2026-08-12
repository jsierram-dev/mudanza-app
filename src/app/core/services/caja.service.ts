import { Injectable } from '@angular/core';
import { Caja } from '../models';
import { activos, ahora } from '../utils/sync-meta';
import { ArticuloService } from './articulo.service';
import { AsignacionCajaService } from './asignacion-caja.service';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

/**
 * Asset bundleado por defecto — ver ROADMAP-mudanza.md, sección "Diseños de
 * caja". Exportado para que las pantallas puedan distinguir "todavía no
 * tiene foto propia" (mostrar placeholder) de "ya tiene una foto real"
 * (mostrarla con <app-foto>).
 */
export const FOTO_PORTADA_DEFAULT = 'assets/cajas/estandar.png';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private store: CollectionStore<Caja>;

  constructor(
    storageService: StorageService,
    private asignacionCajaService: AsignacionCajaService,
    private articuloService: ArticuloService,
  ) {
    this.store = new CollectionStore<Caja>(storageService, 'cajas');
  }

  async getPorMudanza(mudanzaId: string): Promise<Caja[]> {
    const todas = await this.store.getAll();
    return activos(todas).filter((c) => c.mudanzaId === mudanzaId);
  }

  async getById(cajaId: string): Promise<Caja | undefined> {
    const todas = await this.store.getAll();
    return activos(todas).find((c) => c.id === cajaId);
  }

  async crear(
    mudanzaId: string,
    datos: Partial<Pick<Caja, 'nombre' | 'habitacionDestino' | 'fotoPortadaUri'>> = {},
  ): Promise<Caja> {
    const todas = await this.store.getAll();
    const deLaMudanza = activos(todas).filter((c) => c.mudanzaId === mudanzaId);
    const siguienteNumero = deLaMudanza.length ? Math.max(...deLaMudanza.map((c) => c.numero)) + 1 : 1;

    const nueva: Caja = {
      id: crypto.randomUUID(),
      mudanzaId,
      numero: siguienteNumero,
      estado: 'vacia',
      fotoPortadaUri: datos.fotoPortadaUri ?? FOTO_PORTADA_DEFAULT,
      nombre: datos.nombre,
      habitacionDestino: datos.habitacionDestino,
      actualizadoEn: ahora(),
      eliminadoEn: null,
    };
    todas.push(nueva);
    await this.store.saveAll(todas);
    return nueva;
  }

  async actualizar(caja: Caja): Promise<void> {
    const todas = await this.store.getAll();
    const idx = todas.findIndex((c) => c.id === caja.id);
    if (idx === -1) return;
    todas[idx] = { ...caja, actualizadoEn: ahora() };
    await this.store.saveAll(todas);
  }

  /** Tombstone, no borrado real (ver ROADMAP-mudanza.md) — la fila se mantiene para sincronizar el borrado. */
  async eliminar(cajaId: string): Promise<void> {
    const todas = await this.store.getAll();
    const idx = todas.findIndex((c) => c.id === cajaId);
    if (idx === -1) return;
    todas[idx] = { ...todas[idx], eliminadoEn: ahora(), actualizadoEn: ahora() };
    await this.store.saveAll(todas);
    await this.asignacionCajaService.eliminarPorCaja(cajaId);
  }

  /**
   * Suma pesoKg × cantidad de cada artículo asignado a la caja. Artículos
   * sin pesoKg cargado cuentan como 0 — el total puede ser parcial si no
   * todos los artículos de la caja tienen peso registrado.
   */
  async pesoTotalKg(cajaId: string): Promise<number> {
    const asignaciones = await this.asignacionCajaService.getArticulosDeCaja(cajaId);
    const pesos = await Promise.all(
      asignaciones.map(async (a) => {
        const articulo = await this.articuloService.getById(a.articuloId);
        return (articulo?.pesoKg ?? 0) * a.cantidad;
      }),
    );
    return pesos.reduce((total, peso) => total + peso, 0);
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllParaSync(): Promise<Caja[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  aplicarDesdeSync(filas: Caja[]): Promise<void> {
    return this.store.upsertMany(filas, (c) => c.id);
  }
}
