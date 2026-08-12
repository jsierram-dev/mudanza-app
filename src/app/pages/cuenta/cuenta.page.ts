import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { AuthService, SyncService } from '../../core/services';

function cargarScriptGoogleIdentity(): Promise<void> {
  if (document.getElementById('google-identity-script')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el script de Google'));
    document.head.appendChild(script);
  });
}

/**
 * Login opcional + sincronización manual — ver ROADMAP-mudanza.md. Sin login
 * la app sigue andando 100% local igual que siempre; esta pantalla es la
 * única que necesita conexión.
 */
@Component({
  selector: 'app-cuenta',
  templateUrl: './cuenta.page.html',
  styleUrl: './cuenta.page.scss',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon, DatePipe],
})
export class CuentaPage implements AfterViewInit, ViewWillEnter {
  @ViewChild('googleButton') private googleButtonRef?: ElementRef<HTMLDivElement>;

  protected readonly auth = inject(AuthService);
  protected readonly sync = inject(SyncService);
  private readonly toastController = inject(ToastController);

  readonly errorLogin = signal<string | null>(null);
  readonly ultimaSincronizacion = signal<string | null>(null);

  ionViewWillEnter(): void {
    this.cargarUltimaSincronizacion();
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.auth.isAuthenticated() || !this.googleButtonRef) return;
    try {
      await cargarScriptGoogleIdentity();
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response) => this.handleGoogleCredential(response.credential),
      });
      google.accounts.id.renderButton(this.googleButtonRef.nativeElement, {
        theme: 'filled_black',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width: 320,
      });
    } catch {
      this.errorLogin.set('No se pudo cargar el inicio de sesión de Google.');
    }
  }

  private async handleGoogleCredential(idToken: string): Promise<void> {
    this.errorLogin.set(null);
    try {
      await this.auth.loginWithGoogle(idToken);
      await this.sincronizarAhora();
    } catch {
      this.errorLogin.set('No se pudo iniciar sesión con Google.');
    }
  }

  cerrarSesion(): void {
    this.auth.logout();
  }

  async sincronizarAhora(): Promise<void> {
    const resultado = await this.sync.sincronizar();
    await this.cargarUltimaSincronizacion();

    if (resultado.ok) {
      const mensaje =
        resultado.conflictos > 0
          ? `Sincronizado — ${resultado.conflictos} cambio(s) en conflicto sin resolver todavía`
          : 'Sincronizado';
      const toast = await this.toastController.create({
        message: mensaje,
        duration: 2500,
        color: resultado.conflictos > 0 ? 'warning' : 'success',
      });
      await toast.present();
      return;
    }

    if (resultado.motivo === 'error') {
      const toast = await this.toastController.create({
        message: 'No se pudo sincronizar. Revisá tu conexión e intentá de nuevo.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  private async cargarUltimaSincronizacion(): Promise<void> {
    this.ultimaSincronizacion.set(await this.sync.ultimaSincronizacion());
  }
}
