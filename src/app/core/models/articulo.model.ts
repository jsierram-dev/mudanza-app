/**
 * Deliberadamente SIN cajaId y SIN mudanzaId — ver ROADMAP-mudanza.md.
 * El artículo es un catálogo personal reusable entre mudanzas; su relación con
 * una caja (y por lo tanto con una mudanza) vive en AsignacionCaja, no acá.
 */
export interface Articulo {
  id: string;
  nombre: string;
  fotoUri: string;
  fechaRegistro: string;
  pesoKg?: number; // peso unitario, opcional
  fragil: boolean;
  esencial: boolean; // "abrir primero" — necesario apenas se llega
}
