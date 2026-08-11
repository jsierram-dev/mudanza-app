import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { Caja, EstadoCaja } from '../../core/models';
import { CajaService, MudanzaService } from '../../core/services';

@Component({
  selector: 'app-cajas',
  templateUrl: './cajas.page.html',
  styleUrl: './cajas.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonFab, IonFabButton, IonIcon],
})
export class CajasPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cajaService = inject(CajaService);
  private readonly mudanzaService = inject(MudanzaService);
  private readonly alertController = inject(AlertController);

  private readonly mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;

  readonly tituloMudanza = signal('');
  readonly cajas = signal<Caja[]>([]);

  // Ionic reusa instancias de página ya visitadas — ver la nota en
  // DetalleCajaPage. ionViewWillEnter corre siempre, constructor no.
  ionViewWillEnter(): void {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const [mudanza, cajas] = await Promise.all([
      this.mudanzaService.getById(this.mudanzaId),
      this.cajaService.getPorMudanza(this.mudanzaId),
    ]);
    this.tituloMudanza.set(mudanza?.nombre ?? 'Mudanza');
    this.cajas.set(cajas.sort((a, b) => a.numero - b.numero));
  }

  abrir(caja: Caja): void {
    this.router.navigate(['/mudanzas', this.mudanzaId, 'cajas', caja.id]);
  }

  formatNumero(numero: number): string {
    return numero.toString().padStart(2, '0');
  }

  formatEstado(estado: EstadoCaja): string {
    return estado.replace('_', ' ');
  }

  /** vacía es el único estado sin ninguna actividad todavía — el resto se marca como "en curso". */
  estadoActivo(estado: EstadoCaja): boolean {
    return estado !== 'vacia';
  }

  async nuevaCaja(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nueva caja',
      inputs: [
        { name: 'habitacionDestino', type: 'text', placeholder: 'Habitación (ej. Cocina)' },
        { name: 'nombre', type: 'text', placeholder: 'Nombre (opcional)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            await this.cajaService.crear(this.mudanzaId, {
              habitacionDestino: (data.habitacionDestino ?? '').trim() || undefined,
              nombre: (data.nombre ?? '').trim() || undefined,
            });
            await this.cargar();
          },
        },
      ],
    });
    await alert.present();
  }
}
