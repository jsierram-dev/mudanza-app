import { registerLocaleData } from '@angular/common';
import { LOCALE_ID, PLATFORM_ID, isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  withRouterConfig,
  PreloadAllModules,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { Storage, StorageConfigToken, provideStorage } from '@ionic/storage-angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { registerIcons } from './app/core/icons';
import { readStoredLocale } from './app/core/i18n/locale';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { provideServiceWorker } from '@angular/service-worker';

registerIcons();
// Solo tiene efecto real corriendo en navegador/PWA — @capacitor/camera usa
// APIs nativas directas en iOS/Android y no necesita esto, pero sin registrar
// el elemento <pwa-camera-modal> aquí, Camera.getPhoto() se queda colgado en
// web (ver ROADMAP-mudanza.md).
defineCustomElements(window);

async function main(): Promise<void> {
  // Idioma elegido (ver core/i18n/locale.ts) — leído síncrono ANTES de
  // bootstrapear, porque LOCALE_ID se fija una sola vez acá abajo (ver
  // TranslationService, que recarga la página entera al cambiar de idioma
  // en vez de tratar de hacer todo esto reactivo). Los datos de locale de
  // español solo se cargan si hacen falta — el inglés por defecto no paga
  // ese bundle extra.
  const locale = readStoredLocale();
  if (locale === 'es') {
    const localeEs = await import('@angular/common/locales/es');
    registerLocaleData(localeEs.default);
  }

  // Registro manual equivalente a IonicStorageModule.forRoot(), adaptado a
  // bootstrap standalone (ver core/services/storage.service.ts para el wrapper
  // que el resto de la app debe usar en vez de inyectar Storage directamente).
  await bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      { provide: LOCALE_ID, useValue: locale === 'es' ? 'es' : 'en-US' },
      provideIonicAngular(),
      provideRouter(
        routes,
        withPreloading(PreloadAllModules),
        // Boxes/Pending/Search son rutas hijas de la de pestañas
        // (moves/:moveId) — sin esto, su propio paramMap no vería
        // moveId (Angular no lo hereda del padre por defecto).
        withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      ),
      { provide: StorageConfigToken, useValue: null },
      { provide: Storage, useFactory: provideStorage, deps: [PLATFORM_ID, StorageConfigToken] },
      provideHttpClient(withInterceptors([authInterceptor])),
      // Solo tiene efecto en un build de producción (ng add @angular/pwa) —
      // en dev el service worker queda deshabilitado a propósito.
      provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000',
      }),
    ],
  });
}

main();
