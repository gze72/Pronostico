# Fix 27 - Hotfix sync FIFA Pronóstico 8 con marcador de versión

## Problema

En la app se muestra:

```text
Sincronización ejecutada. FASE 1: ... 16°: ...
```

y no aparece `Pronóstico 8°`, lo que indica que Supabase sigue ejecutando una versión anterior de la Edge Function.

Además `phase16_results` está vacío, por eso no se visualizan resultados reales de Octavos.

## Qué corrige

```text
1. Refuerza la detección de partidos de Octavos por cruce y por IdMatch FIFA.
2. Agrega marcador de versión:
   fix27_sync_pronostico8_20260704
3. El mensaje de sincronización debe mostrar:
   Pronóstico 8°: X actualizados
```

## Archivos incluidos

```text
supabase/functions/sync-worldcup-results/index.ts
README_FIX27.md
```

## Importante

Subir el archivo a GitHub NO despliega automáticamente la Edge Function en Supabase.

Debes ejecutar:

```bash
supabase functions deploy sync-worldcup-results --project-ref faxdcmdnnsxsvfisrygx
```

## Validación esperada

Después del deploy, al sincronizar debe aparecer:

```text
Sincronización ejecutada (fix27_sync_pronostico8_20260704). FASE 1: ... 16°: ... Pronóstico 8°: X actualizados.
```
