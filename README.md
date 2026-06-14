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
