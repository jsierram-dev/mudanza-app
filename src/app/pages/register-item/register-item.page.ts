import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionSheetController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import type { InputCustomEvent, ToggleCustomEvent, ViewWillEnter } from '@ionic/angular/standalone';
import { Box, Category } from '../../core/models';
import { AccountButtonComponent } from '../../shared/account-button/account-button.component';
import { PhotoComponent } from '../../shared/photo/photo.component';
import {
  BoxAssignmentService,
  BoxService,
  CategoryService,
  ItemCategoryService,
  ItemService,
  PhotoService,
} from '../../core/services';

type Step = 'camera' | 'form';

@Component({
  selector: 'app-register-item',
  templateUrl: './register-item.page.html',
  styleUrl: './register-item.page.scss',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonToggle,
    PhotoComponent,
    AccountButtonComponent,
  ],
})
export class RegisterItemPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly photoService = inject(PhotoService);
  private readonly boxService = inject(BoxService);
  private readonly itemService = inject(ItemService);
  private readonly categoryService = inject(CategoryService);
  private readonly itemCategoryService = inject(ItemCategoryService);
  private readonly boxAssignmentService = inject(BoxAssignmentService);
  private readonly actionSheetController = inject(ActionSheetController);

  private moveId = '';
  /** Caja con la que se entró (desde el FAB de Box Detail) — null si se entró desde Pending. */
  private initialBoxId: string | null = null;

  readonly availableBoxes = signal<Box[]>([]);
  /** undefined = "sin asignar". Puede venir precargada (initialBoxId) o elegirse a mano. */
  readonly selectedBox = signal<Box | undefined>(undefined);

  readonly step = signal<Step>('camera');
  readonly photoUri = signal<string | null>(null);
  readonly capturing = signal(false);

  readonly name = signal('');
  readonly weightKg = signal<number | null>(null);
  readonly fragile = signal(false);
  readonly essential = signal(false);
  readonly quantity = signal(1);

  readonly categories = signal<Category[]>([]);
  readonly selectedCategories = signal<Set<string>>(new Set());

  /**
   * Ionic reusa instancias de página ya visitadas — ver la nota en
   * BoxDetailPage. Acá importa doble: además de recargar datos (incluidos
   * los params, por si se reusa la instancia con otra mudanza/caja de
   * origen), hay que resetear el formulario, o registrar un segundo
   * artículo mostraría los datos del anterior todavía cargados.
   */
  ionViewWillEnter(): void {
    this.moveId = this.route.snapshot.paramMap.get('moveId')!;
    this.initialBoxId = this.route.snapshot.queryParamMap.get('boxId');

    this.categoryService.getAll().then((categories) => this.categories.set(categories));
    this.boxService.getByMove(this.moveId).then((boxes) => {
      const sorted = boxes.sort((a, b) => a.number - b.number);
      this.availableBoxes.set(sorted);
      this.selectedBox.set(
        this.initialBoxId ? sorted.find((b) => b.id === this.initialBoxId) : undefined,
      );
    });

    this.step.set('camera');
    this.photoUri.set(null);
    this.name.set('');
    this.weightKg.set(null);
    this.fragile.set(false);
    this.essential.set(false);
    this.quantity.set(1);
    this.selectedCategories.set(new Set());
  }

  async takePhoto(): Promise<void> {
    this.capturing.set(true);
    try {
      const uri = await this.photoService.captureAndSave();
      this.photoUri.set(uri);
      this.step.set('form');
    } catch {
      // el usuario canceló la captura — se queda en el paso de cámara
    } finally {
      this.capturing.set(false);
    }
  }

  updateName(event: InputCustomEvent): void {
    this.name.set(String(event.detail.value ?? ''));
  }

  updateWeight(event: InputCustomEvent): void {
    const value = event.detail.value;
    this.weightKg.set(value === '' || value == null ? null : Number(value));
  }

  updateFragile(event: ToggleCustomEvent): void {
    this.fragile.set(event.detail.checked);
  }

  updateEssential(event: ToggleCustomEvent): void {
    this.essential.set(event.detail.checked);
  }

  async chooseBox(): Promise<void> {
    const sheet = await this.actionSheetController.create({
      header: 'Asignar a...',
      buttons: [
        { text: 'Sin asignar', handler: () => this.selectedBox.set(undefined) },
        ...this.availableBoxes().map((box) => ({
          text: `Caja #${box.number}${box.destinationRoom ? ' · ' + box.destinationRoom : ''}`,
          handler: () => this.selectedBox.set(box),
        })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  toggleCategory(categoryId: string): void {
    const current = new Set(this.selectedCategories());
    if (current.has(categoryId)) {
      current.delete(categoryId);
    } else {
      current.add(categoryId);
    }
    this.selectedCategories.set(current);
  }

  incrementQuantity(): void {
    this.quantity.update((q) => q + 1);
  }

  decrementQuantity(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  formatNumber(number: number): string {
    return number.toString().padStart(2, '0');
  }

  cancel(): void {
    this.router.navigate(this.exitDestination(this.initialBoxId ? this.availableBoxes().find((b) => b.id === this.initialBoxId) : undefined));
  }

  async save(): Promise<void> {
    const photoUri = this.photoUri();
    const name = this.name().trim();
    if (!photoUri || !name) return;

    const item = await this.itemService.create({
      name,
      photoUri,
      weightKg: this.weightKg() ?? undefined,
      fragile: this.fragile(),
      essential: this.essential(),
    });

    await Promise.all(
      [...this.selectedCategories()].map((categoryId) =>
        this.itemCategoryService.assign(item.id, categoryId),
      ),
    );

    const destinationBox = this.selectedBox();
    if (destinationBox) {
      await this.boxAssignmentService.assign(item.id, destinationBox.id, this.quantity());
    }

    this.router.navigate(this.exitDestination(destinationBox));
  }

  private exitDestination(box: Box | undefined): string[] {
    return box
      ? ['/moves', this.moveId, 'boxes', box.id]
      : ['/moves', this.moveId, 'pending'];
  }
}
