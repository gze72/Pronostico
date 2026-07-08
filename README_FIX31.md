# Fix 31 - Fase 4 / Cuartos de final - Pronóstico 4°

## Cruces oficiales

```text
QF-01 / 4°-01: Francia vs Marruecos
QF-02 / 4°-02: España vs Bélgica
QF-03 / 4°-03: Noruega vs Inglaterra
QF-04 / 4°-04: Argentina vs Suiza
```

## Lecciones aplicadas

```text
1. Tablas propias: phase4_forecasts y phase4_results.
2. Llaves propias: phase4_predictions_unlocked y phase4_daily_lock_*.
3. Menú enfocado en Pronóstico 4°.
4. Pronóstico 8° queda cerrado como histórico.
5. Administración enfocada en Pronóstico 4°.
6. Sync FIFA por IdMatch directo a phase4_results.
7. Puntaje máximo por partido: 3 pts.
```

## Instalación

1. Ejecutar `supabase/20260708_fix31_phase4_quarterfinals.sql`.
2. Reemplazar archivos del proyecto.
3. Desplegar Edge Function:
   `npx supabase@latest functions deploy sync-worldcup-results --project-ref faxdcmdnnsxsvfisrygx`
4. Ejecutar `npm run dev` y validar.
