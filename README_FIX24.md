# Fix 24 - RLS para phase16_forecasts

## Problema

Al guardar o confirmar Pronóstico 8°, Supabase muestra:

```text
new row violates row-level security policy for table "phase16_forecasts"
```

## Causa

La tabla `phase16_forecasts` fue creada con RLS activo o quedó protegida, pero no tenía políticas de escritura equivalentes a `phase32_forecasts`.

## Solución

Agregar políticas RLS para:

```text
phase16_forecasts_public_read
phase16_forecasts_public_write
```

## Archivo a ejecutar en Supabase

```text
20260704_fix24_phase16_forecasts_rls.sql
```

## No toca

```text
Datos existentes
Frontend
scoring.js
storage.js
Edge Functions
```
