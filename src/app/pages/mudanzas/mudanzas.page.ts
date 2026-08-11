import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Mudanza } from '../../core/models';
import { MudanzaService } from '../../core/services';

@Component({
  selector: 'app-mudanzas',
  templateUrl: './mudanzas.page.html',
  styleUrl: './mudanzas.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonFab, IonFabButton, IonIcon, DatePipe],
})
export class MudanzasPage implements ViewWillEnter {
  private readonly mudanzaService = inject(MudanzaService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);

  readonly mudanzas = signal<Mudanza[]>([]);

  // Ionic reusa instancias de página ya visitadas — ver la nota en
  // DetalleCajaPage. ionViewWillEnter corre siempre, constructor no.
  ionViewWillEnter(): void {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    this.mudanzas.set(await this.mudanzaService.getAll());
  }

  abrir(mudanza: Mudanza): void {
    this.router.navigate(['/mudanzas', mudanza.id, 'cajas']);
  }

  async nuevaMudanza(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nueva mudanza',
      inputs: [{ name: 'nombre', type: 'text', placeholder: 'Ej. Casa nueva — Alicante' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            const nombre = (data.nombre ?? '').trim();
            if (!nombre) return false;
            const creada = await this.mudanzaService.crear(nombre);
            await this.cargar();
            this.abrir(creada);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }
}
