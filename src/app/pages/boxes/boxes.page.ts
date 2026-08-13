import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
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
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Box, BoxStatus } from '../../core/models';
import { BoxService, DEFAULT_COVER_PHOTO, MoveService } from '../../core/services';
import { formatWeight } from '../../core/utils/weight';
import { AccountButtonComponent } from '../../shared/account-button/account-button.component';
import { PhotoComponent } from '../../shared/photo/photo.component';

interface BoxWithWeight {
  box: Box;
  weightKg: number;
}

@Component({
  selector: 'app-boxes',
  templateUrl: './boxes.page.html',
  styleUrl: './boxes.page.scss',
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
    AccountButtonComponent,
  ],
})
export class BoxesPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly boxService = inject(BoxService);
  private readonly moveService = inject(MoveService);
  private readonly alertController = inject(AlertController);

  private readonly moveId = this.route.snapshot.paramMap.get('moveId')!;

  readonly moveTitle = signal('');
  readonly boxes = signal<BoxWithWeight[]>([]);

  // Ionic reusa instancias de página ya visitadas — ver la nota en
  // BoxDetailPage. ionViewWillEnter corre siempre, constructor no.
  constructor() {
    // ionViewWillEnter (abajo) no alcanza acá: esta página vive dentro de
    // <ion-tabs>, y cuando se navega a una pantalla fuera de las pestañas
    // (ej. Box Detail) y se vuelve, Ionic la re-muestra sin volver a
    // disparar el lifecycle (sí lo hace para páginas normales fuera de
    // pestañas — comprobado). Router.events es la fuente de verdad que sí
    // dispara siempre, sin depender del cacheo interno de Ionic.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.endsWith(`/${this.moveId}/boxes`)) this.load();
      });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  private async load(): Promise<void> {
    const [move, boxes] = await Promise.all([
      this.moveService.getById(this.moveId),
      this.boxService.getByMove(this.moveId),
    ]);
    this.moveTitle.set(move?.name ?? 'Mudanza');

    const sorted = boxes.sort((a, b) => a.number - b.number);
    const withWeight = await Promise.all(
      sorted.map(async (box): Promise<BoxWithWeight> => ({ box, weightKg: await this.boxService.totalWeightKg(box.id) })),
    );
    this.boxes.set(withWeight);
  }

  open(box: Box): void {
    this.router.navigate(['/moves', this.moveId, 'boxes', box.id]);
  }

  formatWeight(kg: number): string {
    return formatWeight(kg);
  }

  formatNumber(number: number): string {
    return number.toString().padStart(2, '0');
  }

  formatStatus(status: BoxStatus): string {
    return status.replace('_', ' ');
  }

  /** empty es el único estado sin ninguna actividad todavía — el resto se marca como "en curso". */
  isActive(status: BoxStatus): boolean {
    return status !== 'empty';
  }

  isDefaultPhoto(coverPhotoUri: string): boolean {
    return coverPhotoUri === DEFAULT_COVER_PHOTO;
  }

  async newBox(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nueva caja',
      inputs: [
        { name: 'destinationRoom', type: 'text', placeholder: 'Habitación (ej. Cocina)' },
        { name: 'name', type: 'text', placeholder: 'Nombre (opcional)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            await this.boxService.create(this.moveId, {
              destinationRoom: (data.destinationRoom ?? '').trim() || undefined,
              name: (data.name ?? '').trim() || undefined,
            });
            await this.load();
          },
        },
      ],
    });
    await alert.present();
  }
}
