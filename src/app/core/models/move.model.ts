import { Syncable } from '../utils/sync-meta';

export interface Move extends Syncable {
  id: string;
  name: string;
  createdAt: string;
}
