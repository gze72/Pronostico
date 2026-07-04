# Fix 25 - Llaves independientes para Pronóstico 8°

## Problema

`Pronóstico 8°` estaba leyendo la llave:

```text
phase16_predictions_unlocked
```

Eso es incorrecto para la lógica de la app, porque `phase16_*` corresponde a la fase histórica `Pronóstico 16°`.

## Corrección

`Pronóstico 8°` ahora valida su propia llave:

```text
phase8_predictions_unlocked
```

Y se agregan sus llaves independientes:

```text
phase8_daily_lock_hour_ec
phase8_daily_lock_minute_ec
phase8_late_penalty_enabled
phase8_strict_match_lock_enabled
phase8_ranking_enabled
```

Además:

```text
phase16_predictions_unlocked = false
```

## Archivos modificados

```text
src/App.jsx
src/lib/storage.js
supabase/20260704_fix25_phase8_settings_keys.sql
```

## No toca

```text
Pronósticos existentes
Resultados reales
scoring.js
Edge Functions
```
