import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Articulo } from '../../core/models';
import { ArticuloService, AsignacionCajaService, CajaService } from '../../core/services';
import { FotoComponent } from '../../shared/foto/foto.component';

@Component({
  selector: 'app-pendientes',
  templateUrl: './pendientes.page.html',
  styleUrl: './pendientes.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, DatePipe, FotoComponent],
})
export class PendientesPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly articuloService = inject(ArticuloService);
  private readonly cajaService = inject(CajaService);
  private readonly asignacionCajaService = inject(AsignacionCajaService);
  private readonly actionSheetController = inject(ActionSheetController);

  private readonly mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;

  readonly pendientes = signal<Articulo[]>([]);

  // Ionic reusa instancias de página ya visitadas — ver la nota en
  // DetalleCajaPage. ionViewWillEnter corre siempre, constructor no.
  ionViewWillEnter(): void {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    this.pendientes.set(await this.articuloService.getSinAsignar());
  }

  /**
   * Resuelve el punto que quedó "por definir" en el diagrama de flujo de los
   * wireframes: selector rápido con ActionSheet, sobre las cajas de la
   * mudanza actual, cantidad por defecto 1 (editable después desde el
   * detalle de la caja si hace falta más de una unidad).
   */
  async asignar(articulo: Articulo): Promise<void> {
    const cajas = await this.cajaService.getPorMudanza(this.mudanzaId);
    if (cajas.length === 0) return;

    const sheet = await this.actionSheetController.create({
      header: `Asignar "${articulo.nombre}" a...`,
      buttons: [
        ...cajas
          .sort((a, b) => a.numero - b.numero)
          .map((caja) => ({
            text: `Caja #${caja.numero}${caja.habitacionDestino ? ' · ' + caja.habitacionDestino : ''}`,
            handler: async () => {
              await this.asignacionCajaService.asignar(articulo.id, caja.id, 1);
              await this.cargar();
            },
          })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }
}
