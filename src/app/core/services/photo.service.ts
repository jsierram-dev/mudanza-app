import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

const RE_PHOTO_ID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.[a-z0-9]+$/i;

@Injectable({ providedIn: 'root' })
export class PhotoService {
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
  async captureAndSave(): Promise<string> {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Foto del artículo',
      promptLabelPhoto: 'Elegir de la galería',
      promptLabelPicture: 'Tomar foto',
      quality: 70,
    });

    if (!photo.base64String) {
      throw new Error('La captura no devolvió datos de imagen.');
    }

    const fileName = `${crypto.randomUUID()}.jpeg`;
    await Filesystem.writeFile({
      path: fileName,
      data: photo.base64String,
      directory: Directory.Data,
    });

    return fileName;
  }

  /**
   * Resuelve un photoUri guardado (nombre de archivo relativo a Directory.Data,
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
  async resolveSrc(uri: string): Promise<string> {
    if (uri.startsWith('assets/') || uri.startsWith('http') || uri.startsWith('data:')) {
      return uri;
    }

    if (Capacitor.isNativePlatform()) {
      const { uri: nativeUri } = await Filesystem.getUri({ path: uri, directory: Directory.Data });
      return Capacitor.convertFileSrc(nativeUri);
    }

    const { data } = await Filesystem.readFile({ path: uri, directory: Directory.Data });
    return `data:image/jpeg;base64,${data}`;
  }

  // TODO (fase 1, junto con la pantalla de borrado de artículo/caja): borrar
  // el archivo físico correspondiente con Filesystem.deleteFile({ path: uri,
  // directory: Directory.Data }) — ahora que photoUri es un path relativo, ya
  // no hace falta resolver nada antes de poder borrar.

  /**
   * El nombre de archivo local YA es `${photoId}.jpeg` (ver captureAndSave)
   * — el photoId de mudanza-back es literalmente ese mismo UUID, sin mapeo
   * aparte. Un asset bundleado (ej. la portada de caja por defecto) no tiene
   * photoId: no es una foto real, nunca se sube.
   */
  private uriToPhotoId(uri: string): string | null {
    return uri.match(RE_PHOTO_ID)?.[1] ?? null;
  }

  /**
   * Sube la foto al backend si todavía no se subió (idempotente: se recuerda
   * localmente qué photoIds ya se confirmaron subidos, para no releer+reenviar
   * el archivo entero en cada sync — ver ROADMAP-mudanza.md). Devuelve el
   * photoId a guardar en el snapshot saliente, o null si `uri` es un asset
   * bundleado (nada que subir).
   */
  async uploadIfNeeded(uri: string): Promise<string | null> {
    const photoId = this.uriToPhotoId(uri);
    if (!photoId) return null;
    if (await this.wasUploaded(photoId)) return photoId;

    const { data } = await Filesystem.readFile({ path: uri, directory: Directory.Data });
    const blob = base64ToBlob(data as string, 'image/jpeg');
    const form = new FormData();
    form.append('photo', blob, `${photoId}.jpeg`);

    await firstValueFrom(this.http.put(`${environment.apiBaseUrl}/photos/${photoId}`, form));
    await this.markUploaded(photoId);
    return photoId;
  }

  /**
   * Baja y guarda localmente la foto de otro dispositivo si todavía no está
   * (Filesystem.stat es la fuente de verdad, no hace falta un registro
   * aparte de "ya bajadas"). Devuelve el nombre de archivo local relativo,
   * listo para guardar como photoUri.
   */
  async downloadIfNeeded(photoId: string): Promise<string> {
    const fileName = `${photoId}.jpeg`;
    if (await this.existsLocally(fileName)) return fileName;

    const blob = await firstValueFrom(
      this.http.get(`${environment.apiBaseUrl}/photos/${photoId}`, { responseType: 'blob' }),
    );
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Data });
    return fileName;
  }

  private async existsLocally(fileName: string): Promise<boolean> {
    try {
      await Filesystem.stat({ path: fileName, directory: Directory.Data });
      return true;
    } catch {
      return false;
    }
  }

  private async wasUploaded(photoId: string): Promise<boolean> {
    const uploaded = (await this.storageService.get<string[]>('uploaded_photos')) ?? [];
    return uploaded.includes(photoId);
  }

  private async markUploaded(photoId: string): Promise<void> {
    const uploaded = (await this.storageService.get<string[]>('uploaded_photos')) ?? [];
    if (!uploaded.includes(photoId)) {
      await this.storageService.set('uploaded_photos', [...uploaded, photoId]);
    }
  }
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
