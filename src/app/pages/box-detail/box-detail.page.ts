import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonBackButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Box, BoxStatus, Item } from '../../core/models';
import { BoxAssignmentService, BoxService, DEFAULT_COVER_PHOTO, ItemService, PhotoService } from '../../core/services';
import { formatWeight } from '../../core/utils/weight';
import { PhotoComponent } from '../../shared/photo/photo.component';

interface ItemInBox {
  item: Item;
  quantity: number;
}

const STATUSES: BoxStatus[] = ['empty', 'packed', 'in_transit', 'delivered', 'unpacked'];

@Component({
  selector: 'app-box-detail',
  templateUrl: './box-detail.page.html',
  styleUrl: './box-detail.page.scss',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    PhotoComponent,
  ],
})
export class BoxDetailPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly boxService = inject(BoxService);
  private readonly itemService = inject(ItemService);
  private readonly boxAssignmentService = inject(BoxAssignmentService);
  private readonly photoService = inject(PhotoService);
  private readonly alertController = inject(AlertController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly toastController = inject(ToastController);

  private readonly moveId = this.route.snapshot.paramMap.get('moveId')!;
  private readonly boxId = this.route.snapshot.paramMap.get('boxId')!;

  readonly box = signal<Box | undefined>(undefined);
  readonly items = signal<ItemInBox[]>([]);

  /** Suma weightKg × quantity de lo ya cargado — sin llamadas extra al service. */
  readonly totalWeightText = computed(() =>
    formatWeight(this.items().reduce((total, entry) => total + (entry.item.weightKg ?? 0) * entry.quantity, 0)),
  );

  /**
   * Ionic mantiene vivas las páginas ya visitadas para las transiciones
   * (ver ROADMAP-mudanza.md) — al volver acá después de registrar un
   * artículo, la instancia se REUSA y el constructor no vuelve a correr.
   * ionViewWillEnter sí corre cada vez, incluida la primera.
   */
  ionViewWillEnter(): void {
    this.load();
  }

  private async load(): Promise<void> {
    const [box, assignments] = await Promise.all([
      this.boxService.getById(this.boxId),
      this.boxAssignmentService.getItemsInBox(this.boxId),
    ]);
    this.box.set(box);

    const withItem = await Promise.all(
      assignments.map(async (a): Promise<ItemInBox | undefined> => {
        const item = await this.itemService.getById(a.itemId);
        return item ? { item, quantity: a.quantity } : undefined;
      }),
    );
    this.items.set(withItem.filter((i): i is ItemInBox => i !== undefined));
  }

  formatStatus(status: BoxStatus): string {
    return status.replace('_', ' ');
  }

  /** true = todavía no tiene foto propia, hay que mostrar el placeholder. */
  isDefaultPhoto(coverPhotoUri: string): boolean {
    return coverPhotoUri === DEFAULT_COVER_PHOTO;
  }

  async changeStatus(): Promise<void> {
    const currentBox = this.box();
    if (!currentBox) return;

    const sheet = await this.actionSheetController.create({
      header: 'Estado de la caja',
      buttons: [
        ...STATUSES.map((status) => ({
          text: this.formatStatus(status),
          handler: async () => {
            const updated: Box = { ...currentBox, status };
            await this.boxService.update(updated);
            this.box.set(updated);
          },
        })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async editDestinationRoom(): Promise<void> {
    const currentBox = this.box();
    if (!currentBox) return;

    const alert = await this.alertController.create({
      header: 'Habitación destino',
      inputs: [{ name: 'destinationRoom', type: 'text', value: currentBox.destinationRoom ?? '' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const updated: Box = { ...currentBox, destinationRoom: (data.destinationRoom ?? '').trim() || undefined };
            await this.boxService.update(updated);
            this.box.set(updated);
          },
        },
      ],
    });
    await alert.present();
  }

  async changePhoto(): Promise<void> {
    const currentBox = this.box();
    if (!currentBox) return;
    try {
      const coverPhotoUri = await this.photoService.captureAndSave();
      const updated: Box = { ...currentBox, coverPhotoUri };
      await this.boxService.update(updated);
      this.box.set(updated);
    } catch (error) {
      // "user cancelled photos app" / "No image picked" son cancelaciones,
      // no errores reales — cualquier otra cosa sí vale la pena mostrarla en
      // vez de fallar en silencio (así se vio "no funciona" la primera vez).
      const message = error instanceof Error ? error.message : String(error);
      if (/cancel|no image/i.test(message)) return;
      const toast = await this.toastController.create({
        message: 'No se pudo guardar la foto. Probá de nuevo.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  registerItem(): void {
    this.router.navigate(['/moves', this.moveId, 'new-item'], {
      queryParams: { boxId: this.boxId },
    });
  }

  viewItem(itemId: string): void {
    this.router.navigate(['/moves', this.moveId, 'items', itemId]);
  }
}
