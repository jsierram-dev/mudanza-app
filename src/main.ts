import { PLATFORM_ID } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { Storage, StorageConfigToken, provideStorage } from '@ionic/storage-angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// Registro manual equivalente a IonicStorageModule.forRoot(), adaptado a
// bootstrap standalone (ver core/services/storage.service.ts para el wrapper
// que el resto de la app debe usar en vez de inyectar Storage directamente).
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    { provide: StorageConfigToken, useValue: null },
    { provide: Storage, useFactory: provideStorage, deps: [PLATFORM_ID, StorageConfigToken] },
  ],
});
