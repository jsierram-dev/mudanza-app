import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonContent, IonHeader, IonSearchbar, IonToolbar } from '@ionic/angular/standalone';
import type { SearchbarCustomEvent, ViewWillEnter } from '@ionic/angular/standalone';
import { Articulo } from '../../core/models';
import { ArticuloService, AsignacionCajaService, CajaService } from '../../core/services';
import { FotoComponent } from '../../shared/foto/foto.component';

interface UbicacionArticulo {
  numeroCaja: number;
  habitacion?: string;
  cantidad: number;
}

interface ResultadoBusqueda {
  articulo: Articulo;
  ubicaciones: UbicacionArticulo[];
}

@Component({
  selector: 'app-buscador',
  templateUrl: './buscador.page.html',
  styleUrl: './buscador.page.scss',
  imports: [IonHeader, IonToolbar, IonContent, IonSearchbar, FotoComponent],
})
export class BuscadorPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articuloService = inject(ArticuloService);
  private readonly asignacionCajaService = inject(AsignacionCajaService);
  private readonly cajaService = inject(CajaService);

  private readonly mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;

  readonly texto = signal('');
  readonly soloFragiles = signal(false);
  readonly soloEsenciales = signal(false);
  readonly resultados = signal<ResultadoBusqueda[]>([]);

  constructor() {
    // Ver el comentario largo en CajasPage: esta página vive en <ion-tabs> y
    // ionViewWillEnter no dispara al volver desde fuera de las pestañas.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.endsWith(`/${this.mudanzaId}/buscar`)) this.actualizarResultados();
      });
  }

  // Por defecto muestra todos los artículos (aunque ya estén en una caja),
  // no solo los que matchean una búsqueda — pedido explícito del usuario.
  ionViewWillEnter(): void {
    this.actualizarResultados();
  }

  async buscar(evento: SearchbarCustomEvent): Promise<void> {
    const texto = evento.detail.value ?? '';
    this.texto.set(texto);
    await this.actualizarResultados();
  }

  async toggleFragiles(): Promise<void> {
    this.soloFragiles.update((v) => !v);
    await this.actualizarResultados();
  }

  async toggleEsenciales(): Promise<void> {
    this.soloEsenciales.update((v) => !v);
    await this.actualizarResultados();
  }

  verArticulo(articuloId: string): void {
    this.router.navigate(['/mudanzas', this.mudanzaId, 'articulos', articuloId]);
  }

  private async actualizarResultados(): Promise<void> {
    // buscarPorNombre('') ya devuelve todos — sin guard de "texto vacío".
    let articulos = await this.articuloService.buscarPorNombre(this.texto());
    if (this.soloFragiles()) articulos = articulos.filter((a) => a.fragil);
    if (this.soloEsenciales()) articulos = articulos.filter((a) => a.esencial);

    this.resultados.set(await Promise.all(articulos.map((articulo) => this.resolverUbicaciones(articulo))));
  }

  private async resolverUbicaciones(articulo: Articulo): Promise<ResultadoBusqueda> {
    const asignaciones = await this.asignacionCajaService.getCajasDeArticulo(articulo.id);
    const ubicaciones = await Promise.all(
      asignaciones.map(async (asignacion): Promise<UbicacionArticulo | undefined> => {
        const caja = await this.cajaService.getById(asignacion.cajaId);
        return caja ? { numeroCaja: caja.numero, habitacion: caja.habitacionDestino, cantidad: asignacion.cantidad } : undefined;
      }),
    );
    return { articulo, ubicaciones: ubicaciones.filter((u): u is UbicacionArticulo => u !== undefined) };
  }
}
