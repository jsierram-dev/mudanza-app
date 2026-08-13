import { DatePipe, Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
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
import { Item } from '../../core/models';
import { BoxAssignmentService, BoxService, CategoryService, ItemCategoryService, ItemService } from '../../core/services';
import { AccountButtonComponent } from '../../shared/account-button/account-button.component';
import { PhotoComponent } from '../../shared/photo/photo.component';

interface ItemLocation {
  boxId: string;
  boxNumber: number;
  room?: string;
  quantity: number;
}

@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.page.html',
  styleUrl: './item-detail.page.scss',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonIcon,
    PhotoComponent,
    DatePipe,
    AccountButtonComponent,
  ],
})
export class ItemDetailPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly itemService = inject(ItemService);
  private readonly itemCategoryService = inject(ItemCategoryService);
  private readonly boxAssignmentService = inject(BoxAssignmentService);
  private readonly categoryService = inject(CategoryService);
  private readonly boxService = inject(BoxService);
  private readonly alertController = inject(AlertController);

  private moveId = '';
  private itemId = '';

  readonly item = signal<Item | undefined>(undefined);
  readonly categoryNames = signal<string[]>([]);
  readonly locations = signal<ItemLocation[]>([]);

  ionViewWillEnter(): void {
    this.moveId = this.route.snapshot.paramMap.get('moveId')!;
    this.itemId = this.route.snapshot.paramMap.get('itemId')!;
    this.load();
  }

  private async load(): Promise<void> {
    const [item, categoryIds, assignments, allCategories] = await Promise.all([
      this.itemService.getById(this.itemId),
      this.itemCategoryService.getCategoriesForItem(this.itemId),
      this.boxAssignmentService.getBoxesForItem(this.itemId),
      this.categoryService.getAll(),
    ]);

    this.item.set(item);
    this.categoryNames.set(
      allCategories.filter((c) => categoryIds.includes(c.id)).map((c) => c.name),
    );

    const locations = await Promise.all(
      assignments.map(async (a): Promise<ItemLocation | undefined> => {
        const box = await this.boxService.getById(a.boxId);
        return box
          ? { boxId: box.id, boxNumber: box.number, room: box.destinationRoom, quantity: a.quantity }
          : undefined;
      }),
    );
    this.locations.set(locations.filter((l): l is ItemLocation => l !== undefined));
  }

  goToBox(boxId: string): void {
    this.router.navigate(['/moves', this.moveId, 'boxes', boxId]);
  }

  /**
   * Tombstone vía ItemService.delete() (cascada de asignaciones/categorías +
   * borrado del archivo de la foto incluidos ahí). Se llega a esta pantalla
   * desde tres lugares distintos (caja, pendientes, buscador) — volver con
   * location.back() en vez de una ruta fija evita hardcodear cuál de los tres.
   */
  async deleteItem(): Promise<void> {
    const currentItem = this.item();
    if (!currentItem) return;

    const alert = await this.alertController.create({
      header: 'Borrar artículo',
      message: `¿Seguro que querés borrar "${currentItem.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: async () => {
            await this.itemService.delete(currentItem.id);
            this.location.back();
          },
        },
      ],
    });
    await alert.present();
  }
}
