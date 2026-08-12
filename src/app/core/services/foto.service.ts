import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

const RE_FOTO_ID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.[a-z0-9]+$/i;

@Injectable({ providedIn: 'root' })
export class FotoService {
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);

  /**
   * Abre un selector (cámara O archivo/galería — CameraSource.Prompt le deja
   * elegir al usuario, pedido explícito: "revisalo con cámara y archivo
   * adjunto") y guarda la foto de forma permanente en el almacenamiento del
   * dispositivo (Directory.Data). Devuelve solo el nombre de archivo relativo
   * (no un URI completo) — alcanza para reconstruir cualquier operación
   * futura (leer, mostrar, borrar) contra Directory.Data, y evita arrastrar
   * un URI con forma distinta en cada plataforma.
   *
   * Calidad reducida a propósito (70) — ver ROADMAP-mudanza.md, "no comerse
   * el almacenamiento del teléfono con fotos a resolución completa".
   */
  async capturarYGuardar(): Promise<string> {
    const foto = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Foto del artículo',
      promptLabelPhoto: 'Elegir de la galería',
      promptLabelPicture: 'Tomar foto',
      quality: 70,
    });

    if (!foto.base64String) {
      throw new Error('La captura no devolvió datos de imagen.');
    }

    const nombreArchivo = `${crypto.randomUUID()}.jpeg`;
    await Filesystem.writeFile({
      path: nombreArchivo,
      data: foto.base64String,
      directory: Directory.Data,
    });

    return nombreArchivo;
  }

  /**
   * Resuelve un fotoUri guardado (nombre de archivo relativo a Directory.Data,
   * o una ruta de asset normal como la portada de caja por defecto) a algo
   * que un <img src> pueda cargar.
   *
   * Nativo (iOS/Android): Filesystem.getUri() + Capacitor.convertFileSrc() —
   * el WebView sirve el archivo real directo, es barato.
   *
   * Web: @capacitor/filesystem no persiste como archivo servible por HTTP
   * (usa IndexedDB por debajo) — hay que releer el contenido y construir un
   * data URI. Solo importa para desarrollo/pruebas en navegador; en el
   * dispositivo real se usa la rama nativa de arriba.
   */
  async resolverSrc(uri: string): Promise<string> {
    if (uri.startsWith('assets/') || uri.startsWith('http') || uri.startsWith('data:')) {
      return uri;
    }

    if (Capacitor.isNativePlatform()) {
      const { uri: uriNativo } = await Filesystem.getUri({ path: uri, directory: Directory.Data });
      return Capacitor.convertFileSrc(uriNativo);
    }

    const { data } = await Filesystem.readFile({ path: uri, directory: Directory.Data });
    return `data:image/jpeg;base64,${data}`;
  }

  // TODO (fase 1, junto con la pantalla de borrado de artículo/caja): borrar
  // el archivo físico correspondiente con Filesystem.deleteFile({ path: uri,
  // directory: Directory.Data }) — ahora que fotoUri es un path relativo, ya
  // no hace falta resolver nada antes de poder borrar.

  /**
   * El nombre de archivo local YA es `${fotoId}.jpeg` (ver capturarYGuardar)
   * — el fotoId de mudanza-back es literalmente ese mismo UUID, sin mapeo
   * aparte. Un asset bundleado (ej. la portada de caja por defecto) no tiene
   * fotoId: no es una foto real, nunca se sube.
   */
  private uriAFotoId(uri: string): string | null {
    return uri.match(RE_FOTO_ID)?.[1] ?? null;
  }

  /**
   * Sube la foto al backend si todavía no se subió (idempotente: se recuerda
   * localmente qué fotoIds ya se confirmaron subidos, para no releer+reenviar
   * el archivo entero en cada sync — ver ROADMAP-mudanza.md). Devuelve el
   * fotoId a guardar en el snapshot saliente, o null si `uri` es un asset
   * bundleado (nada que subir).
   */
  async subirSiHaceFalta(uri: string): Promise<string | null> {
    const fotoId = this.uriAFotoId(uri);
    if (!fotoId) return null;
    if (await this.yaSubida(fotoId)) return fotoId;

    const { data } = await Filesystem.readFile({ path: uri, directory: Directory.Data });
    const blob = base64ABlob(data as string, 'image/jpeg');
    const form = new FormData();
    form.append('foto', blob, `${fotoId}.jpeg`);

    await firstValueFrom(this.http.put(`${environment.apiBaseUrl}/fotos/${fotoId}`, form));
    await this.marcarSubida(fotoId);
    return fotoId;
  }

  /**
   * Baja y guarda localmente la foto de otro dispositivo si todavía no está
   * (Filesystem.stat es la fuente de verdad, no hace falta un registro
   * aparte de "ya bajadas"). Devuelve el nombre de archivo local relativo,
   * listo para guardar como fotoUri.
   */
  async descargarSiHaceFalta(fotoId: string): Promise<string> {
    const nombreArchivo = `${fotoId}.jpeg`;
    if (await this.existeLocal(nombreArchivo)) return nombreArchivo;

    const blob = await firstValueFrom(
      this.http.get(`${environment.apiBaseUrl}/fotos/${fotoId}`, { responseType: 'blob' }),
    );
    const base64 = await blobABase64(blob);
    await Filesystem.writeFile({ path: nombreArchivo, data: base64, directory: Directory.Data });
    return nombreArchivo;
  }

  private async existeLocal(nombreArchivo: string): Promise<boolean> {
    try {
      await Filesystem.stat({ path: nombreArchivo, directory: Directory.Data });
      return true;
    } catch {
      return false;
    }
  }

  private async yaSubida(fotoId: string): Promise<boolean> {
    const subidas = (await this.storageService.get<string[]>('fotos_subidas')) ?? [];
    return subidas.includes(fotoId);
  }

  private async marcarSubida(fotoId: string): Promise<void> {
    const subidas = (await this.storageService.get<string[]>('fotos_subidas')) ?? [];
    if (!subidas.includes(fotoId)) {
      await this.storageService.set('fotos_subidas', [...subidas, fotoId]);
    }
  }
}

function base64ABlob(base64: string, contentType: string): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
