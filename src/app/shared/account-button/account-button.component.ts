import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

/**
 * Botón de acceso a Cuenta — mismo ícono, mismo lugar (esquina derecha del
 * toolbar) en todas las pantallas. Antes solo vivía en Mudanzas; pedido
 * explícito del usuario (2026-08-13) para tenerlo en todas las pantallas.
 */
@Component({
  selector: 'app-account-button',
  template: `
    <ion-button routerLink="/account" aria-label="Cuenta">
      <ion-icon slot="icon-only" name="person-circle-outline"></ion-icon>
    </ion-button>
  `,
  imports: [IonButton, IonIcon, RouterLink],
})
export class AccountButtonComponent {}
