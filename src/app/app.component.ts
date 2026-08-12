import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService, SyncService } from './core/services';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly syncService = inject(SyncService);

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
  }
}
