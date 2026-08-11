import { Injectable } from '@angular/core';
import { Articulo } from '../models';
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

  getAll(): Promise<Articulo[]> {
    return this.store.getAll();
  }

  async crear(datos: DatosNuevoArticulo): Promise<Articulo> {
    const todos = await this.store.getAll();
    const nuevo: Articulo = {
      id: crypto.randomUUID(),
      nombre: datos.nombre,
      fotoUri: datos.fotoUri,
      fechaRegistro: new Date().toISOString(),
      pesoKg: datos.pesoKg,
      fragil: datos.fragil ?? false,
      esencial: datos.esencial ?? false,
    };
    todos.push(nuevo);
    await this.store.saveAll(todos);
    return nuevo;
  }

  async eliminar(articuloId: string): Promise<void> {
    const todos = await this.store.getAll();
    await this.store.saveAll(todos.filter((a) => a.id !== articuloId));
    // limpieza de huérfanos en las dos relaciones (ver ROADMAP-mudanza.md)
    await Promise.all([
      this.asignacionCajaService.eliminarPorArticulo(articuloId),
      this.articuloCategoriaService.eliminarPorArticulo(articuloId),
    ]);
  }

  async buscarPorNombre(texto: string): Promise<Articulo[]> {
    const todos = await this.store.getAll();
    const q = texto.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter((a) => a.nombre.toLowerCase().includes(q));
  }

  /** Artículos registrados que todavía no se asignaron a ninguna caja. */
  async getSinAsignar(): Promise<Articulo[]> {
    const [todos, asignaciones] = await Promise.all([this.store.getAll(), this.asignacionCajaService.getAll()]);
    const idsAsignados = new Set(asignaciones.map((a) => a.articuloId));
    return todos.filter((a) => !idsAsignados.has(a.id));
  }
}
