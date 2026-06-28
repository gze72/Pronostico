# Quiniela Mundial 2026 - App de pronósticos

App React + Supabase para registrar participantes, pronosticar marcadores por grupo, calcular posiciones, confirmar pronósticos, consultar reporte de participantes y revisar detalle como administrador.

## Ejecución rápida
```bash
npm install
npm run dev
```

## Base de datos Supabase
1. Crear proyecto Supabase.
2. Ejecutar `supabase/schema.sql` en SQL Editor.
3. Ejecutar `supabase/seed.sql` para cargar grupos/equipos/partidos.
4. Copiar `.env.example` a `.env` y completar URL + publishable key.

## Acceso demo
- Usuario normal: crear participante desde la pantalla inicial.
- Administrador demo local: nombre `admin`, clave `ADMIN2026!`.

## Notas funcionales
- El botón **Confirmar pronóstico** se habilita solo cuando los 12 grupos tienen todos sus partidos pronosticados.
- Cada grupo cambia visualmente a estado completado cuando todos sus partidos tienen marcador.
- Reportes: usuario normal ve solo su pronóstico; admin ve todos los participantes y puede consultar el detalle.
- La llave eliminatoria está parametrizada en `src/lib/worldcupData.js` para ajustar cualquier cambio oficial de FIFA sin rediseñar la app.


## Actualización visual Zambranada

Esta versión incluye un paquete de Look & Feel premium:

- Marca de agua `Zambranada` integrada al fondo y al menú lateral.
- Mantiene la copa/balón como elemento visual sutil.
- Tarjetas, botones, tablas y navegación con estilo glassmorphism minimalista.
- Login más elegante y transiciones suaves.
- Diseño responsive para móvil, tablet y escritorio.


## Paquete consolidado Zambranada

Esta versión integra simultáneamente:

- Look & Feel premium con marca de agua Zambranada.
- Login sin mostrar credenciales ni claves de administrador.
- Persistencia de borradores en Supabase.
- Eliminación de usuario y pronósticos desde administración.


## Popup de premio

Al confirmar el pronóstico completo, la aplicación muestra un popup informativo indicando que el participante entra al sorteo por $30,00 si acierta el 80% de clasificados a la segunda fase.


## Corrección llave proyectada

La llave de dieciseisavos/Round of 32 ahora se genera con 32 clasificados únicos:

- 1.º y 2.º de cada uno de los 12 grupos.
- 8 mejores terceros de todos los grupos.
- Evita repetir países en los cruces proyectados.


## Score real y puntos FASE 1

Esta versión agrega:

- Título `Registro de pronóstico (FASE 1)`.
- Bloqueo de edición cuando el participante confirma su pronóstico.
- Columna `Score real` para visualizar resultados reales.
- Validación doble por partido:
  - 1 punto si acierta el ganador/empate.
  - 1 punto si acierta el marcador exacto.
- Puntaje acumulado visible en el menú lateral.
- Puntaje por participante visible en administración.
- Tablas Supabase:
  - `match_results`
  - `participant_scores`

Nota técnica: la app queda lista para alimentar `match_results` desde una función backend/Edge Function conectada a una fuente oficial. Mientras se configure esa integración, el administrador puede registrar el score real desde el panel de administración.


## Sincronización automática de resultados

La aplicación llama a la Supabase Edge Function `sync-worldcup-results` cada vez que se carga la APP.

Flujo:

1. La APP invoca `sync-worldcup-results`.
2. La función consulta `RESULTS_PUBLIC_JSON_URL`, si está configurada.
3. Actualiza `match_results`.
4. Ejecuta `recalculate_phase1_scores()`.
5. La APP vuelve a leer `match_results` y muestra `Score real`, check de ganador, check de marcador exacto y puntos.

Formato esperado para `RESULTS_PUBLIC_JSON_URL`:

```json
[
  { "match_id": "A1", "home_goals": 2, "away_goals": 0, "status": "finished" },
  { "match_id": "A2", "home_goals": 2, "away_goals": 1, "status": "finished" }
]
```

También acepta:

```json
{
  "results": [
    { "matchId": "A1", "homeGoals": 2, "awayGoals": 0, "status": "finished" }
  ]
}
```

Nota: FIFA no publica un endpoint público estable y documentado para consumo frontend. Por eso la integración se hace por backend/Edge Function, que puede apuntar a una fuente pública, API oficial/licenciada o feed JSON propio.


## Adaptador WC2026 API

La Edge Function `sync-worldcup-results` soporta dos fuentes:

1. `RESULTS_PUBLIC_JSON_URL`
2. `WC2026_API_KEY`

Si se configura `WC2026_API_KEY`, la función consulta:

```bash
https://api.wc2026api.com/matches
Authorization: Bearer <WC2026_API_KEY>
```

La función usa `match_number` para mapear el partido externo al identificador interno de la app (`A1`, `A2`, `F1`, etc.). Por ejemplo:

- `match_number: 11` se mapea a `F1`, que en la app corresponde a Países Bajos vs Japón.

Para actualizar el secreto en Supabase:

```bash
supabase secrets set WC2026_API_KEY=tu_api_key_real --project-ref faxdcmdnnsxsvfisrygx
```

No colocar la API key en `.env` de Vercel ni en el frontend.


## Score real solo administrador

La actualización restringe el registro manual del Score real:

- Los usuarios normales solo pueden consultar `Score real`, checks y puntaje.
- El panel de carga manual de resultados solo aparece en Administración.
- La escritura directa a `match_results` desde cliente anónimo queda bloqueada por RLS.
- El guardado manual se realiza mediante la Edge Function `admin-save-real-score`.
- `admin-save-real-score` valida que el participante tenga `role = 'admin'` antes de actualizar resultados.
- Después de guardar un resultado, se ejecuta `recalculate_phase1_scores()` automáticamente.


## Corrección guardado Score real ADMIN

Se corrigió el guardado del Score real para que ya no intente escribir directamente en `match_results` desde el cliente. Ahora:

- El frontend llama a la Edge Function `admin-save-real-score`.
- La función valida que el participante tenga `role = 'admin'`.
- La función guarda el resultado usando service role.
- Luego ejecuta `recalculate_phase1_scores()`.
- En móvil, el panel de administración se reordena verticalmente para mostrar lista, detalle y carga de score real.


## Corrección visual de puntos en Administración

La lista de `Participantes registrados` ahora calcula los puntos en tiempo real usando:

- Pronóstico del participante.
- Resultados reales cargados en `match_results`.

Esto evita diferencias visuales entre la lista y el detalle cuando `participant_scores` todavía no se ha actualizado o tiene datos persistidos previos.


## Puntaje acertado vs puntaje posible

El puntaje ahora se muestra como proporción:

```text
10 / 14 pts
```

Donde:

- `10` = puntos acertados por el participante.
- `14` = puntos posibles según partidos con Score real cargado.
- Cada partido evaluado vale máximo 2 puntos:
  - 1 punto por ganador/empate acertado.
  - 1 punto por marcador exacto.

Ejemplo: si hay 7 partidos jugados/evaluados, el máximo posible es `7 × 2 = 14`.


## Paquete consolidado desde versión puntaje 10/14

Este paquete parte de la última versión operativa `actualización puntaje 10/14` e integra, en una sola base, las tres funcionalidades posteriores:

1. Controles administrativos de fase:
   - Inhabilitar/habilitar registro de nuevos usuarios.
   - Bloquear todos los pronósticos como `CONFIRMADOS`.
   - Habilitar nuevamente los pronósticos para edición.
   - Edge Function `admin-phase-control`.
   - Tablas `app_settings` y `admin_actions`.

2. Clasificación real por grupo:
   - Tarjeta `Real · Orden de Clasificación`.
   - Calculada con `match_results`.
   - Muestra avance, por ejemplo `2/6 partidos reales`.

3. Close Sidebar:
   - Botón `Cerrar` dentro del sidebar.
   - Botón flotante `Menú`.
   - Comportamiento responsive en web y móvil.

Este paquete corrige el problema de imports duplicados donde `getAppSettings` y `adminPhaseControl` aparecían por error dentro de `lucide-react`.


## Corrección tablas admin y orden participantes

Se corrigió el módulo Administrador:

- Las tablas de detalle por grupo ahora permiten ver correctamente columnas como `DG` y `GF`.
- Se evita el corte visual de columnas en tarjetas pequeñas.
- Se agregó orden para `Participantes registrados`:
  - Puntos: mayor a menor.
  - Puntos: menor a mayor.
  - Nombre: A-Z.
  - Nombre: Z-A.


## Fix menú móvil visible

Se corrigió la visualización del menú en celular:

- En móvil inicia cerrado.
- El botón flotante de menú queda visible arriba a la izquierda.
- Al tocar el botón, se abre el sidebar.
- Al tocar fuera del sidebar o seleccionar una opción, se cierra.
- En escritorio el sidebar permanece visible.


## Compartir ranking desde administración

Se agregó la función `Compartir ranking` en el módulo Administrador.

Características:

- Genera un texto con los participantes ordenados por mayor puntaje.
- Muestra formato `puntos obtenidos / puntos posibles`, por ejemplo `11 / 22 pts`.
- Incluye fecha y hora de actualización.
- En celular usa `navigator.share`, abriendo el menú nativo para compartir por WhatsApp, Telegram, correo u otras apps.
- En web, si no está disponible el menú nativo de compartir, copia el ranking al portapapeles.


## Mejora presentación ranking compartido

Se ajustó el ranking para compartir por WhatsApp u otras apps:

- El encabezado mantiene el puntaje máximo al momento.
- En cada participante ya no se repite `/32 pts`.
- Cada participante muestra `puntos + porcentaje`, por ejemplo `26 pts · 81%`.
- El menú lateral muestra el porcentaje de aciertos junto al puntaje del usuario.
- La lista de administración muestra también puntos y porcentaje.


## Reporte compartido profesional

Se rediseñó el ranking compartido para WhatsApp y otras apps:

- Encabezado sobrio y jerarquizado.
- Resumen del estado actual:
  - Partidos evaluados.
  - Puntaje máximo.
  - Participantes.
  - Confirmados.
  - Líder actual.
- Ranking compacto por participante:
  - Posición.
  - Nombre.
  - Puntos.
  - Porcentaje de efectividad.
  - Estado mediante símbolo.
- Vista previa antes de compartir.
- Botón para copiar texto y botón para compartir usando el menú nativo del celular.


## Ajuste reporte sin ruido visual

Se ajustó el reporte compartido:

- Se elimina la palabra `efectividad` del detalle de cada participante.
- Cada participante se muestra como `26 pts · 81% ●`.
- Se agrega un resumen editorial de la jornada en el encabezado.
- Para la jornada del 15/jun/2026 se incluyen las claves:
  - Empates en Grupos G y H.
  - España frenada por Cabo Verde.
  - Bélgica rescatando empate ante Egipto con impacto de Lukaku.
  - Arabia Saudita sosteniendo el empate ante Uruguay.
  - Irán y Nueva Zelanda cerrando con 2-2.


## Resumen editorial en línea

El botón `Compartir ranking` ahora actualiza el resumen editorial cada vez que se presiona.

Flujo:

1. El administrador presiona `Compartir ranking`.
2. La APP invoca la Edge Function `daily-editorial-summary`.
3. La función consulta, según configuración:
   - `EDITORIAL_NEWS_ENDPOINT`, si existe.
   - `NEWSAPI_KEY`, si existe.
   - resultados cargados en `match_results`, como respaldo.
4. La respuesta se incorpora al encabezado del ranking.
5. El administrador revisa la vista previa y comparte.

Variables opcionales en Supabase Edge Function Secrets:

- `NEWSAPI_KEY`: API key de NewsAPI.org.
- `EDITORIAL_NEWS_ENDPOINT`: endpoint propio que devuelva `{ "bullets": ["...", "..."] }` o `{ "summary_text": "..." }`.

Si no configuras una fuente externa, el resumen se genera con los resultados reales cargados en `match_results`, pero no incluirá comentarios de medios deportivos externos.

## Mejora multibúsqueda NewsAPI

La Edge Function `daily-editorial-summary` ahora busca noticias en varios niveles:

1. Consulta específica por partidos/equipos de la jornada.
2. `FIFA World Cup 2026` con fecha.
3. `Copa Mundial 2026` con fecha.
4. `FIFA World Cup 2026` general.
5. `Copa Mundial 2026` general.
6. `Mundial 2026` general.

El body de prueba acepta:

```json
{
  "date": "2026-06-15",
  "debug": true,
  "daysBack": 7,
  "query": "FIFA World Cup 2026"
}
```

- `daysBack`: amplía el rango de búsqueda hacia atrás.
- `query`: permite probar una búsqueda personalizada.
- `debug`: devuelve diagnóstico de intentos, idioma, status HTTP y artículos encontrados.


## Editorial genérico cuando no hay noticias externas

Se eliminó el fallback editorial específico o “quemado”.

Cuando NewsAPI o el endpoint externo no devuelvan noticias, el reporte compartido mostrará un comentario genérico:

- No se encontraron noticias deportivas externas disponibles.
- El ranking se genera con los marcadores reales cargados por administración.
- El resumen se actualizará automáticamente cuando la fuente externa entregue información.

Esto evita confundir al lector con comentarios que parezcan noticias reales cuando la fuente externa no entregó contenido.


## Fix llamada editorial desde la APP

Se corrigió el botón `Compartir ranking` para que:

- No use texto editorial quemado en el frontend.
- Llame a `daily-editorial-summary` cada vez que se presiona.
- Envíe búsqueda ampliada:
  - `daysBack: 30`
  - `query: FIFA World Cup 2026 OR Copa Mundial 2026 OR Mundial 2026`
- Use noticias externas si la Edge Function devuelve `source = newsapi...`.
- Use comentario genérico si no hay noticias externas disponibles.


## Fix parse error storage editorial

Se corrigió un error de sintaxis en `src/lib/storage.js` causado por strings multilínea con comillas simples.

La función `getDailyEditorialSummary` ahora usa template string para el resumen genérico:

```js
const genericSummary = `Claves de la jornada:
• ...`;
```

Esto evita el error:

```text
[PARSE_ERROR] Unterminated string
```


## Sync FIFA seguro por grupo/equipos

Se corrigió `sync-worldcup-results` para evitar actualizaciones incorrectas.

Reglas nuevas:

- Ya no se actualiza por orden del partido dentro del grupo.
- Solo se actualiza por coincidencia exacta:
  `Grupo + Equipo local + Equipo visitante`.
- Si no existe mapeo seguro, el partido se omite.
- Los partidos en curso se informan como `live`, pero no alteran puntajes.
- Los puntajes solo se recalculan con partidos finales.

Ejemplo de respuesta para partido en curso:

```json
{
  "liveNotice": "Existen partidos en curso. Los marcadores parciales no se usan para puntajes hasta que FIFA publique el resultado final.",
  "liveMatchesInfo": [
    {
      "message": "Partido en curso: Brasil 1-1 Marruecos. Marcador parcial, puede cambiar."
    }
  ]
}
```

Body de prueba recomendado:

```json
{
  "adminParticipantId": "ID_DEL_ADMIN",
  "debug": true
}
```

Para guardar marcadores en vivo en `match_results` como `status = live`, usar:

```json
{
  "adminParticipantId": "ID_DEL_ADMIN",
  "debug": true,
  "saveLive": true
}
```

Por defecto `saveLive` es `false` para no alterar puntajes.


## Prioridad ADMIN sobre FIFA

Se agregó una regla de protección para `sync-worldcup-results`:

- Si `match_results` ya tiene `home_goals` y `away_goals`, el servicio automático NO lo sobrescribe.
- Si el resultado fue cargado por ADMIN o fuente manual, se respeta como fuente prioritaria.
- FIFA solo actualiza partidos cuyo marcador esté vacío o no exista.
- Los partidos en curso tampoco sobrescriben marcadores existentes.

Esto evita que una sincronización automática modifique resultados ya validados por administración.

Respuesta esperada:

```json
{
  "updated": 2,
  "protected": 15,
  "protectedNotice": "Existen marcadores ya cargados. Se respetan y no se sobrescriben automáticamente."
}
```


## Fix no-2xx sync FIFA

Se corrigió `sync-worldcup-results` para evitar que el panel muestre:

```text
Edge Function returned a non-2xx status code
```

Cambios:

- Si el frontend no envía `adminParticipantId`, la función ya no devuelve HTTP 500.
- Si ocurre un error controlado, devuelve HTTP 200 con `ok:false` y `handled:true`.
- Si se envía `adminParticipantId`, se sigue validando que sea rol `admin`.
- Se mantiene la protección: FIFA no sobrescribe resultados ya cargados o manuales del ADMIN.

Body válido con admin:

```json
{
  "adminParticipantId": "ID_DEL_ADMIN",
  "debug": true
}
```

Body compatible si el frontend no envía admin:

```json
{
  "debug": true
}
```


## Limpiar scores automáticos de partidos futuros

Se corrigió `sync-worldcup-results` para evitar que aparezcan scores en partidos que aún no se juegan o no han finalizado.

Reglas:

- Resultado manual/ADMIN: se protege y no se modifica.
- Resultado automático FIFA anterior: puede corregirse si FIFA ya publicó resultado final.
- Resultado automático en partido futuro/no finalizado: se limpia y queda `home_goals = null`, `away_goals = null`.
- Partido en curso: se informa como marcador parcial, pero no altera puntajes.
- Puntajes se recalculan cuando se actualizan/corrigen/limpian resultados automáticos.

Respuesta esperada:

```json
{
  "clearedFutureAuto": 1,
  "futureNotice": "Se eliminaron marcadores automáticos de partidos futuros o no finalizados."
}
```


## Fix códigos internos FIFA 3 letras

Se corrigió `sync-worldcup-results` porque la APP usa códigos FIFA de 3 letras en `worldcupData.js`.

Ejemplos:

```text
TUR, USA, PAR, AUS
```

Antes se estaba convirtiendo a códigos de 2 letras y eso provocaba cruces incorrectos en partidos como:

```text
D5 Turquía vs Estados Unidos
D6 Paraguay vs Australia
```

Reglas nuevas:

- El mapeo seguro usa códigos internos de 3 letras.
- `D|TUR|USA => D5`
- `D|PAR|AUS => D6`
- Se limpian automáticamente los scores FIFA erróneos previos de D5/D6 si no fueron manual/admin.
- Los resultados ADMIN/manual siguen protegidos.

Body recomendado:

```json
{
  "adminParticipantId": "ID_DEL_ADMIN",
  "debug": true
}
```


## Mejora visual ranking premium

Se agregó un diseño profesional/minimalista para el ranking:

- Tarjeta compacta `Ranking actual` en el menú lateral.
- Top 5 con puntos y porcentaje.
- Acentos discretos para podio.
- Botón `Ver ranking completo`.
- Vista completa en `Reporte` con métricas superiores y tabla premium.

Archivos modificados:

```text
src/App.jsx
src/styles.css
README.md
docs/ranking-premium-mockup.png
```


## Fix restauración APP móvil segura

Este paquete corrige el bloqueo del navegador introducido por el fix móvil anterior.

Cambios:

- Se restaura `src/App.jsx` desde la versión ranking premium que funcionaba en web.
- Se elimina cualquier lógica JS invasiva asociada a apertura/cierre de menú móvil.
- Se conserva el diseño premium del ranking.
- Se agregan únicamente ajustes CSS seguros para que el ranking se adapte mejor a móvil.

Archivos a reemplazar:

```text
src/App.jsx
src/styles.css
README.md
docs/ranking-premium-mockup.png
```


## Reportes en pestañas y menú móvil seguro

Se ajustó el módulo `Reporte` para separar sus dos funcionalidades principales:

- `Ranking de participantes`.
- `Consulta de pronóstico` / `Mi pronóstico`.

También se corrigió el comportamiento móvil del menú:

- Tocar/arrastrar dentro del menú ya no dispara el cierre accidental.
- El menú se cierra únicamente con el botón `Cerrar` o al seleccionar una opción de navegación.
- En móvil las pestañas se presentan como control horizontal tipo segmented tabs, siguiendo patrones actuales de apps/PWA.

Archivos modificados:

```text
src/App.jsx
src/styles.css
README.md
docs/ranking-premium-mockup.png
```


## Pronóstico 16°

Se agregó la segunda fase de la quiniela: `Pronóstico 16°`.

Cambios principales:

- La sección `Pronóstico` de FASE 1 queda inhabilitada en el menú.
- Se agrega nueva sección `Pronóstico 16°`.
- Se presentan los 16 enfrentamientos de dieciseisavos usando la llave oficial definida en `ROUND_OF_32_TEMPLATE` y la clasificación real calculada desde los resultados cargados.
- Cada participante puede pronosticar:
  - Goles del equipo local.
  - Goles del equipo visitante.
  - Ganador por penales cuando el marcador pronosticado es empate.
- Puntaje de Pronóstico 16°:
  - 1 punto por acertar ganador.
  - 1 punto por acertar resultado exacto.
  - 1 punto bonus si llega a penales y acierta ganador por penales.
- Se muestra resultado REAL por partido con marcador y ganador por penales cuando aplique.
- Fecha límite visible en cabecera: hasta las 16:00 del 28/jun/2026.
- Después del cierre, se bloquea automáticamente salvo que ADMIN habilite nuevamente.
- ADMIN puede habilitar/bloquear Pronóstico 16° desde Controles de fase.
- ADMIN puede cargar resultados reales de Pronóstico 16° desde la misma sección.

### Migración requerida

Ejecutar en Supabase SQL Editor:

```text
supabase/20260628_phase32_round_of_32.sql
```

### Archivos modificados

```text
src/App.jsx
src/styles.css
src/lib/scoring.js
src/lib/storage.js
supabase/20260628_phase32_round_of_32.sql
supabase/functions/admin-phase-control/index.ts
README.md
```


## Corrección Pronóstico 16° - fixtures reales

Se reemplazaron los cruces calculados por los 16 enfrentamientos directos definidos para la segunda fase:

1. Sudáfrica vs Canadá — 28/jun/2026 16:00 — Los Ángeles Stadium
2. Brasil vs Japón — 29/jun/2026 14:00 — Houston Stadium
3. Alemania vs Paraguay — 29/jun/2026 17:30 — Boston Stadium
4. Países Bajos vs Marruecos — 29/jun/2026 22:00 — Estadio Monterrey
5. Costa de Marfil vs Noruega — 30/jun/2026 14:00 — Dallas Stadium
6. Francia vs Suecia — 30/jun/2026 18:00 — New York New Jersey Stadium
7. México vs Ecuador — 30/jun/2026 22:00 — Estadio Ciudad de México
8. Inglaterra vs RD Congo — 01/jul/2026 13:00 — Atlanta Stadium
9. Bélgica vs Senegal — 01/jul/2026 17:00 — Seattle Stadium
10. Estados Unidos vs Bosnia — 01/jul/2026 21:00 — San Francisco Bay Area Stadium
11. España vs Austria — 02/jul/2026 16:00 — Los Ángeles Stadium
12. Portugal vs Croacia — 02/jul/2026 20:00 — Toronto Stadium
13. Suiza vs Argelia — 03/jul/2026 17:00 — BC Place Vancouver
14. Australia vs Egipto — 03/jul/2026 15:00 — Dallas Stadium
15. Argentina vs Cabo Verde — 03/jul/2026 19:00 — Miami Stadium
16. Colombia vs Ghana — 03/jul/2026 22:30 — Kansas City Stadium

Cambios principales:

- El indicador superior cambia de `12/12 grupos` a `16/16 enfrentamientos` cuando se está en Pronóstico 16°.
- La fase 16° ya no usa grupos ni cruces calculados por ranking de fase 1.
- Se muestran fecha, hora y estadio en cada tarjeta de partido.
- La migración limpia resultados/pronósticos previos de Pronóstico 16° generados con cruces incorrectos.

Archivos modificados:

```text
src/App.jsx
src/styles.css
src/lib/worldcupData.js
src/lib/scoring.js
supabase/20260628_phase32_round_of_32.sql
README.md
```


## Ranking FASE 2 y respaldo FASE 1

Esta versión separa los puntajes por fase:

### FASE 1
- Queda respaldada como histórico.
- No se mezcla con Pronóstico 16°.
- Se conserva para el futuro acumulado general.

### FASE 2 / Pronóstico 16°
- El ranking principal se calcula con los 16 enfrentamientos directos.
- Puntaje:
  - 1 punto por ganador.
  - 1 punto por score exacto.
  - 1 punto bonus si hubo penales y acierta ganador de penales.
- El Reporte muestra por defecto el ranking FASE 2.
- El Admin muestra puntaje FASE 2 y detalle por participante.
- El Admin también conserva visible el histórico FASE 1.

### Base de datos
Ejecutar nuevamente:

```text
supabase/20260628_phase32_round_of_32.sql
```

La migración agrega la vista:

```text
public.phase32_participant_scores_view
```

y registra los settings:

```text
active_report_phase = phase32
phase1_backup_status = closed_preserved_for_general_total
phase32_ranking_enabled = true
```


## Fix login ranking FASE 2

Se corrigió un error de ejecución que impedía ingresar a la APP después del login.

Causa corregida:

```text
ReferenceError: statusInfo is not defined
```

Corrección aplicada:

```text
statusInfo: premiumStatus({ forecast: r.phase32Forecast })
```

También se ajustó la tarjeta lateral para mostrar correctamente el máximo de puntos FASE 2:

```text
16 enfrentamientos x 3 pts = 48 pts
```


## Recuperación pantalla en blanco

Este paquete revierte la parte invasiva del ajuste anterior de Administración que podía producir pantalla en blanco después del login.

Se mantiene:

- Pronóstico 16°.
- Ranking FASE 2.
- Histórico FASE 1 respaldado.
- FASE 1 marcada como archivada.
- Administración orientada a FASE 2.

Se evita:

- Inyección de bloques JSX con variables fuera de alcance.
- Cambios de lógica en el render principal.
- Errores runtime después del login.

Archivos modificados:

```text
src/App.jsx
src/styles.css
README.md
```


## Fix ganador pronosticado y Admin FASE 2

Correcciones incluidas:

- En `Pronóstico 16°` se resalta visualmente el ganador pronosticado aunque el partido no sea empate.
- Si el pronóstico es empate, se mantiene el resaltado del ganador por penales.
- En Administración se corrige la lectura de pronósticos FASE 2 por participante.
- `listParticipantsWithForecasts()` ya no depende de relaciones embebidas de Supabase para `phase32_forecasts`; ahora consulta y cruza los datos por `participant_id`.
- Esto permite que los pronósticos confirmados de ADMIN, Gregory y demás usuarios aparezcan correctamente en el detalle administrativo.

Archivos modificados:

```text
src/App.jsx
src/styles.css
src/lib/storage.js
README.md
```


## Regla de puntaje con penales FASE 2

Se actualizó la lógica de `evaluatePhase32Prediction`.

Regla vigente:

```text
Partido definido en tiempo regular:
- 1 punto por acertar ganador.
- 1 punto por acertar resultado exacto.

Partido empatado y definido por penales:
- 1 punto si el usuario pronosticó empate.
- 1 punto por resultado exacto si acertó el marcador empatado.
- 1 punto bonus si además acertó el ganador por penales.
```

También se actualizó el texto explicativo en la cabecera de Pronóstico 16° y se eliminó el comentario:

```text
Esta fase ya no usa grupos: son 16 cruces directos.
```


## Regla definitiva FASE 2: ganador directo 2 puntos

Se actualizó la lógica de puntaje para garantizar el máximo de 48 puntos:

```text
16 enfrentamientos x 3 puntos = 48 puntos
```

### Partido con ganador directo

```text
+2 puntos por acertar ganador directo
+1 punto por acertar resultado exacto
= máximo 3 puntos
```

### Partido empatado y definido por penales

```text
+1 punto por pronosticar empate
+1 punto por acertar resultado exacto
+1 punto bonus por acertar ganador en penales
= máximo 3 puntos
```

### Archivos modificados

```text
src/lib/scoring.js
src/App.jsx
src/styles.css
README.md
```


## Texto claro de puntaje FASE 2

Se simplificó la explicación visible en Pronóstico 16°:

```text
Puntaje máximo por partido: 3 puntos.

Resultado exacto:
1 punto por acertar el marcador en los 90 minutos.

Ganador directo:
2 puntos por acertar el ganador directo.

Empate y penales:
1 punto por pronosticar empate + 1 punto por acertar el ganador por penales.
```

La lógica de cálculo no cambia respecto a la versión anterior:
- ganador directo vale 2 puntos;
- resultado exacto vale 1 punto;
- empate/penales suma 1 punto por empate y 1 punto por ganador en penales.


## Recuperación segura: login + cierre 14:00 + penalizaciones SQL

Este paquete restaura una base estable para evitar pantalla blanca.

Incluye:
- Ajuste visual de cierre a 14:00 Ecuador.
- SQL de penalización R32-01.
- No introduce cambios invasivos en el render del login.

Ejecutar en Supabase SQL Editor:

```text
supabase/20260628_phase32_strict_lock_1400_penalties.sql
```

Luego validar login antes de aplicar cualquier ajuste adicional de ranking con penalizaciones.


## Penalizaciones visibles en Ranking FASE 2

La APP ahora lee `phase32_match_penalties` y aplica 0 puntos al partido penalizado.

Efecto:
- Ranking FASE 2 usa penalizaciones.
- Reporte usa ranking recalculado.
- Pronóstico 16° muestra alerta en la tarjeta penalizada del usuario.
- Administración usa los puntajes recalculados por participante.

No requiere ejecutar SQL nuevamente si `phase32_match_penalties` ya existe.
