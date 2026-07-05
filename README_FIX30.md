# Fix 30 - Hotfix módulo Reportes en blanco

## Problema

Al abrir el módulo Reportes, la pantalla quedaba en blanco.

## Causa

`ReportView` usaba `appSettings`, pero `appSettings` no estaba siendo pasado como parámetro al componente.

Eso generaba un error de JavaScript en tiempo de ejecución y rompía la vista.

## Corrección

```text
1. Se pasa appSettings a ReportView.
2. ReportView recibe appSettings con valor por defecto.
3. Se mantiene la regla de phase8_predictions_unlocked.
4. Se conserva el refresco de resultados de Pronóstico 8° después de sincronizar.
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

## Validación

Después de aplicar:

```text
1. Abrir Reportes.
2. No debe quedar pantalla en blanco.
3. Debe mostrar ranking/reporte.
4. PATITO debe conservar puntos cuando phase8_predictions_unlocked = true.
```
