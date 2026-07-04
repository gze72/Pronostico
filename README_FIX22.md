# Fix 22 - Bloquear Pronóstico 16° y enfocar Administración en Pronóstico 8°

## Problema corregido

Después de agregar el módulo de Octavos, la app todavía permitía entrar desde el menú a `Pronóstico 16°` y en Administración se mezclaban los bloques de Pronóstico 8° y Pronóstico 16°.

## Cambios

```text
1. Pronóstico 16° queda bloqueado en el menú lateral.
2. Pronóstico 8° queda como fase activa.
3. Administración muestra únicamente Pronóstico 8°.
4. Se elimina de Administración el bloque histórico de Resultado real Pronóstico 16°.
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
