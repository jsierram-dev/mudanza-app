import { Injectable } from '@angular/core';
import { Articulo } from '../models';
import { activos, ahora } from '../utils/sync-meta';
import { ArticuloCategoriaService } from './articulo-categoria.service';
import { AsignacionCajaService } from './asignacion-caja.service';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

export interface DatosNuevoArticulo {
  nombre: string;
  fotoUri: string;
  pesoKg?: number;
  fragil?: boolean;
  esencial?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ArticuloService {
  private store: CollectionStore<Articulo>;

  constructor(
    storageService: StorageService,
    private asignacionCajaService: AsignacionCajaService,
    private articuloCategoriaService: ArticuloCategoriaService,
  ) {
    this.store = new CollectionStore<Articulo>(storageService, 'articulos');
  }

  async getAll(): Promise<Articulo[]> {
    return activos(await this.store.getAll());
  }

  async getById(articuloId: string): Promise<Articulo | undefined> {
    const todos = await this.store.getAll();
    return activos(todos).find((a) => a.id === articuloId);
  }

  async crear(datos: DatosNuevoArticulo): Promise<Articulo> {
    const todos = await this.store.getAll();
    const nuevo: Articulo = {
      id: crypto.randomUUID(),
      nombre: datos.nombre,
      fotoUri: datos.fotoUri,
      fechaRegistro: ahora(),
      pesoKg: datos.pesoKg,
      fragil: datos.fragil ?? false,
      esencial: datos.esencial ?? false,
      actualizadoEn: ahora(),
      eliminadoEn: null,
    };
    todos.push(nuevo);
    await this.store.saveAll(todos);
    return nuevo;
  }

  /** Tombstone, no borrado real (ver ROADMAP-mudanza.md) — la fila se mantiene para sincronizar el borrado. */
  async eliminar(articuloId: string): Promise<void> {
    const todos = await this.store.getAll();
    const idx = todos.findIndex((a) => a.id === articuloId);
    if (idx === -1) return;
    todos[idx] = { ...todos[idx], eliminadoEn: ahora(), actualizadoEn: ahora() };
    await this.store.saveAll(todos);
    // limpieza de huérfanos en las dos relaciones (ver ROADMAP-mudanza.md)
    await Promise.all([
      this.asignacionCajaService.eliminarPorArticulo(articuloId),
      this.articuloCategoriaService.eliminarPorArticulo(articuloId),
    ]);
  }

  async buscarPorNombre(texto: string): Promise<Articulo[]> {
    const todos = await this.getAll();
    const q = texto.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter((a) => a.nombre.toLowerCase().includes(q));
  }

  /** Artículos registrados que todavía no se asignaron a ninguna caja. */
  async getSinAsignar(): Promise<Articulo[]> {
    const [todos, asignaciones] = await Promise.all([this.getAll(), this.asignacionCajaService.getAll()]);
    const idsAsignados = new Set(asignaciones.map((a) => a.articuloId));
    return todos.filter((a) => !idsAsignados.has(a.id));
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllParaSync(): Promise<Articulo[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  aplicarDesdeSync(filas: Articulo[]): Promise<void> {
    return this.store.upsertMany(filas, (a) => a.id);
  }
}
