import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  ActionSheetController,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Item } from '../../core/models';
import { BoxAssignmentService, BoxService, ItemService } from '../../core/services';
import { PhotoComponent } from '../../shared/photo/photo.component';

@Component({
  selector: 'app-pending',
  templateUrl: './pending.page.html',
  styleUrl: './pending.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonFab, IonFabButton, IonIcon, DatePipe, PhotoComponent],
})
export class PendingPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly itemService = inject(ItemService);
  private readonly boxService = inject(BoxService);
  private readonly boxAssignmentService = inject(BoxAssignmentService);
  private readonly actionSheetController = inject(ActionSheetController);

  private readonly moveId = this.route.snapshot.paramMap.get('moveId')!;

  readonly pending = signal<Item[]>([]);

  constructor() {
    // Ver el comentario largo en BoxesPage: esta página vive en <ion-tabs> y
    // ionViewWillEnter no dispara al volver desde fuera de las pestañas.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.endsWith(`/${this.moveId}/pending`)) this.load();
      });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  private async load(): Promise<void> {
    this.pending.set(await this.itemService.getUnassigned());
  }

  /**
   * Resuelve el punto que quedó "por definir" en el diagrama de flujo de los
   * wireframes: selector rápido con ActionSheet, sobre las cajas de la
   * mudanza actual, cantidad por defecto 1 (editable después desde el
   * detalle de la caja si hace falta más de una unidad).
   */
  async assign(item: Item): Promise<void> {
    const boxes = await this.boxService.getByMove(this.moveId);
    if (boxes.length === 0) return;

    const sheet = await this.actionSheetController.create({
      header: `Asignar "${item.name}" a...`,
      buttons: [
        ...boxes
          .sort((a, b) => a.number - b.number)
          .map((box) => ({
            text: `Caja #${box.number}${box.destinationRoom ? ' · ' + box.destinationRoom : ''}`,
            handler: async () => {
              await this.boxAssignmentService.assign(item.id, box.id, 1);
              await this.load();
            },
          })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** Sin boxId — el usuario elige adentro (o lo deja sin asignar). */
  newItem(): void {
    this.router.navigate(['/moves', this.moveId, 'new-item']);
  }

  viewItem(itemId: string): void {
    this.router.navigate(['/moves', this.moveId, 'items', itemId]);
  }
}
