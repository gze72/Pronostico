# Fix 32 - Header de fase activa

## Problema

En Administración se seguía mostrando:

```text
12/12 grupos
```

aunque la fase activa ya es Pronóstico 4°.

## Corrección

El header ahora muestra:

```text
Pronóstico 4° / Administración / Reporte: 4/4 enfrentamientos
Pronóstico 8° histórico: 8/8 enfrentamientos
Pronóstico 16° histórico: 16/16 enfrentamientos
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
