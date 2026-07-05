# Fix 29 - Pronóstico 8° habilitado cuenta puntos aunque haya confirmación posterior

## Problema

PATITO estaba confirmado en Pronóstico 8°, pero aparecía con:

```text
Fuera de horario
0 pts
```

porque confirmó después de las 11:00 Ecuador.

## Regla corregida

Si el ADMIN habilita la fase con:

```text
phase8_predictions_unlocked = true
```

entonces esa habilitación excepcional permite:

```text
1. Confirmar pronósticos.
2. Contar puntos normalmente.
3. No aplicar la penalización de fuera de horario.
```

Si la llave queda en `false`, vuelve a aplicar el cierre diario y la penalización.

## Archivos modificados

```text
src/lib/scoring.js
src/App.jsx
```

## No toca

```text
Supabase
SQL
Edge Functions
storage.js
styles.css
```

## Resultado esperado para PATITO con los dos partidos jugados

```text
R16-01 Marruecos clasificó directo: 2 pts
R16-02 Francia clasificó directo: 2 pts
Total parcial: 4 pts
```
