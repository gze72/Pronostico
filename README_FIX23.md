# Fix 23 - Hotfix JSX y Administración solo Pronóstico 8°

## Problema corregido

El Fix 22 anterior rompió el JSX en `src/App.jsx` al eliminar un bloque interno de Administración.

## Solución segura

Este hotfix parte del Fix 21B estable y aplica la mejora sin eliminar fragmentos JSX:

```text
1. Pronóstico 16° queda bloqueado en el menú lateral.
2. Pronóstico 8° queda como fase activa.
3. En Administración se ocultan los bloques históricos de Pronóstico 16° mediante clase CSS.
4. La estructura JSX queda intacta.
```

## Archivos modificados

```text
src/App.jsx
src/styles.css
```

## No toca

```text
src/lib/scoring.js
src/lib/storage.js
Supabase
SQL
Edge Functions
```
