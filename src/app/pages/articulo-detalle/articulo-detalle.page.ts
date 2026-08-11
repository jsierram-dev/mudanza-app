import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { Articulo } from '../../core/models';
import { ArticuloCategoriaService, ArticuloService, AsignacionCajaService, CajaService, CategoriaService } from '../../core/services';
import { FotoComponent } from '../../shared/foto/foto.component';

interface UbicacionArticulo {
  cajaId: string;
  numeroCaja: number;
  habitacion?: string;
  cantidad: number;
}

@Component({
  selector: 'app-articulo-detalle',
  templateUrl: './articulo-detalle.page.html',
  styleUrl: './articulo-detalle.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, FotoComponent, DatePipe],
})
export class ArticuloDetallePage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articuloService = inject(ArticuloService);
  private readonly articuloCategoriaService = inject(ArticuloCategoriaService);
  private readonly asignacionCajaService = inject(AsignacionCajaService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly cajaService = inject(CajaService);

  private mudanzaId = '';
  private articuloId = '';

  readonly articulo = signal<Articulo | undefined>(undefined);
  readonly nombresCategorias = signal<string[]>([]);
  readonly ubicaciones = signal<UbicacionArticulo[]>([]);

  ionViewWillEnter(): void {
    this.mudanzaId = this.route.snapshot.paramMap.get('mudanzaId')!;
    this.articuloId = this.route.snapshot.paramMap.get('articuloId')!;
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const [articulo, categoriaIds, asignaciones, todasLasCategorias] = await Promise.all([
      this.articuloService.getById(this.articuloId),
      this.articuloCategoriaService.getCategoriasDeArticulo(this.articuloId),
      this.asignacionCajaService.getCajasDeArticulo(this.articuloId),
      this.categoriaService.getAll(),
    ]);

    this.articulo.set(articulo);
    this.nombresCategorias.set(
      todasLasCategorias.filter((c) => categoriaIds.includes(c.id)).map((c) => c.nombre),
    );

    const ubicaciones = await Promise.all(
      asignaciones.map(async (a): Promise<UbicacionArticulo | undefined> => {
        const caja = await this.cajaService.getById(a.cajaId);
        return caja
          ? { cajaId: caja.id, numeroCaja: caja.numero, habitacion: caja.habitacionDestino, cantidad: a.cantidad }
          : undefined;
      }),
    );
    this.ubicaciones.set(ubicaciones.filter((u): u is UbicacionArticulo => u !== undefined));
  }

  irACaja(cajaId: string): void {
    this.router.navigate(['/mudanzas', this.mudanzaId, 'cajas', cajaId]);
  }
}
