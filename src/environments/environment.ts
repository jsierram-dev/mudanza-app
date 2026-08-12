// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // mudanza-back corriendo en local — ver jp-back/mudanza-back/README.md
  apiBaseUrl: 'http://localhost:4003',
  // Mismo Google OAuth Client de similart-app (ver similart-app/src/app/core/config.ts) —
  // jp-back-auth valida el idToken contra un único GOOGLE_CLIENT_ID, así que
  // se reusa el mismo a propósito en vez de crear uno nuevo (decidido 2026-08-12,
  // ver ROADMAP-mudanza.md). Requiere agregar el origen de esta app a
  // "Authorized JavaScript origins" del mismo OAuth Client en Google Cloud Console.
  googleClientId: '742581888095-uvrmgbol2d2q78eu6fnm7csk162usvfr.apps.googleusercontent.com',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
