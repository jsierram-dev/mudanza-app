import { Component, effect, inject, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { PhotoService } from '../../core/services';

/**
 * <app-photo [uri]="item.photoUri" alt="..."> — envoltorio compartido
 * alrededor de PhotoService.resolveSrc() (async, ver ese service para el
 * porqué). Reemplaza a un <img [src]> crudo en cualquier lugar donde se
 * muestre un photoUri guardado (Item.photoUri, Box.coverPhotoUri).
 */
@Component({
  selector: 'app-photo',
  template: `
    @if (src(); as s) {
      <img [src]="s" [alt]="alt()" />
    } @else {
      <span class="placeholder"><ion-icon name="image-outline"></ion-icon></span>
    }
  `,
  styleUrl: './photo.component.scss',
  imports: [IonIcon],
})
export class PhotoComponent {
  private readonly photoService = inject(PhotoService);

  readonly uri = input.required<string>();
  readonly alt = input<string>('');

  readonly src = signal<string | null>(null);

  constructor() {
    effect(() => {
      const uri = this.uri();
      this.src.set(null);
      this.photoService.resolveSrc(uri).then((resolved) => this.src.set(resolved));
    });
  }
}
