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
- **Detalle de caja** — a box's contents, change its status/room/photo inline.
- **Registrar artículo** — camera or gallery capture, then name/weight/frágil/esencial/categorías, assign to a box (with a quantity) or leave unassigned.
- **Pendientes** — items registered but not yet assigned to a box.
- **Buscador** — search everything, filter by frágil/esencial, see every box an item is split across.
- **Vista previa de artículo** — full detail of one item: photo, data, categories, where it is.

### Stack

![Angular, TypeScript](https://skillicons.dev/icons?i=angular,ts)

Ionic + Angular 20 (standalone components, signals), Capacitor (Camera/Filesystem — real native APIs if ever built native, verified working web fallbacks otherwise). **No backend, no database server, no third-party API** — every screen reads/writes local storage on the device (`@ionic/storage-angular`) and photos live in the device's own filesystem. This app works fully offline by design, not as an afterthought.

### Testing

Every feature is verified end-to-end with [Playwright](https://playwright.dev/) against the real running dev server — real camera captures (Chromium's fake-device flag stands in for a physical camera when none is available), real IndexedDB storage, nothing mocked. Bugs this caught that code review alone wouldn't have: a missing `@ionic/pwa-elements` dependency that silently hung the camera in-browser, a screen that never rendered a photo it had actually saved correctly, and Ionic's own page-caching inside `<ion-tabs>` serving stale data after leaving and returning to a tab.

### How to run it

```
npm install
npm start                          # ng serve, port 4200
# or, to also reach it from your phone on the same WiFi:
npx ng serve --host 0.0.0.0
```

No backend to start — this is the whole app.

### Deploying it (free)

Full plan in [`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md#despliegue) — short version: installable PWA, hosted for free on GitHub Pages, added to the home screen / installed straight from the browser on desktop and mobile (Android and iPhone both) — no app store, no native build.

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
- **Detalle de caja** — contenido de una caja, cambiar estado/habitación/foto ahí mismo.
- **Registrar artículo** — captura con cámara o galería, después nombre/peso/frágil/esencial/categorías, asignar a una caja (con cantidad) o dejar sin asignar.
- **Pendientes** — artículos registrados que todavía no se asignaron a ninguna caja.
- **Buscador** — busca en todo, filtra por frágil/esencial, ve en qué cajas está repartido un artículo.
- **Vista previa de artículo** — detalle completo de un artículo: foto, datos, categorías, dónde está.

### Stack

![Angular, TypeScript](https://skillicons.dev/icons?i=angular,ts)

Ionic + Angular 20 (componentes standalone, signals), Capacitor (Camera/Filesystem — APIs nativas reales si algún día se compila nativo, con sus alternativas web ya verificadas funcionando mientras tanto). **Sin backend, sin base de datos, sin API de terceros** — cada pantalla lee/escribe almacenamiento local del dispositivo (`@ionic/storage-angular`) y las fotos viven en el sistema de archivos del propio dispositivo. Esta app funciona 100% offline por diseño, no como un agregado tardío.

### Pruebas

Cada funcionalidad se verifica de extremo a extremo con [Playwright](https://playwright.dev/) contra el dev server real corriendo — capturas de cámara reales (la bandera de dispositivo falso de Chromium hace de cámara física cuando no hay una disponible), almacenamiento IndexedDB real, nada simulado. Bugs que esto encontró y que una revisión de código sola no hubiera visto: faltaba la dependencia `@ionic/pwa-elements` y la cámara se colgaba en silencio en el navegador, una pantalla que nunca mostraba una foto que sí había guardado bien, y el cacheo propio de páginas de Ionic dentro de `<ion-tabs>` sirviendo datos viejos al volver a una pestaña.

### Cómo arrancarlo

```
npm install
npm start                          # ng serve, puerto 4200
# o, para poder verla también desde el celular en la misma WiFi:
npx ng serve --host 0.0.0.0
```

No hay backend que levantar — esto es la app completa.

### Cómo desplegarla (gratis)

Plan completo en [`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md#despliegue) — resumen: PWA instalable, alojada gratis en GitHub Pages, se instala directo desde el navegador en PC y celular (Android e iPhone) — sin tienda de apps, sin compilar nativo.

### Documento de planificación completo

[`../../ROADMAP-mudanza.md`](../../ROADMAP-mudanza.md) — todas las decisiones tomadas construyendo esto: el modelo de datos, la identidad visual, y los bugs reales encontrados probándola.
