import { Syncable } from '../utils/sync-meta';

export type BoxStatus = 'empty' | 'packed' | 'in_transit' | 'delivered' | 'unpacked';

export interface Box extends Syncable {
  id: string;
  moveId: string;
  number: number; // autogenerado secuencial al crear, editable después por el usuario
  name?: string;
  destinationRoom?: string;
  status: BoxStatus;
  coverPhotoUri: string; // default = caja de cartón estándar; el usuario puede cambiarla
}
