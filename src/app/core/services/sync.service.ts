import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Articulo } from '../models/articulo.model';
import { Caja, EstadoCaja } from '../models/caja.model';
import { ArticuloDto, CajaDto, ConflictosDto, SyncRequestBody, SyncResponseBody } from '../models/sync-dto.model';
import { ArticuloCategoriaService } from './articulo-categoria.service';
import { ArticuloService } from './articulo.service';
import { AsignacionCajaService } from './asignacion-caja.service';
import { AuthService } from './auth.service';
import { CajaService, FOTO_PORTADA_DEFAULT } from './caja.service';
import { CategoriaService } from './categoria.service';
import { FotoService } from './foto.service';
import { MudanzaService } from './mudanza.service';
import { StorageService } from './storage.service';

const KEY_ULTIMA_SINCRONIZACION = 'ultima_sincronizacion';
const KEY_CONFLICTOS_PENDIENTES = 'conflictos_pendientes';

export type ResultadoSync =
  | { ok: true; conflictos: number }
  | { ok: false; motivo: 'sin-sesion' | 'ya-en-curso' }
  | { ok: false; motivo: 'error'; error: unknown };

/** Ejecuta `fn`; si falla, no frena el resto del sync — una foto que no sube/baja no debe tirar todo abajo. */
async function intentar<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/**
 * Orquesta POST /sync: junta el snapshot local completo (services.*ParaSync,
 * tombstones incluidos), lo manda, aplica lo que el servidor devuelve
 * (services.aplicarDesdeSync) y guarda el nuevo `ultimaSincronizacion`.
 *
 * Conflictos reales: sin modal todavía (ver ROADMAP-mudanza.md) — se
 * cuentan y se guardan en storage para cuando exista esa pantalla, pero NO
 * se pisa nada local con la versión del servidor ni con la del cliente. El
 * próximo sync los vuelve a detectar igual, hasta que se resuelvan.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly storageService = inject(StorageService);
  private readonly fotoService = inject(FotoService);
  private readonly mudanzaService = inject(MudanzaService);
  private readonly cajaService = inject(CajaService);
  private readonly articuloService = inject(ArticuloService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly articuloCategoriaService = inject(ArticuloCategoriaService);
  private readonly asignacionCajaService = inject(AsignacionCajaService);

  readonly sincronizando = signal(false);
  readonly conflictosPendientes = signal(0);
  readonly ultimoError = signal<string | null>(null);

  private enCurso = false;

  async sincronizar(): Promise<ResultadoSync> {
    if (!this.authService.isAuthenticated()) return { ok: false, motivo: 'sin-sesion' };
    if (this.enCurso) return { ok: false, motivo: 'ya-en-curso' };

    this.enCurso = true;
    this.sincronizando.set(true);
    this.ultimoError.set(null);
    try {
      const [mudanzas, cajas, articulos, categorias, articuloCategorias, asignaciones] = await Promise.all([
        this.mudanzaService.getAllParaSync(),
        this.cajaService.getAllParaSync(),
        this.articuloService.getAllParaSync(),
        this.categoriaService.getAllParaSync(),
        this.articuloCategoriaService.getAllParaSync(),
        this.asignacionCajaService.getAllParaSync(),
      ]);

      const [cajasDto, articulosDto] = await Promise.all([
        Promise.all(cajas.map((c) => this.cajaADto(c))),
        Promise.all(articulos.map((a) => this.articuloADto(a))),
      ]);

      const ultimaSincronizacion = await this.storageService.get<string>(KEY_ULTIMA_SINCRONIZACION);
      const body: SyncRequestBody = {
        ultimaSincronizacion,
        snapshot: { mudanzas, cajas: cajasDto, articulos: articulosDto, categorias, articuloCategorias, asignaciones },
      };

      const respuesta = await firstValueFrom(
        this.http.post<SyncResponseBody>(`${environment.apiBaseUrl}/sync`, body),
      );

      await this.aplicarRespuesta(respuesta);

      const totalConflictos = this.contarConflictos(respuesta.conflictos);
      if (totalConflictos > 0) {
        await this.storageService.set(KEY_CONFLICTOS_PENDIENTES, respuesta.conflictos);
      }
      this.conflictosPendientes.set(totalConflictos);

      return { ok: true, conflictos: totalConflictos };
    } catch (error) {
      this.ultimoError.set('No se pudo sincronizar. Revisá tu conexión e intentá de nuevo.');
      return { ok: false, motivo: 'error', error };
    } finally {
      this.enCurso = false;
      this.sincronizando.set(false);
    }
  }

  async ultimaSincronizacion(): Promise<string | null> {
    return this.storageService.get<string>(KEY_ULTIMA_SINCRONIZACION);
  }

  private async aplicarRespuesta(respuesta: SyncResponseBody): Promise<void> {
    const [cajasLocales, articulosLocales] = await Promise.all([
      Promise.all(respuesta.actualizaciones.cajas.map((c) => this.dtoACaja(c))),
      Promise.all(respuesta.actualizaciones.articulos.map((a) => this.dtoAArticulo(a))),
    ]);

    await Promise.all([
      this.mudanzaService.aplicarDesdeSync(respuesta.actualizaciones.mudanzas),
      this.cajaService.aplicarDesdeSync(cajasLocales),
      this.articuloService.aplicarDesdeSync(articulosLocales),
      this.categoriaService.aplicarDesdeSync(respuesta.actualizaciones.categorias),
      this.articuloCategoriaService.aplicarDesdeSync(respuesta.actualizaciones.articuloCategorias),
      this.asignacionCajaService.aplicarDesdeSync(respuesta.actualizaciones.asignaciones),
    ]);

    await this.storageService.set(KEY_ULTIMA_SINCRONIZACION, respuesta.sincronizadoEn);
  }

  private contarConflictos(conflictos: ConflictosDto): number {
    return Object.values(conflictos).reduce((total, lista) => total + lista.length, 0);
  }

  private async cajaADto(caja: Caja): Promise<CajaDto> {
    const fotoPortadaId = await intentar(() => this.fotoService.subirSiHaceFalta(caja.fotoPortadaUri));
    return {
      id: caja.id,
      mudanzaId: caja.mudanzaId,
      numero: caja.numero,
      nombre: caja.nombre ?? null,
      habitacionDestino: caja.habitacionDestino ?? null,
      estado: caja.estado,
      fotoPortadaId,
      actualizadoEn: caja.actualizadoEn,
      eliminadoEn: caja.eliminadoEn,
    };
  }

  private async dtoACaja(dto: CajaDto): Promise<Caja> {
    const fotoPortadaUri = dto.fotoPortadaId
      ? (await intentar(() => this.fotoService.descargarSiHaceFalta(dto.fotoPortadaId!))) ?? FOTO_PORTADA_DEFAULT
      : FOTO_PORTADA_DEFAULT;
    return {
      id: dto.id,
      mudanzaId: dto.mudanzaId,
      numero: dto.numero,
      nombre: dto.nombre ?? undefined,
      habitacionDestino: dto.habitacionDestino ?? undefined,
      estado: dto.estado as EstadoCaja,
      fotoPortadaUri,
      actualizadoEn: dto.actualizadoEn,
      eliminadoEn: dto.eliminadoEn,
    };
  }

  private async articuloADto(articulo: Articulo): Promise<ArticuloDto> {
    const fotoId = await intentar(() => this.fotoService.subirSiHaceFalta(articulo.fotoUri));
    return {
      id: articulo.id,
      nombre: articulo.nombre,
      fotoId,
      fechaRegistro: articulo.fechaRegistro,
      pesoKg: articulo.pesoKg ?? null,
      fragil: articulo.fragil,
      esencial: articulo.esencial,
      actualizadoEn: articulo.actualizadoEn,
      eliminadoEn: articulo.eliminadoEn,
    };
  }

  private async dtoAArticulo(dto: ArticuloDto): Promise<Articulo> {
    // sin fotoId no debería pasar (todo Articulo requiere fotoUri al crearse),
    // pero si pasara, mejor un string vacío controlado que romper la fila entera
    const fotoUri = dto.fotoId ? ((await intentar(() => this.fotoService.descargarSiHaceFalta(dto.fotoId!))) ?? '') : '';
    return {
      id: dto.id,
      nombre: dto.nombre,
      fotoUri,
      fechaRegistro: dto.fechaRegistro,
      pesoKg: dto.pesoKg ?? undefined,
      fragil: dto.fragil,
      esencial: dto.esencial,
      actualizadoEn: dto.actualizadoEn,
      eliminadoEn: dto.eliminadoEn,
    };
  }
}
