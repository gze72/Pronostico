# Fix 26 - Sincronización automática FIFA para Pronóstico 8°

## Alcance

Agrega sincronización automática FIFA para los resultados reales de Octavos / Pronóstico 8°.

## Nota técnica importante

En la app la fase se muestra como:

```text
Pronóstico 8°
```

La tabla física ya creada y usada por `storage.js` es:

```text
phase16_results
```

Por estabilidad, este fix sincroniza FIFA contra `phase16_results`, sin renombrar tablas ni mover datos.

## Cruces sincronizados

```text
R16-01 Canadá vs Marruecos
R16-02 Paraguay vs Francia
R16-03 Brasil vs Noruega
R16-04 México vs Inglaterra
R16-05 Portugal vs España
R16-06 Estados Unidos vs Bélgica
R16-07 Argentina vs Egipto
R16-08 Suiza vs Colombia
```

## Archivos incluidos

```text
supabase/functions/sync-worldcup-results/index.ts
supabase/20260704_fix26_phase8_fifa_sync_support.sql
README_FIX26.md
```

## Qué protege

No sobrescribe resultados cargados manualmente por ADMIN si la columna `source` contiene:

```text
manual-admin
admin-final
```

## Orden de instalación

1. Ejecutar en Supabase:
   `supabase/20260704_fix26_phase8_fifa_sync_support.sql`

2. Reemplazar/deployar Edge Function:
   `supabase/functions/sync-worldcup-results/index.ts`

3. Probar sincronización desde la app o con la función.

## No toca

```text
Pronósticos de usuarios
src/App.jsx
src/lib/storage.js
src/lib/scoring.js
Resultados manuales protegidos
```
