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


## Actualización visual Zambranada

Esta versión incluye un paquete de Look & Feel premium:

- Marca de agua `Zambranada` integrada al fondo y al menú lateral.
- Mantiene la copa/balón como elemento visual sutil.
- Tarjetas, botones, tablas y navegación con estilo glassmorphism minimalista.
- Login más elegante y transiciones suaves.
- Diseño responsive para móvil, tablet y escritorio.


## Paquete consolidado Zambranada

Esta versión integra simultáneamente:

- Look & Feel premium con marca de agua Zambranada.
- Login sin mostrar credenciales ni claves de administrador.
- Persistencia de borradores en Supabase.
- Eliminación de usuario y pronósticos desde administración.


## Popup de premio

Al confirmar el pronóstico completo, la aplicación muestra un popup informativo indicando que el participante entra al sorteo por $30,00 si acierta el 80% de clasificados a la segunda fase.


## Corrección llave proyectada

La llave de dieciseisavos/Round of 32 ahora se genera con 32 clasificados únicos:

- 1.º y 2.º de cada uno de los 12 grupos.
- 8 mejores terceros de todos los grupos.
- Evita repetir países en los cruces proyectados.


## Score real y puntos FASE 1

Esta versión agrega:

- Título `Registro de pronóstico (FASE 1)`.
- Bloqueo de edición cuando el participante confirma su pronóstico.
- Columna `Score real` para visualizar resultados reales.
- Validación doble por partido:
  - 1 punto si acierta el ganador/empate.
  - 1 punto si acierta el marcador exacto.
- Puntaje acumulado visible en el menú lateral.
- Puntaje por participante visible en administración.
- Tablas Supabase:
  - `match_results`
  - `participant_scores`

Nota técnica: la app queda lista para alimentar `match_results` desde una función backend/Edge Function conectada a una fuente oficial. Mientras se configure esa integración, el administrador puede registrar el score real desde el panel de administración.
