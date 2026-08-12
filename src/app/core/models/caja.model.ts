import { ConMarcaDeSync } from '../utils/sync-meta';

export type EstadoCaja = 'vacia' | 'empacada' | 'en_transito' | 'entregada' | 'desempacada';

export interface Caja extends ConMarcaDeSync {
  id: string;
  mudanzaId: string;
  numero: number; // autogenerado secuencial al crear, editable después por el usuario
  nombre?: string;
  habitacionDestino?: string;
  estado: EstadoCaja;
  fotoPortadaUri: string; // default = caja de cartón estándar; el usuario puede cambiarla
}
