import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
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
}
