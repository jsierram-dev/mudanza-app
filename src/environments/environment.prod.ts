export const environment = {
  production: true,
  // mudanza-back desplegado en Render (2026-08-12) — ver
  // jp-back/mudanza-back/README.md, sección "Deploying it". Plan free: se
  // duerme tras ~15 min sin uso, el primer request tras eso tarda unos
  // segundos en despertarlo (mismo trade-off ya aceptado para Neon).
  apiBaseUrl: 'https://mudanza-back.onrender.com',
  // jp-back-auth desplegado en Render (2026-08-13) — mismo plan free que
  // mudanza-back. Verificado end-to-end contra la producción real: un JWT
  // firmado acá pasa requireAuth en mudanza-back (mismo par de claves).
  authBaseUrl: 'https://jp-back-auth.onrender.com',
  googleClientId: '742581888095-uvrmgbol2d2q78eu6fnm7csk162usvfr.apps.googleusercontent.com',
};
