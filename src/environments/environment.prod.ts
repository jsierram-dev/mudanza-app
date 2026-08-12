export const environment = {
  production: true,
  // mudanza-back desplegado en Render (2026-08-12) — ver
  // jp-back/mudanza-back/README.md, sección "Deploying it". Plan free: se
  // duerme tras ~15 min sin uso, el primer request tras eso tarda unos
  // segundos en despertarlo (mismo trade-off ya aceptado para Neon).
  apiBaseUrl: 'https://mudanza-back.onrender.com',
  googleClientId: '742581888095-uvrmgbol2d2q78eu6fnm7csk162usvfr.apps.googleusercontent.com',
};
