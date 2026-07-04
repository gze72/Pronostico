# Fix 21B - Módulo Fase 3 / Octavos definitivos

Este paquete reemplaza al Fix 21 anterior porque ya finalizaron todos los partidos de 16avos y no deben quedar cruces `TBD`.

## Cruces definitivos de Octavos

```text
R16-01 / 8°-01: Canadá vs Marruecos
R16-02 / 8°-02: Paraguay vs Francia
R16-03 / 8°-03: Brasil vs Noruega
R16-04 / 8°-04: México vs Inglaterra
R16-05 / 8°-05: Portugal vs España
R16-06 / 8°-06: Estados Unidos vs Bélgica
R16-07 / 8°-07: Argentina vs Egipto
R16-08 / 8°-08: Suiza vs Colombia
```

## Resultados de 16avos usados para cerrar cruces

```text
Argentina 3 - 2 Cabo Verde
Australia 1 - 1 Egipto / pasa Egipto por penales
Colombia 1 - 0 Ghana
```

## Lecciones aplicadas de Pronóstico 16°

```text
1. IDs propios: R16-01 a R16-08.
2. Cruces definitivos, sin TBD.
3. Orden por fecha/hora.
4. Puntaje máximo 3 por partido:
   +1 clasificado
   +1 forma de clasificación
   +1 marcador exacto
5. Guardado independiente: phase16_forecasts.
6. Resultados reales independientes: phase16_results.
7. Bloqueo diario configurable.
8. Administración con carga de resultados reales.
9. Ranking separado para Pronóstico 8°.
```

## Archivos incluidos

```text
src/App.jsx
src/styles.css
src/lib/scoring.js
src/lib/storage.js
supabase/20260704_phase16_module_octavos_definitivos.sql
README_FIX21B.md
```

## Orden de instalación

1. Ejecutar SQL en Supabase.
2. Reemplazar archivos del proyecto.
3. Ejecutar `npm run dev`.
4. Validar visualmente Pronóstico 8°.
5. Versionar.
