# Fix 34 - Orden correcto del menú lateral

## Cambio solicitado

El menú lateral queda en este orden:

```text
1. Pronóstico 4°
2. Pronóstico 8°
3. Pronóstico 16°
4. Pronóstico 32°
5. Reporte
6. Administración
```

## Regla visual

La fase activa/en curso siempre queda resaltada. Actualmente:

```text
Pronóstico 4°
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
