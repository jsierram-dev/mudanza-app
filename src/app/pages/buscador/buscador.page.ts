import { Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonSearchbar, IonToolbar } from '@ionic/angular/standalone';
import type { SearchbarCustomEvent } from '@ionic/angular/standalone';
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
export class BuscadorPage {
  private readonly articuloService = inject(ArticuloService);
  private readonly asignacionCajaService = inject(AsignacionCajaService);
  private readonly cajaService = inject(CajaService);

  readonly texto = signal('');
  readonly soloFragiles = signal(false);
  readonly soloEsenciales = signal(false);
  readonly resultados = signal<ResultadoBusqueda[]>([]);

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

  private async actualizarResultados(): Promise<void> {
    if (!this.texto().trim()) {
      this.resultados.set([]);
      return;
    }

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
