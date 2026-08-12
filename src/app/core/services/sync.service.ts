import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Item } from '../models/item.model';
import { Box, BoxStatus } from '../models/box.model';
import { BoxDto, ConflictDto, ConflictsDto, ItemDto, SyncRequestBody, SyncResponseBody } from '../models/sync-dto.model';
import { ItemCategoryService } from './item-category.service';
import { ItemService } from './item.service';
import { BoxAssignmentService } from './box-assignment.service';
import { AuthService } from './auth.service';
import { BoxService, DEFAULT_COVER_PHOTO } from './box.service';
import { CategoryService } from './category.service';
import { PhotoService } from './photo.service';
import { MoveService } from './move.service';
import { StorageService } from './storage.service';

const KEY_LAST_SYNCED_AT = 'last_synced_at';
const KEY_PENDING_CONFLICTS = 'pending_conflicts';

export type SyncResult =
  | { ok: true; conflicts: number }
  | { ok: false; reason: 'no-session' | 'already-running' }
  | { ok: false; reason: 'error'; error: unknown };

/** Una de las 6 claves de ConflictsDto — mismo nombre que la entidad que representa. */
export type ConflictKind = keyof ConflictsDto;

export const CONFLICT_KINDS: ConflictKind[] = ['moves', 'boxes', 'items', 'categories', 'itemCategories', 'boxAssignments'];

/** Clave estable por fila, para poder ubicar/quitar un conflicto puntual dentro de pending_conflicts. */
function conflictKey(kind: ConflictKind, entity: any): string {
  switch (kind) {
    case 'moves':
    case 'categories':
    case 'boxes':
    case 'items':
      return entity.id;
    case 'itemCategories':
      return `${entity.itemId}:${entity.categoryId}`;
    case 'boxAssignments':
      return `${entity.itemId}:${entity.boxId}`;
  }
}

/** Ejecuta `fn`; si falla, no frena el resto del sync — una foto que no sube/baja no debe tirar todo abajo. */
async function attempt<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/**
 * Orquesta POST /sync: junta el snapshot local completo (services.*ForSync,
 * tombstones incluidos), lo manda, aplica lo que el servidor devuelve
 * (services.applyFromSync) y guarda el nuevo `lastSyncedAt`.
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
  private readonly photoService = inject(PhotoService);
  private readonly moveService = inject(MoveService);
  private readonly boxService = inject(BoxService);
  private readonly itemService = inject(ItemService);
  private readonly categoryService = inject(CategoryService);
  private readonly itemCategoryService = inject(ItemCategoryService);
  private readonly boxAssignmentService = inject(BoxAssignmentService);

  readonly syncing = signal(false);
  readonly pendingConflicts = signal(0);
  readonly lastError = signal<string | null>(null);

  private running = false;

  constructor() {
    // El signal arranca en 0 al instanciar el service — si ya había
    // conflictos guardados de una sesión anterior, esto lo pone al día sin
    // esperar a que corra un sync nuevo.
    this.getPendingConflicts().then((stored) => this.pendingConflicts.set(stored ? this.countConflicts(stored) : 0));
  }

  async sync(): Promise<SyncResult> {
    if (!this.authService.isAuthenticated()) return { ok: false, reason: 'no-session' };
    if (this.running) return { ok: false, reason: 'already-running' };

    this.running = true;
    this.syncing.set(true);
    this.lastError.set(null);
    try {
      const [moves, boxes, items, categories, itemCategories, boxAssignments] = await Promise.all([
        this.moveService.getAllForSync(),
        this.boxService.getAllForSync(),
        this.itemService.getAllForSync(),
        this.categoryService.getAllForSync(),
        this.itemCategoryService.getAllForSync(),
        this.boxAssignmentService.getAllForSync(),
      ]);

      const [boxDtos, itemDtos] = await Promise.all([
        Promise.all(boxes.map((b) => this.boxToDto(b))),
        Promise.all(items.map((i) => this.itemToDto(i))),
      ]);

      const lastSyncedAt = await this.storageService.get<string>(KEY_LAST_SYNCED_AT);
      const body: SyncRequestBody = {
        lastSyncedAt,
        snapshot: { moves, boxes: boxDtos, items: itemDtos, categories, itemCategories, boxAssignments },
      };

      const response = await firstValueFrom(
        this.http.post<SyncResponseBody>(`${environment.apiBaseUrl}/sync`, body),
      );

      await this.applyResponse(response);

      const totalConflicts = this.countConflicts(response.conflicts);
      await this.storageService.set(KEY_PENDING_CONFLICTS, response.conflicts);
      this.pendingConflicts.set(totalConflicts);

      return { ok: true, conflicts: totalConflicts };
    } catch (error) {
      this.lastError.set('No se pudo sincronizar. Revisá tu conexión e intentá de nuevo.');
      return { ok: false, reason: 'error', error };
    } finally {
      this.running = false;
      this.syncing.set(false);
    }
  }

  async lastSyncedAt(): Promise<string | null> {
    return this.storageService.get<string>(KEY_LAST_SYNCED_AT);
  }

  /** Lee los conflictos guardados del último sync — null si no hay ninguno pendiente. */
  async getPendingConflicts(): Promise<ConflictsDto | null> {
    const stored = await this.storageService.get<ConflictsDto>(KEY_PENDING_CONFLICTS);
    if (!stored) return null;
    const total = this.countConflicts(stored);
    return total > 0 ? stored : null;
  }

  /**
   * Aplica la versión elegida por el usuario para UN conflicto puntual —
   * escribe esa versión en el storage local (services.applyFromSync) y la
   * saca de pending_conflicts. No dispara un sync inmediato: el próximo sync
   * (automático o manual) es el que efectivamente sube la resolución — para
   * ese momento, el boundary (lastSyncedAt) ya avanzó más allá de las dos
   * marcas de tiempo que causaron el conflicto, así que la versión elegida
   * gana sola, sin volver a chocar contra la otra.
   */
  async resolveConflict(kind: ConflictKind, conflict: ConflictDto<unknown>, side: 'local' | 'server'): Promise<void> {
    await this.writeToLocalStorage(kind, side === 'local' ? conflict.local : conflict.server);
    await this.updatePendingConflicts(kind, (list) => list.filter((c) => conflictKey(kind, c.local) !== conflictKey(kind, conflict.local)));
  }

  /**
   * Deshacer una resolución (mientras no se haya vuelto a sincronizar):
   * restaura el contenido local a como estaba antes de resolver (conflict.local
   * lo sigue representando, nada lo tocó desde el sync que detectó el
   * conflicto) y vuelve a marcarlo pendiente.
   */
  async unresolveConflict(kind: ConflictKind, conflict: ConflictDto<unknown>): Promise<void> {
    await this.writeToLocalStorage(kind, conflict.local);
    await this.updatePendingConflicts(kind, (list) => {
      const key = conflictKey(kind, conflict.local);
      return list.some((c) => conflictKey(kind, c.local) === key) ? list : [...list, conflict];
    });
  }

  private async writeToLocalStorage(kind: ConflictKind, dto: unknown): Promise<void> {
    switch (kind) {
      case 'moves':
        await this.moveService.applyFromSync([dto as never]);
        break;
      case 'categories':
        await this.categoryService.applyFromSync([dto as never]);
        break;
      case 'itemCategories':
        await this.itemCategoryService.applyFromSync([dto as never]);
        break;
      case 'boxAssignments':
        await this.boxAssignmentService.applyFromSync([dto as never]);
        break;
      case 'boxes':
        await this.boxService.applyFromSync([await this.dtoToBox(dto as BoxDto)]);
        break;
      case 'items':
        await this.itemService.applyFromSync([await this.dtoToItem(dto as ItemDto)]);
        break;
    }
  }

  private async updatePendingConflicts(
    kind: ConflictKind,
    updateList: (list: ConflictDto<unknown>[]) => ConflictDto<unknown>[],
  ): Promise<void> {
    const stored = (await this.storageService.get<ConflictsDto>(KEY_PENDING_CONFLICTS)) ?? {
      moves: [],
      boxes: [],
      items: [],
      categories: [],
      itemCategories: [],
      boxAssignments: [],
    };

    const updated: ConflictsDto = { ...stored, [kind]: updateList(stored[kind] as ConflictDto<unknown>[]) };
    await this.storageService.set(KEY_PENDING_CONFLICTS, updated);
    this.pendingConflicts.set(this.countConflicts(updated));
  }

  private async applyResponse(response: SyncResponseBody): Promise<void> {
    const [localBoxes, localItems] = await Promise.all([
      Promise.all(response.updates.boxes.map((b) => this.dtoToBox(b))),
      Promise.all(response.updates.items.map((i) => this.dtoToItem(i))),
    ]);

    await Promise.all([
      this.moveService.applyFromSync(response.updates.moves),
      this.boxService.applyFromSync(localBoxes),
      this.itemService.applyFromSync(localItems),
      this.categoryService.applyFromSync(response.updates.categories),
      this.itemCategoryService.applyFromSync(response.updates.itemCategories),
      this.boxAssignmentService.applyFromSync(response.updates.boxAssignments),
    ]);

    await this.storageService.set(KEY_LAST_SYNCED_AT, response.syncedAt);
  }

  private countConflicts(conflicts: ConflictsDto): number {
    return Object.values(conflicts).reduce((total, list) => total + list.length, 0);
  }

  /**
   * El id se calcula siempre desde el propio URI (puro, nunca falla) — subir
   * el archivo es un paso aparte que puede fallar sin por eso perder el id a
   * mandar. Importa sobre todo para una caja/artículo ya borrado: su archivo
   * local ya no existe (PhotoService.deleteFile() corrió al borrarlo), así
   * que ni se intenta subir, pero el id sigue viajando en el snapshot para
   * que el servidor pueda borrar también su copia (ver mudanza-back).
   */
  private async boxToDto(box: Box): Promise<BoxDto> {
    const coverPhotoId = this.photoService.photoIdFromUri(box.coverPhotoUri);
    if (coverPhotoId && !box.deletedAt) {
      await attempt(() => this.photoService.uploadIfNeeded(box.coverPhotoUri));
    }
    return {
      id: box.id,
      moveId: box.moveId,
      number: box.number,
      name: box.name ?? null,
      destinationRoom: box.destinationRoom ?? null,
      status: box.status,
      coverPhotoId,
      updatedAt: box.updatedAt,
      deletedAt: box.deletedAt,
    };
  }

  private async dtoToBox(dto: BoxDto): Promise<Box> {
    const coverPhotoUri = dto.coverPhotoId
      ? (await attempt(() => this.photoService.downloadIfNeeded(dto.coverPhotoId!))) ?? DEFAULT_COVER_PHOTO
      : DEFAULT_COVER_PHOTO;
    return {
      id: dto.id,
      moveId: dto.moveId,
      number: dto.number,
      name: dto.name ?? undefined,
      destinationRoom: dto.destinationRoom ?? undefined,
      status: dto.status as BoxStatus,
      coverPhotoUri,
      updatedAt: dto.updatedAt,
      deletedAt: dto.deletedAt,
    };
  }

  /** Misma razón que boxToDto(): el id sale del URI, no de si la subida funcionó. */
  private async itemToDto(item: Item): Promise<ItemDto> {
    const photoId = this.photoService.photoIdFromUri(item.photoUri);
    if (photoId && !item.deletedAt) {
      await attempt(() => this.photoService.uploadIfNeeded(item.photoUri));
    }
    return {
      id: item.id,
      name: item.name,
      photoId,
      registeredAt: item.registeredAt,
      weightKg: item.weightKg ?? null,
      fragile: item.fragile,
      essential: item.essential,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
    };
  }

  private async dtoToItem(dto: ItemDto): Promise<Item> {
    // sin photoId no debería pasar (todo Item requiere photoUri al crearse),
    // pero si pasara, mejor un string vacío controlado que romper la fila entera
    const photoUri = dto.photoId ? ((await attempt(() => this.photoService.downloadIfNeeded(dto.photoId!))) ?? '') : '';
    return {
      id: dto.id,
      name: dto.name,
      photoUri,
      registeredAt: dto.registeredAt,
      weightKg: dto.weightKg ?? undefined,
      fragile: dto.fragile,
      essential: dto.essential,
      updatedAt: dto.updatedAt,
      deletedAt: dto.deletedAt,
    };
  }
}
