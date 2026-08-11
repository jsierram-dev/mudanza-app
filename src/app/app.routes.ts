import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'mudanzas', pathMatch: 'full' },
  {
    path: 'mudanzas',
    loadComponent: () => import('./pages/mudanzas/mudanzas.page').then((m) => m.MudanzasPage),
  },
  {
    // Cajas/Pendientes/Buscar comparten pestañas dentro de una mudanza — ver
    // el diagrama de flujo del artifact de wireframes: Cajas es el hub.
    path: 'mudanzas/:mudanzaId',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'cajas',
        loadComponent: () => import('./pages/cajas/cajas.page').then((m) => m.CajasPage),
      },
      {
        path: 'pendientes',
        loadComponent: () => import('./pages/pendientes/pendientes.page').then((m) => m.PendientesPage),
      },
      {
        path: 'buscar',
        loadComponent: () => import('./pages/buscador/buscador.page').then((m) => m.BuscadorPage),
      },
      { path: '', redirectTo: 'cajas', pathMatch: 'full' },
    ],
  },
  {
    path: 'mudanzas/:mudanzaId/cajas/:cajaId',
    loadComponent: () => import('./pages/detalle-caja/detalle-caja.page').then((m) => m.DetalleCajaPage),
  },
  {
    path: 'mudanzas/:mudanzaId/cajas/:cajaId/nuevo-articulo',
    loadComponent: () =>
      import('./pages/registrar-articulo/registrar-articulo.page').then((m) => m.RegistrarArticuloPage),
  },
];
