import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

@Injectable({ providedIn: 'root' })
export class FotoService {
  /**
   * Abre la cámara, captura una foto y la guarda de forma permanente en el
   * almacenamiento del dispositivo (Directory.Data). Devuelve solo el nombre
   * de archivo relativo (no un URI completo) — alcanza para reconstruir
   * cualquier operación futura (leer, mostrar, borrar) contra Directory.Data,
   * y evita arrastrar un URI con forma distinta en cada plataforma.
   *
   * Calidad reducida a propósito (70) — ver ROADMAP-mudanza.md, "no comerse
   * el almacenamiento del teléfono con fotos a resolución completa".
   */
  async capturarYGuardar(): Promise<string> {
    const foto = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
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
}
