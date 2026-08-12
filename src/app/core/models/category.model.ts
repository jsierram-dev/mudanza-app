import { Syncable } from '../utils/sync-meta';

export interface Category extends Syncable {
  id: string;
  name: string;
}
