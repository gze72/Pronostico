# Fix 28 - Refrescar resultados reales de Pronóstico 8° después de sincronizar

## Problema

La Edge Function ya sincroniza y Supabase ya tiene resultados en `phase16_results`, pero en Administración la pantalla seguía mostrando:

```text
Resultado REAL: — : —
```

después de presionar `Recalcular puntajes`.

## Causa

La función `syncNow()` refrescaba resultados de FASE 1 y ranking, pero no recargaba:

```text
getPhase16Results()
setPhase16RealScores(...)
```

## Corrección

Después de sincronizar, ahora refresca también:

```text
phase32_results
phase16_results
```

## Archivo modificado

```text
src/App.jsx
```

## No toca

```text
Supabase
SQL
Edge Functions
storage.js
scoring.js
styles.css
```
