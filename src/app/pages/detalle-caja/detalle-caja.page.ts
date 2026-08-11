import { Component, computed, inject, signal } from '@angular/core';
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
  ToastController,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Articulo, Caja, EstadoCaja } from '../../core/models';
import { ArticuloService, AsignacionCajaService, CajaService, FOTO_PORTADA_DEFAULT, FotoService } from '../../core/services';
import { formatPeso } from '../../core/utils/peso';
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
    FotoComponent,
  ],
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
  private readonly toastController = inject(ToastController);

  private readonly mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;
  private readonly cajaId = this.route.snapshot.paramMap.get('cajaId')!;

  readonly caja = signal<Caja | undefined>(undefined);
  readonly articulos = signal<ArticuloEnCaja[]>([]);

  /** Suma pesoKg × cantidad de lo ya cargado — sin llamadas extra al service. */
  readonly pesoTotalTexto = computed(() =>
    formatPeso(this.articulos().reduce((total, item) => total + (item.articulo.pesoKg ?? 0) * item.cantidad, 0)),
  );

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

  /** true = todavía no tiene foto propia, hay que mostrar el placeholder. */
  esFotoPorDefecto(fotoPortadaUri: string): boolean {
    return fotoPortadaUri === FOTO_PORTADA_DEFAULT;
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
    } catch (error) {
      // "user cancelled photos app" / "No image picked" son cancelaciones,
      // no errores reales — cualquier otra cosa sí vale la pena mostrarla en
      // vez de fallar en silencio (así se vio "no funciona" la primera vez).
      const mensaje = error instanceof Error ? error.message : String(error);
      if (/cancel|no image/i.test(mensaje)) return;
      const toast = await this.toastController.create({
        message: 'No se pudo guardar la foto. Probá de nuevo.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  registrarArticulo(): void {
    this.router.navigate(['/mudanzas', this.mudanzaId, 'nuevo-articulo'], {
      queryParams: { cajaId: this.cajaId },
    });
  }

  verArticulo(articuloId: string): void {
    this.router.navigate(['/mudanzas', this.mudanzaId, 'articulos', articuloId]);
  }
}
