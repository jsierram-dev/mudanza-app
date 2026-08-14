import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular/standalone';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { AuthService, SyncService, TranslationService } from './core/services';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly syncService = inject(SyncService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly toastController = inject(ToastController);
  private readonly i18n = inject(TranslationService);

  /**
   * Trigger automático al abrir (decidido 2026-08-12, ver ROADMAP-mudanza.md)
   * — solo si hay sesión iniciada; sin login, la app sigue siendo 100% local
   * y esto no hace nada. Sin bloquear el arranque (no se espera el await) y
   * en silencio: un fallo acá no debe interrumpir el uso local de la app, el
   * botón manual en Cuenta cubre el caso de querer forzarlo o reintentarlo.
   */
  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.syncService.sync();
    }
    this.watchForUpdates();
  }

  /**
   * Sin esto, el service worker (ver ROADMAP-mudanza.md, sección PWA) baja
   * la versión nueva en segundo plano pero nunca la activa para una pestaña
   * ya abierta — cualquiera que haya visitado la app antes de un deploy se
   * queda pegado al bundle viejo hasta cerrar y reabrir (a veces dos veces),
   * en silencio, sin aviso. Bug real encontrado 2026-08-13: así se explicó
   * un login que fallaba solo en un dispositivo que ya había visitado el
   * sitio antes del fix.
   */
  private watchForUpdates(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => this.promptReload());

    // Estado del que el service worker no puede recuperarse solo (ej. un
    // archivo del build ya no matchea el hash que esperaba) — recargar es
    // la única salida real, mejor avisar que dejar la app rota en silencio.
    this.swUpdate.unrecoverable.subscribe(() => this.promptReload());
  }

  private async promptReload(): Promise<void> {
    const toast = await this.toastController.create({
      message: this.i18n.t('common.updateAvailable'),
      position: 'top',
      color: 'medium',
      buttons: [
        {
          text: this.i18n.t('common.update'),
          handler: async () => {
            await this.swUpdate.activateUpdate().catch(() => undefined);
            document.location.reload();
          },
        },
      ],
    });
    await toast.present();
  }
}
