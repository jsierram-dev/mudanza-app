import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/auth-user.model';

// Mismo bug/fix que SyncService/PhotoService (ver ROADMAP-mudanza.md,
// 2026-08-19): sin timeout, un login trabado (jp-back-auth en cold start,
// wifi inestable) dejaba "Iniciando sesión..." colgado para siempre.
const LOGIN_TIMEOUT_MS = 60_000;

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface StoredAuth {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = 'mudanza.auth';

/**
 * Login opcional (decidido 2026-08-12, ver ROADMAP-mudanza.md) — la app
 * funciona 100% local sin iniciar sesión, esto solo habilita /sync. Mismo
 * patrón que similart-app/src/app/core/services/auth.service.ts (mismo
 * backend, jp-back-auth), sin refresh automático todavía — tampoco lo tiene
 * similart-app hoy, el método refresh() existe pero nada lo dispara solo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    this.restoreSession();
  }

  async loginWithGoogle(idToken: string): Promise<AuthUser> {
    // authBaseUrl (jp-back-auth), no apiBaseUrl (mudanza-back) — mudanza-back
    // solo VERIFICA JWTs ya emitidos, nunca los emite. Bug real encontrado
    // 2026-08-13: esto pegaba contra apiBaseUrl y 404eaba siempre — ver
    // ROADMAP-mudanza.md.
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.authBaseUrl}/auth/google`, { idToken }).pipe(timeout(LOGIN_TIMEOUT_MS)),
    );
    this.persistSession(response);
    return response.user;
  }

  logout(): void {
    this.accessToken = null;
    this.refreshTokenValue = null;
    this.currentUser.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private persistSession(response: LoginResponse): void {
    this.accessToken = response.accessToken;
    this.refreshTokenValue = response.refreshToken;
    this.currentUser.set(response.user);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (!this.accessToken || !this.refreshTokenValue) return;
    const stored: StoredAuth = {
      user: this.currentUser()!,
      accessToken: this.accessToken,
      refreshToken: this.refreshTokenValue,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }

  private restoreSession(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const stored: StoredAuth = JSON.parse(raw);
      this.accessToken = stored.accessToken;
      this.refreshTokenValue = stored.refreshToken;
      this.currentUser.set(stored.user);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
