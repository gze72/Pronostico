# Fix 36 - Regularización global Pronóstico 4°

## Problemas corregidos

```text
1. En algunos usuarios, especialmente Administrador, la interfaz seguía mostrando datos de Pronóstico 8°.
2. El máximo de puntos de Pronóstico 4° aparecía como 24.
3. Reportes y sidebar seguían indicando Pronóstico 8° como fase actual.
```

## Corrección global

```text
Pronóstico 4° es la fase actual para todos los usuarios.
Pronóstico 8°, Pronóstico 16° y Pronóstico 32° quedan históricos.
El máximo correcto de Pronóstico 4° es 12 puntos:
4 partidos × 3 puntos = 12.
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
pronósticos existentes
resultados reales
```

## Validación

```text
1. Con usuario Gregory: debe mostrar Pronóstico 4° y 0/12 o puntos sobre 12.
2. Con usuario Administrador: debe mostrar Pronóstico 4° como fase actual, no Pronóstico 8°.
3. Reportes: debe indicar Ranking de la fase actual: Pronóstico 4°.
4. Sidebar: Ranking actual debe decir Pronóstico 4° - fase actual.
5. Ningún panel de fase actual debe mostrar 24 como máximo de Pronóstico 4°.
```
