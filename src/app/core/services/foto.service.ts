import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';

@Injectable({ providedIn: 'root' })
export class FotoService {
  /**
   * Abre la cámara, captura una foto y la guarda de forma permanente en el
   * almacenamiento del dispositivo (Directory.Data). Devuelve el URI final
   * para persistir en Articulo.fotoUri / Caja.fotoPortadaUri.
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
    const guardado = await Filesystem.writeFile({
      path: nombreArchivo,
      data: foto.base64String,
      directory: Directory.Data,
    });

    return guardado.uri;
  }

  // TODO (fase 1, junto con la pantalla de borrado de artículo/caja): eliminar
  // el archivo físico correspondiente. Filesystem.deleteFile necesita el path
  // relativo (no el uri completo devuelto arriba) para funcionar igual en web
  // y en nativo — falta resolver esa conversión antes de implementarlo.
}
