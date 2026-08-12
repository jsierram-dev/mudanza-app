import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'moves', pathMatch: 'full' },
  {
    path: 'moves',
    loadComponent: () => import('./pages/moves/moves.page').then((m) => m.MovesPage),
  },
  {
    path: 'account',
    loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
  },
  {
    path: 'conflicts',
    loadComponent: () => import('./pages/conflicts/conflicts.page').then((m) => m.ConflictsPage),
  },
  {
    // Boxes/Pending/Search comparten pestañas dentro de una mudanza — ver
    // el diagrama de flujo del artifact de wireframes: Boxes es el hub.
    path: 'moves/:moveId',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'boxes',
        loadComponent: () => import('./pages/boxes/boxes.page').then((m) => m.BoxesPage),
      },
      {
        path: 'pending',
        loadComponent: () => import('./pages/pending/pending.page').then((m) => m.PendingPage),
      },
      {
        path: 'search',
        loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage),
      },
      { path: '', redirectTo: 'boxes', pathMatch: 'full' },
    ],
  },
  {
    path: 'moves/:moveId/boxes/:boxId',
    loadComponent: () => import('./pages/box-detail/box-detail.page').then((m) => m.BoxDetailPage),
  },
  {
    // Escopada a la mudanza, no a una caja — se puede entrar desde el FAB de
    // Box Detail (con ?boxId= precargado) o desde el de Pending (sin caja,
    // el usuario la elige adentro o la deja sin asignar).
    path: 'moves/:moveId/new-item',
    loadComponent: () => import('./pages/register-item/register-item.page').then((m) => m.RegisterItemPage),
  },
  {
    path: 'moves/:moveId/items/:itemId',
    loadComponent: () => import('./pages/item-detail/item-detail.page').then((m) => m.ItemDetailPage),
  },
];
