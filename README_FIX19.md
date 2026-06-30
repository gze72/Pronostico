# Fix 19 - Texto claro de reglas de puntaje

## Archivo modificado

```text
src/App.jsx
```

## Qué cambia

Aclara visualmente la regla de puntaje de Pronóstico 16°:

```text
+1 Equipo clasificado
+1 Forma de clasificación
+1 Marcador exacto
```

También se agrega la aclaración explícita:

```text
Si pronostica penales y el equipo gana directo, solo suma el punto de clasificado.
```

## No toca

```text
src/lib/scoring.js
src/styles.css
Supabase
SQL
Edge Functions
```
