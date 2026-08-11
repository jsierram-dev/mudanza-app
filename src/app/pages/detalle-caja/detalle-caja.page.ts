import { Component, inject, signal } from '@angular/core';
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
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Articulo, Caja, EstadoCaja } from '../../core/models';
import { ArticuloService, AsignacionCajaService, CajaService, FotoService } from '../../core/services';
import { FotoComponent } from '../../shared/foto/foto.component';

interface ArticuloEnCaja {
  articulo: Articulo;
  cantidad: number;
}

const ESTADOS: EstadoCaja[] = ['vacia', 'empacada', 'en_transito', 'entregada', 'desempacada'];

@Component({
  selector: 'app-detalle-caja',
  templateUrl: './detalle-caja.page.html',
  styleUrl: './detalle-caja.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonFab, IonFabButton, IonIcon, FotoComponent],
})
export class DetalleCajaPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cajaService = inject(CajaService);
  private readonly articuloService = inject(ArticuloService);
  private readonly asignacionCajaService = inject(AsignacionCajaService);
  private readonly fotoService = inject(FotoService);
  private readonly alertController = inject(AlertController);
  private readonly actionSheetController = inject(ActionSheetController);

  private readonly mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;
  private readonly cajaId = this.route.snapshot.paramMap.get('cajaId')!;

  readonly caja = signal<Caja | undefined>(undefined);
  readonly articulos = signal<ArticuloEnCaja[]>([]);

  /**
   * Ionic mantiene vivas las páginas ya visitadas para las transiciones
   * (ver ROADMAP-mudanza.md) — al volver acá después de registrar un
   * artículo, la instancia se REUSA y el constructor no vuelve a correr.
   * ionViewWillEnter sí corre cada vez, incluida la primera.
   */
  ionViewWillEnter(): void {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const [caja, asignaciones] = await Promise.all([
      this.cajaService.getById(this.cajaId),
      this.asignacionCajaService.getArticulosDeCaja(this.cajaId),
    ]);
    this.caja.set(caja);

    const conArticulo = await Promise.all(
      asignaciones.map(async (a): Promise<ArticuloEnCaja | undefined> => {
        const articulo = await this.articuloService.getById(a.articuloId);
        return articulo ? { articulo, cantidad: a.cantidad } : undefined;
      }),
    );
    this.articulos.set(conArticulo.filter((a): a is ArticuloEnCaja => a !== undefined));
  }

  formatEstado(estado: EstadoCaja): string {
    return estado.replace('_', ' ');
  }

  async cambiarEstado(): Promise<void> {
    const cajaActual = this.caja();
    if (!cajaActual) return;

    const sheet = await this.actionSheetController.create({
      header: 'Estado de la caja',
      buttons: [
        ...ESTADOS.map((estado) => ({
          text: this.formatEstado(estado),
          handler: async () => {
            const actualizada: Caja = { ...cajaActual, estado };
            await this.cajaService.actualizar(actualizada);
            this.caja.set(actualizada);
          },
        })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async editarHabitacion(): Promise<void> {
    const cajaActual = this.caja();
    if (!cajaActual) return;

    const alert = await this.alertController.create({
      header: 'Habitación destino',
      inputs: [{ name: 'habitacionDestino', type: 'text', value: cajaActual.habitacionDestino ?? '' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const actualizada: Caja = { ...cajaActual, habitacionDestino: (data.habitacionDestino ?? '').trim() || undefined };
            await this.cajaService.actualizar(actualizada);
            this.caja.set(actualizada);
          },
        },
      ],
    });
    await alert.present();
  }

  async cambiarFoto(): Promise<void> {
    const cajaActual = this.caja();
    if (!cajaActual) return;
    try {
      const fotoPortadaUri = await this.fotoService.capturarYGuardar();
      const actualizada: Caja = { ...cajaActual, fotoPortadaUri };
      await this.cajaService.actualizar(actualizada);
      this.caja.set(actualizada);
    } catch {
      // el usuario canceló la captura — no es un error a mostrar
    }
  }

  registrarArticulo(): void {
    this.router.navigate(['/mudanzas', this.mudanzaId, 'cajas', this.cajaId, 'nuevo-articulo']);
  }
}
