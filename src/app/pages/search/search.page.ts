import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonButtons, IonContent, IonHeader, IonSearchbar, IonToolbar } from '@ionic/angular/standalone';
import type { SearchbarCustomEvent, ViewWillEnter } from '@ionic/angular/standalone';
import { Item } from '../../core/models';
import { BoxAssignmentService, BoxService, ItemService } from '../../core/services';
import { AccountButtonComponent } from '../../shared/account-button/account-button.component';
import { PhotoComponent } from '../../shared/photo/photo.component';

interface ItemLocation {
  boxNumber: number;
  room?: string;
  quantity: number;
}

interface SearchResult {
  item: Item;
  locations: ItemLocation[];
}

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrl: './search.page.scss',
  imports: [IonHeader, IonToolbar, IonButtons, IonContent, IonSearchbar, PhotoComponent, AccountButtonComponent],
})
export class SearchPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly itemService = inject(ItemService);
  private readonly boxAssignmentService = inject(BoxAssignmentService);
  private readonly boxService = inject(BoxService);

  private readonly moveId = this.route.snapshot.paramMap.get('moveId')!;

  readonly text = signal('');
  readonly onlyFragile = signal(false);
  readonly onlyEssential = signal(false);
  readonly results = signal<SearchResult[]>([]);

  constructor() {
    // Ver el comentario largo en BoxesPage: esta página vive en <ion-tabs> y
    // ionViewWillEnter no dispara al volver desde fuera de las pestañas.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.endsWith(`/${this.moveId}/search`)) this.updateResults();
      });
  }

  // Por defecto muestra todos los artículos (aunque ya estén en una caja),
  // no solo los que matchean una búsqueda — pedido explícito del usuario.
  ionViewWillEnter(): void {
    this.updateResults();
  }

  async search(event: SearchbarCustomEvent): Promise<void> {
    const text = event.detail.value ?? '';
    this.text.set(text);
    await this.updateResults();
  }

  async toggleFragile(): Promise<void> {
    this.onlyFragile.update((v) => !v);
    await this.updateResults();
  }

  async toggleEssential(): Promise<void> {
    this.onlyEssential.update((v) => !v);
    await this.updateResults();
  }

  viewItem(itemId: string): void {
    this.router.navigate(['/moves', this.moveId, 'items', itemId]);
  }

  private async updateResults(): Promise<void> {
    // searchByName('') ya devuelve todos — sin guard de "texto vacío".
    let items = await this.itemService.searchByName(this.text());
    if (this.onlyFragile()) items = items.filter((i) => i.fragile);
    if (this.onlyEssential()) items = items.filter((i) => i.essential);

    this.results.set(await Promise.all(items.map((item) => this.resolveLocations(item))));
  }

  private async resolveLocations(item: Item): Promise<SearchResult> {
    const assignments = await this.boxAssignmentService.getBoxesForItem(item.id);
    const locations = await Promise.all(
      assignments.map(async (assignment): Promise<ItemLocation | undefined> => {
        const box = await this.boxService.getById(assignment.boxId);
        return box ? { boxNumber: box.number, room: box.destinationRoom, quantity: assignment.quantity } : undefined;
      }),
    );
    return { item, locations: locations.filter((l): l is ItemLocation => l !== undefined) };
  }
}
