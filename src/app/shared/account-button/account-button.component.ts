import { Component, computed, inject } from '@angular/core';
import { AccountAvatarComponent } from '@jsierram-dev/jp-user-kit';
import { AuthService } from '../../core/services';

/**
 * Botón de acceso a Cuenta — mismo ícono/foto, mismo lugar (esquina derecha
 * del toolbar) en todas las pantallas. Antes solo vivía en Mudanzas; pedido
 * explícito del usuario (2026-08-13) para tenerlo en todas las pantallas.
 *
 * Wrapper fino sobre `juk-account-avatar` (jp-user-kit, compartido entre
 * proyectos — ver ROADMAP-mudanza.md): acá solo se resuelve la foto real
 * del usuario logueado y se le suma el estilo "Cinta y Cartón" — el
 * componente en sí no sabe nada de AuthService ni de esta app.
 */
@Component({
  selector: 'app-account-button',
  imports: [AccountAvatarComponent],
  template: `<juk-account-avatar class="mv-account-avatar" [photoUrl]="photoUrl()" ariaLabel="Cuenta" routerLink="/account" />`,
  styleUrl: './account-button.component.scss',
})
export class AccountButtonComponent {
  private readonly auth = inject(AuthService);

  protected readonly photoUrl = computed(() => this.auth.currentUser()?.profilePictureUrl ?? null);
}
