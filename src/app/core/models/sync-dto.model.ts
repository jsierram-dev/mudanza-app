import { ArticuloCategoria } from './articulo-categoria.model';
import { AsignacionCaja } from './asignacion-caja.model';
import { EstadoCaja } from './caja.model';
import { Categoria } from './categoria.model';
import { Mudanza } from './mudanza.model';

/**
 * DTOs "de cable" para POST /sync — espejo de mudanza-back/src/modules/sync/types.ts.
 * Redeclarados acá (no importados) por el mismo motivo que AuthUser: mudanza-app
 * y mudanza-back son repos separados, sin un paquete de tipos compartido.
 *
 * Mudanza/Categoria/ArticuloCategoria/AsignacionCaja tienen la MISMA forma que
 * sus modelos locales — se usan directo, sin mapeo. Caja y Articulo sí
 * difieren: el modelo local guarda un fotoUri de archivo local, el servidor
 * un fotoId — ver SyncService para la traducción.
 */

export interface CajaDto {
  id: string;
  mudanzaId: string;
  numero: number;
  nombre: string | null;
  habitacionDestino: string | null;
  estado: EstadoCaja;
  fotoPortadaId: string | null;
  actualizadoEn: string;
  eliminadoEn: string | null;
}

export interface ArticuloDto {
  id: string;
  nombre: string;
  fotoId: string | null;
  fechaRegistro: string;
  pesoKg: number | null;
  fragil: boolean;
  esencial: boolean;
  actualizadoEn: string;
  eliminadoEn: string | null;
}

export interface SnapshotDto {
  mudanzas: Mudanza[];
  cajas: CajaDto[];
  articulos: ArticuloDto[];
  categorias: Categoria[];
  articuloCategorias: ArticuloCategoria[];
  asignaciones: AsignacionCaja[];
}

export interface SyncRequestBody {
  ultimaSincronizacion: string | null;
  snapshot: SnapshotDto;
}

export interface ConflictoDto<T> {
  local: T;
  servidor: T;
}

export interface ConflictosDto {
  mudanzas: ConflictoDto<Mudanza>[];
  cajas: ConflictoDto<CajaDto>[];
  articulos: ConflictoDto<ArticuloDto>[];
  categorias: ConflictoDto<Categoria>[];
  articuloCategorias: ConflictoDto<ArticuloCategoria>[];
  asignaciones: ConflictoDto<AsignacionCaja>[];
}

export interface SyncResponseBody {
  sincronizadoEn: string;
  actualizaciones: SnapshotDto;
  conflictos: ConflictosDto;
}
