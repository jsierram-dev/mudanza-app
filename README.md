# Mudanza — `mudanza-app`

**[English](#english)** &nbsp;|&nbsp; **[Español](#español)**

---

## English

Ionic + Angular app to organize your belongings during a house move: create "boxes," and every item you pack into one gets registered with a real photo. Search "which box has the laptop charger?" later, and see at a glance which boxes are heaviest or still empty.

### What is Mudanza

Create a **mudanza** (move), and inside it create **cajas** (boxes) — each with a destination room, a status (empty/packed/in transit/delivered/unpacked), and a cover photo. Every **artículo** (item) you register gets a real photo, an optional weight, frágil/esencial flags, and categories — and can be split across several boxes with a quantity in each, or left unassigned until you decide where it goes. Search across everything, see a box's total weight, and open a full preview of any item.

### What this repo does

- **Mudanzas** — list/create your moves.
- **Cajas** — grid per move, cover photo, room, status, running total weight.
- **Detalle de caja** — a box's contents, change its status/room/photo inline, delete the box (its items just become unassigned, not deleted).
- **Registrar artículo** — camera or gallery capture, then name/weight/frágil/esencial/categorías, assign to a box (with a quantity) or leave unassigned.
- **Pendientes** — items registered but not yet assigned to a box.
- **Buscador** — search everything, filter by frágil/esencial, see every box an item is split across.
- **Vista previa de artículo** — full detail of one item: photo, data, categories, where it is, delete it.
- **Cuenta** — optional Google sign-in and multi-device sync (see below).
- **Conflictos** — resolve a real conflict (same entity changed on two devices) one at a time, side by side, or bulk-resolve them all at once.

### Stack

![Angular, TypeScript](https://skillicons.dev/icons?i=angular,ts)

Ionic + Angular 20 (standalone components, signals), Capacitor (Camera/Filesystem — real native APIs if ever built native, verified working web fallbacks otherwise). **No backend required to use the app** — every screen reads/writes local storage on the device (`@ionic/storage-angular`) and photos live in the device's own filesystem, fully offline by design. A backend ([`../../jp-back/mudanza-back`](../../jp-back/mudanza-back)) exists purely as an *optional* add-on: sign in with Google and the same inventory shows up on another device too. Skip the sign-in and nothing changes.

### Multi-device sync (optional)

Sign in from **Cuenta** and the app syncs automatically on open (and on demand, with a "Sincronizar ahora" button) against `mudanza-back`. Deletes are tombstones under the hood, so they sync too, not just creates/edits — including their photo: deleting a box/item removes its photo from this device's storage, and the next sync tells `mudanza-back` to remove its own copy too (the photo id is computed straight from the local filename, never from whether the now-deleted file could still be read — otherwise a delete synced after the file was already gone would silently drop the id and the server copy would never get cleaned up). Real conflicts (the same entity changed on two devices since the last sync) are never silently overwritten in either direction — the conflict-count banner on Cuenta links to **Conflictos**, where you pick a side per entity (or bulk-resolve them all at once). Resolving only writes the choice locally; the next sync (automatic or manual) is what actually pushes it. Full design in [`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md#sincronización-multi-dispositivo-fase-4--diseño-cerrado-sin-construir).

### Testing

Every feature is verified end-to-end with [Playwright](https://playwright.dev/) against the real running dev server (and, for sync, the real `mudanza-back` + Neon) — real camera captures (Chromium's fake-device flag stands in for a physical camera when none is available), real IndexedDB storage, nothing mocked. Google's actual sign-in flow isn't realistically automatable, so sync tests inject a real JWT (signed with `jp-back-auth`'s own key) into storage the same way `AuthService` would, then drive everything downstream for real. Bugs this caught that code review alone wouldn't have: a missing `@ionic/pwa-elements` dependency that silently hung the camera in-browser, a screen that never rendered a photo it had actually saved correctly, Ionic's own page-caching inside `<ion-tabs>` serving stale data after leaving and returning to a tab, and (testing sync) several Ionic components living behind shadow DOM in ways that need a specific selector strategy (`ion-button:has-text(...)`, not the native `<button>` inside it, which doesn't inherit slotted text).

### How to run it

```
npm install
npm start                          # ng serve, port 4200
# or, to also reach it from your phone on the same WiFi:
npx ng serve --host 0.0.0.0
```

No backend needed to use the app locally. To also try sync, run [`../../jp-back/mudanza-back`](../../jp-back/mudanza-back) alongside it.

### Deployed

**Live at [jsierram-dev.github.io/mudanza-app](https://jsierram-dev.github.io/mudanza-app/)** — an installable PWA (`ng add @angular/pwa`, real "Cinta y Cartón" icons, no generic placeholders), hosted for free on GitHub Pages via `.github/workflows/deploy.yml` (builds with `--base-href /mudanza-app/`, deploys with `actions/deploy-pages`). Since this is a path-routed SPA, not hash-based, `404.html` is a copy of `index.html` — GitHub Pages has no idea about Angular's router, so without that trick a refresh or a direct link two levels deep (`/mudanza-app/moves/x/boxes`) would just 404 instead of letting the router take over client-side. Verified against the real deployed site, not just a local build: manifest and all 8 icon sizes resolve, in-app navigation survives the base href, and a deep link loaded directly still boots the app. The backend leg is live too — `mudanza-back` is deployed for real on Render (see [its README](../../jp-back/mudanza-back#deploying-it)), and `environment.prod.ts` already points at it. Full plan and every real problem hit along the way in [`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md#despliegue).

### Full planning doc

[`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md) — every decision made building this: the data model, the visual identity, and the real bugs found testing it.

---

## Español

App Ionic + Angular para organizar tus pertenencias durante una mudanza: creás "cajas", y cada artículo que metés en una queda registrado con una foto real. Buscás después "¿en qué caja está el cargador del portátil?", y ves de un vistazo qué cajas pesan más o cuáles siguen vacías.

### Qué es Mudanza

Creás una **mudanza**, y dentro creás **cajas** — cada una con habitación destino, estado (vacía/empacada/en tránsito/entregada/desempacada) y foto de portada. Cada **artículo** que registrás lleva una foto real, peso opcional, flags de frágil/esencial y categorías — y puede repartirse entre varias cajas con una cantidad en cada una, o quedar sin asignar hasta que decidas dónde va. Buscás en todo, ves el peso total de una caja, y abrís la vista previa completa de cualquier artículo.

### Qué hace este repo

- **Mudanzas** — lista/creación de tus mudanzas.
- **Cajas** — grid por mudanza, foto de portada, habitación, estado, peso total acumulado.
- **Detalle de caja** — contenido de una caja, cambiar estado/habitación/foto ahí mismo, borrar la caja (sus artículos quedan sin asignar, no se borran).
- **Registrar artículo** — captura con cámara o galería, después nombre/peso/frágil/esencial/categorías, asignar a una caja (con cantidad) o dejar sin asignar.
- **Pendientes** — artículos registrados que todavía no se asignaron a ninguna caja.
- **Buscador** — busca en todo, filtra por frágil/esencial, ve en qué cajas está repartido un artículo.
- **Vista previa de artículo** — detalle completo de un artículo: foto, datos, categorías, dónde está, borrarlo.
- **Cuenta** — login opcional con Google y sincronización entre dispositivos (ver abajo).
- **Conflictos** — resuelve un conflicto real (misma entidad cambiada en dos dispositivos) uno por uno, lado a lado, o todos de una con el atajo en bloque.

### Stack

![Angular, TypeScript](https://skillicons.dev/icons?i=angular,ts)

Ionic + Angular 20 (componentes standalone, signals), Capacitor (Camera/Filesystem — APIs nativas reales si algún día se compila nativo, con sus alternativas web ya verificadas funcionando mientras tanto). **Sin backend obligatorio para usar la app** — cada pantalla lee/escribe almacenamiento local del dispositivo (`@ionic/storage-angular`) y las fotos viven en el sistema de archivos del propio dispositivo, 100% offline por diseño. Existe un backend ([`../../jp-back/mudanza-back`](../../jp-back/mudanza-back)) como agregado *opcional*: iniciás sesión con Google y el mismo inventario aparece en otro dispositivo. Sin loguearte, no cambia nada.

### Sincronización entre dispositivos (opcional)

Iniciá sesión desde **Cuenta** y la app sincroniza sola al abrir (y a pedido, con el botón "Sincronizar ahora") contra `mudanza-back`. Los borrados son tombstones por debajo, así que también sincronizan, no solo las creaciones/ediciones — incluida su foto: borrar una caja/artículo borra su foto del almacenamiento de este dispositivo, y el próximo sync le avisa a `mudanza-back` que borre también su propia copia (el id de la foto se calcula directo del nombre de archivo local, nunca depende de si el archivo ya borrado se puede seguir leyendo — si no, un borrado sincronizado después de que el archivo ya no existe perdería el id en silencio y la copia del servidor nunca se limpiaría). Los conflictos reales (la misma entidad cambiada en dos dispositivos desde el último sync) nunca se pisan en silencio de ningún lado — el banner de conflictos en Cuenta lleva a **Conflictos**, donde elegís un lado por entidad (o resolvés todo de una). Resolver solo guarda la elección en local; el próximo sync (automático o manual) es el que efectivamente la sube. Diseño completo en [`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md#sincronización-multi-dispositivo-fase-4--diseño-cerrado-sin-construir).

### Pruebas

Cada funcionalidad se verifica de extremo a extremo con [Playwright](https://playwright.dev/) contra el dev server real corriendo (y, para la sincronización, contra el `mudanza-back` y el Neon reales) — capturas de cámara reales (la bandera de dispositivo falso de Chromium hace de cámara física cuando no hay una disponible), almacenamiento IndexedDB real, nada simulado. El login real de Google no es automatizable de forma confiable, así que las pruebas de sync inyectan un JWT real (firmado con la clave propia de `jp-back-auth`) en el storage, tal como lo guardaría `AuthService`, y de ahí en más prueban todo de verdad. Bugs que esto encontró y que una revisión de código sola no hubiera visto: faltaba la dependencia `@ionic/pwa-elements` y la cámara se colgaba en silencio en el navegador, una pantalla que nunca mostraba una foto que sí había guardado bien, el cacheo propio de páginas de Ionic dentro de `<ion-tabs>` sirviendo datos viejos al volver a una pestaña, y (probando la sincronización) varios componentes de Ionic viviendo detrás de shadow DOM de formas que piden una estrategia de selector específica (`ion-button:has-text(...)`, no el `<button>` nativo de adentro, que no hereda el texto proyectado por slot).

### Cómo arrancarlo

```
npm install
npm start                          # ng serve, puerto 4200
# o, para poder verla también desde el celular en la misma WiFi:
npx ng serve --host 0.0.0.0
```

No hace falta backend para usar la app en local. Para probar también la sincronización, corré [`../../jp-back/mudanza-back`](../../jp-back/mudanza-back) al lado.

### Desplegada

**Viva en [jsierram-dev.github.io/mudanza-app](https://jsierram-dev.github.io/mudanza-app/)** — PWA instalable (`ng add @angular/pwa`, con íconos reales de "Cinta y Cartón", no los genéricos), alojada gratis en GitHub Pages vía `.github/workflows/deploy.yml` (buildea con `--base-href /mudanza-app/`, despliega con `actions/deploy-pages`). Al ser una SPA con routing por path, no por hash, `404.html` es una copia de `index.html` — GitHub Pages no sabe nada del router de Angular, así que sin ese truco un refresh o un link directo dos niveles adentro (`/mudanza-app/moves/x/boxes`) daría 404 en vez de dejar que el router lo resuelva del lado del cliente. Verificado contra el sitio real ya desplegado, no solo un build local: manifest y los 8 tamaños de ícono resuelven, la navegación interna sobrevive al base href, y cargar un link profundo directo también arranca la app. La pata del backend también está en producción — `mudanza-back` está desplegado de verdad en Render (ver [su README](../../jp-back/mudanza-back#cómo-desplegarlo)), y `environment.prod.ts` ya apunta ahí. Plan completo y cada problema real encontrado en el camino en [`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md#despliegue).

### Documento de planificación completo

[`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md) — todas las decisiones tomadas construyendo esto: el modelo de datos, la identidad visual, y los bugs reales encontrados probándola.
