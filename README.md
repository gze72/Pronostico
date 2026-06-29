# Consolidado estable Pronóstico 16°

Este paquete reúne los archivos confirmados como funcionales después de los fixes controlados.

## Archivos incluidos

```text
src/App.jsx
src/styles.css
src/lib/storage.js
src/lib/scoring.js
supabase/functions/sync-worldcup-results/index.ts
supabase/20260629_fix10_brazil_japan_final_score.sql
supabase/20260629_fix11_cleanup_remaining_phase32.sql
```

## Estado validado en Supabase

```text
R32-01 Sudáfrica vs Canadá = 0 - 1
R32-02 Brasil vs Japón     = 2 - 1
R32-03 Alemania vs Paraguay = sin resultado real
M73 = no existe
Dominic Ramirez R32-10 penaltyWinner = null
```

## Funcionalidad consolidada

- Pronóstico 16° usa IDs R32-01 a R32-16.
- No recalcula 16avos desde grupos.
- R32-11 se muestra como Ecuador vs México.
- R32-10 se muestra como Costa de Marfil vs Noruega.
- Administración muestra Pronóstico 16°.
- Administración permite actualizar resultados reales de Pronóstico 16°.
- `storage.js` carga `phase32Forecast` desde `phase32_forecasts`.
- Edge Function `sync-worldcup-results` queda alineada a la fase 16°.

## Importante

Los SQL fix10 y fix11 ya fueron ejecutados según validación. Se incluyen para trazabilidad/versionamiento.
