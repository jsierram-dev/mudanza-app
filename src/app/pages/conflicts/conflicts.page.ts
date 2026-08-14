import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/en';
import { BoxDto, ConflictDto, ItemDto } from '../../core/models/sync-dto.model';
import { ConflictKind, CONFLICT_KINDS, SyncService, TranslationService } from '../../core/services';
import { boxStatusKey } from '../../core/utils/box-status';
import { formatRelativeTime } from '../../core/utils/relative-time';

interface ConflictEntry {
  kind: ConflictKind;
  conflict: ConflictDto<unknown>;
  typeLabel: string;
  title: string;
  localFacts: string[];
  serverFacts: string[];
  localTime: string;
  serverTime: string;
  resolved: 'local' | 'server' | null;
}

type Side = 'local' | 'server';
type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

function boxFacts(dto: BoxDto, t: TFn): string[] {
  return [t(boxStatusKey(dto.status)), dto.destinationRoom || t('common.noRoom')];
}

function itemFacts(dto: ItemDto, t: TFn): string[] {
  const facts = [dto.weightKg ? `${dto.weightKg} kg` : t('conflicts.noWeight')];
  if (dto.fragile) facts.push(t('common.fragile'));
  if (dto.essential) facts.push(t('common.essential'));
  return facts;
}

/** Arma lo que hace falta para mostrar un conflicto de cualquiera de las 6 entidades sin repetir esto por pantalla. */
function describeConflict(kind: ConflictKind, conflict: ConflictDto<unknown>, t: TFn): Omit<ConflictEntry, 'resolved'> {
  const local = conflict.local as any;
  const server = conflict.server as any;

  switch (kind) {
    case 'moves':
      return {
        kind,
        conflict,
        typeLabel: t('conflicts.kindMove'),
        title: t('conflicts.moveNameTitle'),
        localFacts: [`"${local.name}"`],
        serverFacts: [`"${server.name}"`],
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'categories':
      return {
        kind,
        conflict,
        typeLabel: t('conflicts.kindCategory'),
        title: t('conflicts.categoryNameTitle'),
        localFacts: [`"${local.name}"`],
        serverFacts: [`"${server.name}"`],
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'boxes':
      return {
        kind,
        conflict,
        typeLabel: t('conflicts.kindBox'),
        title: t('common.boxNumber', { number: local.number }),
        localFacts: boxFacts(local, t),
        serverFacts: boxFacts(server, t),
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'items':
      return {
        kind,
        conflict,
        typeLabel: t('conflicts.kindItem'),
        title: local.name,
        localFacts: itemFacts(local, t),
        serverFacts: itemFacts(server, t),
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'itemCategories':
      return {
        kind,
        conflict,
        typeLabel: t('conflicts.kindItemCategory'),
        title: t('conflicts.itemCategoryLinkTitle'),
        localFacts: [local.deletedAt ? t('conflicts.removed') : t('conflicts.assigned')],
        serverFacts: [server.deletedAt ? t('conflicts.removed') : t('conflicts.assigned')],
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'boxAssignments':
      return {
        kind,
        conflict,
        typeLabel: t('conflicts.kindBoxAssignment'),
        title: t('conflicts.boxAssignmentQtyTitle'),
        localFacts: [local.deletedAt ? t('conflicts.removedFromBox') : t('boxDetail.quantityLine', { n: local.quantity })],
        serverFacts: [server.deletedAt ? t('conflicts.removedFromBox') : t('boxDetail.quantityLine', { n: server.quantity })],
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
  }
}

/**
 * Reachable desde el banner de conflictos en Cuenta. Sin modal — pantalla
 * propia (ver ROADMAP-mudanza.md, mockup aprobado 2026-08-12): una card por
 * conflicto, comparación lado a lado, un botón por lado. Resolver no dispara
 * un sync — solo escribe la elección en local, el próximo sync (automático o
 * manual) la sube (ver SyncService.resolveConflict para el porqué).
 */
@Component({
  selector: 'app-conflicts',
  templateUrl: './conflicts.page.html',
  styleUrl: './conflicts.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon, TranslatePipe],
})
export class ConflictsPage implements ViewWillEnter {
  private readonly syncService = inject(SyncService);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);

  readonly entries = signal<ConflictEntry[]>([]);
  readonly pendingCount = computed(() => this.entries().filter((e) => e.resolved === null).length);

  ionViewWillEnter(): void {
    this.load();
  }

  private async load(): Promise<void> {
    const stored = await this.syncService.getPendingConflicts();
    if (!stored) {
      this.entries.set([]);
      return;
    }

    const t: TFn = (key, params) => this.i18n.t(key, params);
    const flat: ConflictEntry[] = [];
    for (const kind of CONFLICT_KINDS) {
      for (const conflict of stored[kind] as ConflictDto<unknown>[]) {
        flat.push({ ...describeConflict(kind, conflict, t), resolved: null });
      }
    }
    this.entries.set(flat);
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso, (key, params) => this.i18n.t(key, params));
  }

  async resolve(entry: ConflictEntry, side: Side): Promise<void> {
    await this.syncService.resolveConflict(entry.kind, entry.conflict, side);
    this.entries.update((all) => all.map((e) => (e === entry ? { ...e, resolved: side } : e)));
  }

  async undo(entry: ConflictEntry): Promise<void> {
    await this.syncService.unresolveConflict(entry.kind, entry.conflict);
    this.entries.update((all) => all.map((e) => (e === entry ? { ...e, resolved: null } : e)));
  }

  async resolveAll(side: Side): Promise<void> {
    for (const entry of this.entries().filter((e) => e.resolved === null)) {
      await this.resolve(entry, side);
    }
  }

  goToAccount(): void {
    this.router.navigateByUrl('/account');
  }
}
