import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
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
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonInput, IonToggle, FotoComponent],
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

  private readonly mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;
  private readonly cajaId = this.route.snapshot.paramMap.get('cajaId')!;

  readonly caja = signal<Caja | undefined>(undefined);
  readonly paso = signal<Paso>('camara');
  readonly fotoUri = signal<string | null>(null);
  readonly capturando = signal(false);

  readonly nombre = signal('');
  readonly pesoKg = signal<number | null>(null);
  readonly fragil = signal(false);
  readonly esencial = signal(false);
  readonly sinAsignar = signal(false);
  readonly cantidad = signal(1);

  readonly categorias = signal<Categoria[]>([]);
  readonly categoriasSeleccionadas = signal<Set<string>>(new Set());

  /**
   * Ionic reusa instancias de página ya visitadas — ver la nota en
   * DetalleCajaPage. Acá importa doble: además de recargar datos, hay que
   * resetear el formulario, o registrar un segundo artículo mostraría los
   * datos del anterior todavía cargados.
   */
  ionViewWillEnter(): void {
    this.categoriaService.getAll().then((categorias) => this.categorias.set(categorias));
    this.cajaService.getById(this.cajaId).then((caja) => this.caja.set(caja));

    this.paso.set('camara');
    this.fotoUri.set(null);
    this.nombre.set('');
    this.pesoKg.set(null);
    this.fragil.set(false);
    this.esencial.set(false);
    this.sinAsignar.set(false);
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

  toggleSinAsignar(): void {
    this.sinAsignar.update((v) => !v);
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
    this.router.navigate(['/mudanzas', this.mudanzaId, 'cajas', this.cajaId]);
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

    if (!this.sinAsignar()) {
      await this.asignacionCajaService.asignar(articulo.id, this.cajaId, this.cantidad());
    }

    this.router.navigate(['/mudanzas', this.mudanzaId, 'cajas', this.cajaId]);
  }
}
