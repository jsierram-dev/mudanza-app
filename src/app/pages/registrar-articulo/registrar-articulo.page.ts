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
import { Caja, Categoria } from '../../core/models';
import { FotoComponent } from '../../shared/foto/foto.component';
import {
  ArticuloCategoriaService,
  ArticuloService,
  AsignacionCajaService,
  CajaService,
  CategoriaService,
  FotoService,
} from '../../core/services';

type Paso = 'camara' | 'formulario';

@Component({
  selector: 'app-registrar-articulo',
  templateUrl: './registrar-articulo.page.html',
  styleUrl: './registrar-articulo.page.scss',
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
    FotoComponent,
  ],
})
export class RegistrarArticuloPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fotoService = inject(FotoService);
  private readonly cajaService = inject(CajaService);
  private readonly articuloService = inject(ArticuloService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly articuloCategoriaService = inject(ArticuloCategoriaService);
  private readonly asignacionCajaService = inject(AsignacionCajaService);
  private readonly actionSheetController = inject(ActionSheetController);

  private mudanzaId = '';
  /** Caja con la que se entró (desde el FAB de Detalle de caja) — null si se entró desde Pendientes. */
  private cajaIdInicial: string | null = null;

  readonly cajasDisponibles = signal<Caja[]>([]);
  /** undefined = "sin asignar". Puede venir precargada (cajaIdInicial) o elegirse a mano. */
  readonly cajaSeleccionada = signal<Caja | undefined>(undefined);

  readonly paso = signal<Paso>('camara');
  readonly fotoUri = signal<string | null>(null);
  readonly capturando = signal(false);

  readonly nombre = signal('');
  readonly pesoKg = signal<number | null>(null);
  readonly fragil = signal(false);
  readonly esencial = signal(false);
  readonly cantidad = signal(1);

  readonly categorias = signal<Categoria[]>([]);
  readonly categoriasSeleccionadas = signal<Set<string>>(new Set());

  /**
   * Ionic reusa instancias de página ya visitadas — ver la nota en
   * DetalleCajaPage. Acá importa doble: además de recargar datos (incluidos
   * los params, por si se reusa la instancia con otra mudanza/caja de
   * origen), hay que resetear el formulario, o registrar un segundo
   * artículo mostraría los datos del anterior todavía cargados.
   */
  ionViewWillEnter(): void {
    this.mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;
    this.cajaIdInicial = this.route.snapshot.queryParamMap.get('cajaId');

    this.categoriaService.getAll().then((categorias) => this.categorias.set(categorias));
    this.cajaService.getPorMudanza(this.mudanzaId).then((cajas) => {
      const ordenadas = cajas.sort((a, b) => a.numero - b.numero);
      this.cajasDisponibles.set(ordenadas);
      this.cajaSeleccionada.set(
        this.cajaIdInicial ? ordenadas.find((c) => c.id === this.cajaIdInicial) : undefined,
      );
    });

    this.paso.set('camara');
    this.fotoUri.set(null);
    this.nombre.set('');
    this.pesoKg.set(null);
    this.fragil.set(false);
    this.esencial.set(false);
    this.cantidad.set(1);
    this.categoriasSeleccionadas.set(new Set());
  }

  async tomarFoto(): Promise<void> {
    this.capturando.set(true);
    try {
      const uri = await this.fotoService.capturarYGuardar();
      this.fotoUri.set(uri);
      this.paso.set('formulario');
    } catch {
      // el usuario canceló la captura — se queda en el paso de cámara
    } finally {
      this.capturando.set(false);
    }
  }

  actualizarNombre(evento: InputCustomEvent): void {
    this.nombre.set(String(evento.detail.value ?? ''));
  }

  actualizarPeso(evento: InputCustomEvent): void {
    const valor = evento.detail.value;
    this.pesoKg.set(valor === '' || valor == null ? null : Number(valor));
  }

  actualizarFragil(evento: ToggleCustomEvent): void {
    this.fragil.set(evento.detail.checked);
  }

  actualizarEsencial(evento: ToggleCustomEvent): void {
    this.esencial.set(evento.detail.checked);
  }

  async elegirCaja(): Promise<void> {
    const sheet = await this.actionSheetController.create({
      header: 'Asignar a...',
      buttons: [
        { text: 'Sin asignar', handler: () => this.cajaSeleccionada.set(undefined) },
        ...this.cajasDisponibles().map((caja) => ({
          text: `Caja #${caja.numero}${caja.habitacionDestino ? ' · ' + caja.habitacionDestino : ''}`,
          handler: () => this.cajaSeleccionada.set(caja),
        })),
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  toggleCategoria(categoriaId: string): void {
    const actuales = new Set(this.categoriasSeleccionadas());
    if (actuales.has(categoriaId)) {
      actuales.delete(categoriaId);
    } else {
      actuales.add(categoriaId);
    }
    this.categoriasSeleccionadas.set(actuales);
  }

  incrementarCantidad(): void {
    this.cantidad.update((c) => c + 1);
  }

  decrementarCantidad(): void {
    this.cantidad.update((c) => Math.max(1, c - 1));
  }

  formatNumero(numero: number): string {
    return numero.toString().padStart(2, '0');
  }

  cancelar(): void {
    this.router.navigate(this.destinoAlSalir(this.cajaIdInicial ? this.cajasDisponibles().find((c) => c.id === this.cajaIdInicial) : undefined));
  }

  async guardar(): Promise<void> {
    const fotoUri = this.fotoUri();
    const nombre = this.nombre().trim();
    if (!fotoUri || !nombre) return;

    const articulo = await this.articuloService.crear({
      nombre,
      fotoUri,
      pesoKg: this.pesoKg() ?? undefined,
      fragil: this.fragil(),
      esencial: this.esencial(),
    });

    await Promise.all(
      [...this.categoriasSeleccionadas()].map((categoriaId) =>
        this.articuloCategoriaService.asignar(articulo.id, categoriaId),
      ),
    );

    const cajaDestino = this.cajaSeleccionada();
    if (cajaDestino) {
      await this.asignacionCajaService.asignar(articulo.id, cajaDestino.id, this.cantidad());
    }

    this.router.navigate(this.destinoAlSalir(cajaDestino));
  }

  private destinoAlSalir(caja: Caja | undefined): string[] {
    return caja
      ? ['/mudanzas', this.mudanzaId, 'cajas', caja.id]
      : ['/mudanzas', this.mudanzaId, 'pendientes'];
  }
}
