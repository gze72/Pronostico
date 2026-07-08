# Fix 35 - Cierre único de Pronóstico 4°

## Cambio solicitado

El periodo para pronosticar Cuartos de final queda definido así:

```text
Hasta: 9/jul/2026 14:59 Ecuador
Desde: 9/jul/2026 15:00 Ecuador queda bloqueado
```

## Regla aplicada

```text
Si phase4_predictions_unlocked = false:
  aplica el cierre automático de 9/jul/2026 14:59 Ecuador.

Si phase4_predictions_unlocked = true:
  ADMIN habilitó una excepción y los puntos cuentan.
```

## Archivos modificados

```text
src/App.jsx
src/lib/scoring.js
supabase/20260708_fix35_phase4_deadline.sql
```

## No toca

```text
storage.js
styles.css
Edge Functions
pronósticos existentes
resultados reales
```

## Validación

```text
1. En Pronóstico 4° debe verse:
   Cierre de cuartos: 9/jul/2026 · 14:59 Ecuador.

2. Antes de 15:00 Ecuador permite guardar/confirmar.

3. Desde 15:00 Ecuador bloquea salvo habilitación ADMIN.

4. Los pronósticos confirmados desde 15:00 sin habilitación ADMIN quedan fuera de horario.
```
