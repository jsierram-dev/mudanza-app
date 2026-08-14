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
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Move } from '../../core/models';
import { MoveService, TranslationService } from '../../core/services';
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
    TranslatePipe,
  ],
})
export class MovesPage implements ViewWillEnter {
  private readonly moveService = inject(MoveService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly i18n = inject(TranslationService);

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
      header: this.i18n.t('moves.newMoveHeader'),
      inputs: [{ name: 'name', type: 'text', placeholder: this.i18n.t('moves.namePlaceholder') }],
      buttons: [
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('common.create'),
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
        { text: this.i18n.t('moves.editNameHeader'), handler: () => this.editMove(move) },
        { text: this.i18n.t('moves.deleteHeader'), role: 'destructive', handler: () => this.confirmDeleteMove(move) },
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async editMove(move: Move): Promise<void> {
    const alert = await this.alertController.create({
      header: this.i18n.t('moves.editNameHeader'),
      inputs: [{ name: 'name', type: 'text', value: move.name, placeholder: this.i18n.t('moves.namePlaceholder') }],
      buttons: [
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('common.save'),
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
      header: this.i18n.t('moves.deleteHeader'),
      message: this.i18n.t('moves.deleteConfirm', { name: move.name }),
      buttons: [
        { text: this.i18n.t('common.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('common.delete'),
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
