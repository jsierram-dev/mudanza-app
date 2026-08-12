import { ConMarcaDeSync } from '../utils/sync-meta';

export interface Mudanza extends ConMarcaDeSync {
  id: string;
  nombre: string;
  fechaCreacion: string;
}
