import { Component, effect, inject, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { FotoService } from '../../core/services';

/**
 * <app-foto [uri]="articulo.fotoUri" alt="..."> — envoltorio compartido
 * alrededor de FotoService.resolverSrc() (async, ver ese service para el
 * porqué). Reemplaza a un <img [src]> crudo en cualquier lugar donde se
 * muestre un fotoUri guardado (Articulo.fotoUri, Caja.fotoPortadaUri).
 */
@Component({
  selector: 'app-foto',
  template: `
    @if (src(); as s) {
      <img [src]="s" [alt]="alt()" />
    } @else {
      <span class="placeholder"><ion-icon name="image-outline"></ion-icon></span>
    }
  `,
  styleUrl: './foto.component.scss',
  imports: [IonIcon],
})
export class FotoComponent {
  private readonly fotoService = inject(FotoService);

  readonly uri = input.required<string>();
  readonly alt = input<string>('');

  readonly src = signal<string | null>(null);

  constructor() {
    effect(() => {
      const uri = this.uri();
      this.src.set(null);
      this.fotoService.resolverSrc(uri).then((resuelto) => this.src.set(resuelto));
    });
  }
}
