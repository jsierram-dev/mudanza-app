import { BoxAssignment } from './box-assignment.model';
import { BoxStatus } from './box.model';
import { Category } from './category.model';
import { ItemCategory } from './item-category.model';
import { Move } from './move.model';

/**
 * DTOs "de cable" para POST /sync — espejo de mudanza-back/src/modules/sync/types.ts.
 * Redeclarados acá (no importados) por el mismo motivo que AuthUser: mudanza-app
 * y mudanza-back son repos separados, sin un paquete de tipos compartido.
 *
 * Move/Category/ItemCategory/BoxAssignment tienen la MISMA forma que sus
 * modelos locales — se usan directo, sin mapeo. Box e Item sí difieren: el
 * modelo local guarda un *photoUri de archivo local, el servidor un *photoId
 * — ver SyncService para la traducción.
 */

export interface BoxDto {
  id: string;
  moveId: string;
  number: number;
  name: string | null;
  destinationRoom: string | null;
  status: BoxStatus;
  coverPhotoId: string | null;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ItemDto {
  id: string;
  name: string;
  photoId: string | null;
  registeredAt: string;
  weightKg: number | null;
  fragile: boolean;
  essential: boolean;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SnapshotDto {
  moves: Move[];
  boxes: BoxDto[];
  items: ItemDto[];
  categories: Category[];
  itemCategories: ItemCategory[];
  boxAssignments: BoxAssignment[];
}

export interface SyncRequestBody {
  lastSyncedAt: string | null;
  snapshot: SnapshotDto;
}

export interface ConflictDto<T> {
  local: T;
  server: T;
}

export interface ConflictsDto {
  moves: ConflictDto<Move>[];
  boxes: ConflictDto<BoxDto>[];
  items: ConflictDto<ItemDto>[];
  categories: ConflictDto<Category>[];
  itemCategories: ConflictDto<ItemCategory>[];
  boxAssignments: ConflictDto<BoxAssignment>[];
}

export interface SyncResponseBody {
  syncedAt: string;
  updates: SnapshotDto;
  conflicts: ConflictsDto;
}
