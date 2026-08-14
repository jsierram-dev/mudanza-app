import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  arrowBackOutline,
  cameraOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  closeOutline,
  cubeOutline,
  ellipsisVerticalOutline,
  imageOutline,
  logOutOutline,
  personCircleOutline,
  removeOutline,
  searchOutline,
  syncOutline,
  timeOutline,
  trashOutline,
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
    'alert-circle-outline': alertCircleOutline,
    'arrow-back-outline': arrowBackOutline,
    'camera-outline': cameraOutline,
    'checkmark-circle-outline': checkmarkCircleOutline,
    'chevron-down-outline': chevronDownOutline,
    'close-outline': closeOutline,
    'cube-outline': cubeOutline,
    'ellipsis-vertical-outline': ellipsisVerticalOutline,
    'image-outline': imageOutline,
    'log-out-outline': logOutOutline,
    'person-circle-outline': personCircleOutline,
    'remove-outline': removeOutline,
    'search-outline': searchOutline,
    'sync-outline': syncOutline,
    'time-outline': timeOutline,
    'trash-outline': trashOutline,
  });
}
