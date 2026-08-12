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
import { BoxDto, ConflictDto, ItemDto } from '../../core/models/sync-dto.model';
import { ConflictKind, CONFLICT_KINDS, SyncService } from '../../core/services';
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

function boxFacts(dto: BoxDto): string[] {
  const status = dto.status.replace('_', ' ');
  return [status, dto.destinationRoom || 'Sin habitación'];
}

function itemFacts(dto: ItemDto): string[] {
  const facts = [dto.weightKg ? `${dto.weightKg} kg` : 'Sin peso'];
  if (dto.fragile) facts.push('Frágil');
  if (dto.essential) facts.push('Esencial');
  return facts;
}

/** Arma lo que hace falta para mostrar un conflicto de cualquiera de las 6 entidades sin repetir esto por pantalla. */
function describeConflict(kind: ConflictKind, conflict: ConflictDto<unknown>): Omit<ConflictEntry, 'resolved'> {
  const local = conflict.local as any;
  const server = conflict.server as any;

  switch (kind) {
    case 'moves':
      return {
        kind,
        conflict,
        typeLabel: 'Mudanza',
        title: 'Nombre de la mudanza',
        localFacts: [`"${local.name}"`],
        serverFacts: [`"${server.name}"`],
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'categories':
      return {
        kind,
        conflict,
        typeLabel: 'Categoría',
        title: 'Nombre de la categoría',
        localFacts: [`"${local.name}"`],
        serverFacts: [`"${server.name}"`],
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'boxes':
      return {
        kind,
        conflict,
        typeLabel: 'Caja',
        title: `Caja #${local.number}`,
        localFacts: boxFacts(local),
        serverFacts: boxFacts(server),
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'items':
      return {
        kind,
        conflict,
        typeLabel: 'Artículo',
        title: local.name,
        localFacts: itemFacts(local),
        serverFacts: itemFacts(server),
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'itemCategories':
      return {
        kind,
        conflict,
        typeLabel: 'Categoría de artículo',
        title: 'Vínculo artículo–categoría',
        localFacts: [local.deletedAt ? 'Quitada' : 'Asignada'],
        serverFacts: [server.deletedAt ? 'Quitada' : 'Asignada'],
        localTime: local.updatedAt,
        serverTime: server.updatedAt,
      };
    case 'boxAssignments':
      return {
        kind,
        conflict,
        typeLabel: 'Asignación a caja',
        title: 'Cantidad en la caja',
        localFacts: [local.deletedAt ? 'Quitado de la caja' : `Cantidad: ${local.quantity}`],
        serverFacts: [server.deletedAt ? 'Quitado de la caja' : `Cantidad: ${server.quantity}`],
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
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon],
})
export class ConflictsPage implements ViewWillEnter {
  private readonly syncService = inject(SyncService);
  private readonly router = inject(Router);

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

    const flat: ConflictEntry[] = [];
    for (const kind of CONFLICT_KINDS) {
      for (const conflict of stored[kind] as ConflictDto<unknown>[]) {
        flat.push({ ...describeConflict(kind, conflict), resolved: null });
      }
    }
    this.entries.set(flat);
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso);
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
