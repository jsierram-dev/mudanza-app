import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  cameraOutline,
  chevronDownOutline,
  closeOutline,
  cubeOutline,
  imageOutline,
  removeOutline,
  searchOutline,
  timeOutline,
} from 'ionicons/icons';

/**
 * Registro explícito de íconos usados en la app (llamar una sola vez desde
 * main.ts). Sin esto, <ion-icon name="..."> intenta resolver el SVG por red
 * la primera vez que se usa — rompe el requisito de app 100% offline-first
 * (ver ROADMAP-mudanza.md, sección Arquitectura).
 */
export function registerIcons(): void {
  addIcons({
    'add-outline': addOutline,
    'arrow-back-outline': arrowBackOutline,
    'camera-outline': cameraOutline,
    'chevron-down-outline': chevronDownOutline,
    'close-outline': closeOutline,
    'cube-outline': cubeOutline,
    'image-outline': imageOutline,
    'remove-outline': removeOutline,
    'search-outline': searchOutline,
    'time-outline': timeOutline,
  });
}
