import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonButton,
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
import { Move } from '../../core/models';
import { MoveService } from '../../core/services';
import { AccountButtonComponent } from '../../shared/account-button/account-button.component';

@Component({
  selector: 'app-moves',
  templateUrl: './moves.page.html',
  styleUrl: './moves.page.scss',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    AccountButtonComponent,
    DatePipe,
  ],
})
export class MovesPage implements ViewWillEnter {
  private readonly moveService = inject(MoveService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly actionSheetController = inject(ActionSheetController);

  readonly moves = signal<Move[]>([]);

  // Ionic reusa instancias de página ya visitadas — ver la nota en
  // BoxDetailPage. ionViewWillEnter corre siempre, constructor no.
  ionViewWillEnter(): void {
    this.load();
  }

  private async load(): Promise<void> {
    this.moves.set(await this.moveService.getAll());
  }

  open(move: Move): void {
    this.router.navigate(['/moves', move.id, 'boxes']);
  }

  async newMove(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nueva mudanza',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Ej. Casa nueva — Alicante' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            const name = (data.name ?? '').trim();
            if (!name) return false;
            const created = await this.moveService.create(name);
            await this.load();
            this.open(created);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async openOptions(move: Move): Promise<void> {
    const sheet = await this.actionSheetController.create({
      header: move.name,
      buttons: [
        { text: 'Editar nombre', handler: () => this.editMove(move) },
        { text: 'Borrar mudanza', role: 'destructive', handler: () => this.confirmDeleteMove(move) },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async editMove(move: Move): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Editar nombre',
      inputs: [{ name: 'name', type: 'text', value: move.name, placeholder: 'Ej. Casa nueva — Alicante' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const name = (data.name ?? '').trim();
            if (!name) return false;
            await this.moveService.update({ ...move, name });
            await this.load();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Tombstone vía MoveService.delete() (cascada a las cajas de la mudanza,
   * asignaciones y fotos de portada incluidas ahí). Los artículos NO se
   * borran — quedan sin asignar, por eso el mensaje avisa.
   */
  private async confirmDeleteMove(move: Move): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Borrar mudanza',
      message: `¿Seguro que querés borrar «${move.name}»? Se van a borrar también todas sus cajas. Los artículos no se borran — quedan sin asignar. Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: async () => {
            await this.moveService.delete(move.id);
            await this.load();
          },
        },
      ],
    });
    await alert.present();
  }
}
