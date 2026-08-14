import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonBackButton,
  IonButton,
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
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Box, BoxStatus, Item } from '../../core/models';
import { BoxAssignmentService, BoxService, DEFAULT_COVER_PHOTO, ItemService, PhotoService, TranslationService } from '../../core/services';
import { boxStatusKey } from '../../core/utils/box-status';
import { formatWeight } from '../../core/utils/weight';
import { AccountButtonComponent } from '../../shared/account-button/account-button.component';
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
    IonButton,
    IonBackButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    PhotoComponent,
    AccountButtonComponent,
    TranslatePipe,
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
  private readonly i18n = inject(TranslationService);

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
    return this.i18n.t(boxStatusKey(status));
  }

  /** true = todavía no tiene foto propia, hay que mostrar el placeholder. */
  isDefaultPhoto(coverPhotoUri: string): boolean {
    return coverPhotoUri === DEFAULT_COVER_PHOTO;
  }

  async changeStatus(): Promise<void> {
    const currentBox = this.box();
    if (!currentBox) return;

    const sheet = await this.actionSheetController.create({
      header: this.i18n.t('boxDetail.statusHeader'),
      buttons: [
        ...STATUSES.map((status) => ({
          text: this.formatStatus(status),
          handler: async () => {
            const updated: Box = { ...currentBox, status };
            await this.boxService.update(updated);
            this.box.set(updated);
          },
        })),
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async editDestinationRoom(): Promise<void> {
    const currentBox = this.box();
    if (!currentBox) return;

    const alert = await this.alertController.create({
      header: this.i18n.t('boxDetail.roomHeader'),
      inputs: [{ name: 'destinationRoom', type: 'text', value: currentBox.destinationRoom ?? '' }],
      buttons: [
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('common.save'),
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
        message: this.i18n.t('boxDetail.photoError'),
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  /**
   * Tombstone vía BoxService.delete() (cascada de asignaciones + borrado del
   * archivo de la foto de portada incluidos ahí). Los artículos que estaban
   * en la caja NO se borran — quedan sin asignar, por eso el mensaje avisa
   * cuando corresponde.
   */
  async deleteBox(): Promise<void> {
    const currentBox = this.box();
    if (!currentBox) return;

    const itemCount = this.items().length;
    const message =
      itemCount > 0
        ? this.i18n.t('boxDetail.deleteConfirmWithItems', { number: currentBox.number, count: itemCount })
        : this.i18n.t('boxDetail.deleteConfirmEmpty', { number: currentBox.number });

    const alert = await this.alertController.create({
      header: this.i18n.t('boxDetail.deleteAria'),
      message,
      buttons: [
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('common.delete'),
          role: 'destructive',
          handler: async () => {
            await this.boxService.delete(currentBox.id);
            this.router.navigate(['/moves', this.moveId, 'boxes']);
          },
        },
      ],
    });
    await alert.present();
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
