/**
 * Formatea un peso en kg para mostrar en la UI, en gramos si es menos de 1kg
 * (ej. "350 g" en vez de "0.4 kg") — pedido explícito del usuario. Devuelve
 * '' cuando no hay nada que mostrar (0 = ningún artículo con peso cargado
 * todavía, el total no es realmente "cero", es desconocido).
 */
export function formatWeight(totalKg: number): string {
  if (totalKg <= 0) return '';
  if (totalKg < 1) return `${Math.round(totalKg * 1000)} g`;
  return `${totalKg.toFixed(1)} kg`;
}
