# Quiniela Mundial 2026 - App de pronósticos

App React + Supabase para registrar participantes, pronosticar marcadores por grupo, calcular posiciones, confirmar pronósticos, consultar reporte de participantes y revisar detalle como administrador.

## Ejecución rápida
```bash
npm install
npm run dev
```

## Base de datos Supabase
1. Crear proyecto Supabase.
2. Ejecutar `supabase/schema.sql` en SQL Editor.
3. Ejecutar `supabase/seed.sql` para cargar grupos/equipos/partidos.
4. Copiar `.env.example` a `.env` y completar URL + publishable key.

## Acceso demo
- Usuario normal: crear participante desde la pantalla inicial.
- Administrador demo local: nombre `admin`, clave `ADMIN2026!`.

## Notas funcionales
- El botón **Confirmar pronóstico** se habilita solo cuando los 12 grupos tienen todos sus partidos pronosticados.
- Cada grupo cambia visualmente a estado completado cuando todos sus partidos tienen marcador.
- Reportes: usuario normal ve solo su pronóstico; admin ve todos los participantes y puede consultar el detalle.
- La llave eliminatoria está parametrizada en `src/lib/worldcupData.js` para ajustar cualquier cambio oficial de FIFA sin rediseñar la app.
"# Pronostico" 
