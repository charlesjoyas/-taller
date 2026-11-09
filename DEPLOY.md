# Desplegar Áurea con Vercel y Turso

Áurea admite SQLite local y Turso/libSQL para Vercel. En la nube los datos, sesiones, permisos, auditoría, revisiones de importación y configuración cifrada se guardan en Turso. El disco temporal de Vercel no se usa como base operativa. El repositorio nunca incluye datos privados.

## Trasladar una instalación existente

1. Crear una base **vacía** en Turso y obtener su URL `libsql://…` y token de acceso.
2. En el equipo que contiene la base local ejecutar `pnpm cloud:prepare`. Se genera `.env.vercel.local`, ignorado por Git, con las claves originales de los archivos cifrados y nuevas claves de respaldo e instalación. Conservar una copia privada segura.
3. Completar en ese archivo `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. Definir `AUREA_ORIGIN` (origen HTTPS sin ruta ni barra final) cuando se conozca el dominio definitivo, antes de desplegar. No enviar este archivo a GitHub ni pegar sus valores en el chat.
4. Ejecutar `pnpm cloud:rehearse`. Este ensayo **no se conecta a Turso**: restaura una copia aislada mediante SQLite en un worker y compara tablas, datos, BLOB, secuencias, metadatos y huellas; comprueba también las referencias. Los conteos comerciales y resultados quedan en `validacion/migracion-turso.json`.
5. Detener todos los procesos que puedan escribir en la base local y cerrar la operación de la tienda durante el traslado. Hacer un respaldo con `pnpm backup` y conservar las claves asociadas.
6. Transferir desde esa máquina:

   ```sh
   node --env-file=.env.vercel.local scripts/migrate-turso.cjs --apply --local-stopped
   ```

   El comando exige un destino vacío, verifica las claves de cifrado, conserva el origen en lectura y compara cada tabla. Preserva cuentas y contraseñas; no hay que crear otro propietario. Los registros comerciales están anidados en `store.content`, por lo que el número de filas SQL no equivale al número de productos o ventas.
7. Confirmar `verified: true` en el informe. El marcador junto al SQLite, con sufijo `.cloud-cutover.json`, bloquea el arranque local para evitar operar dos copias. Si el traslado falla, **no activar la nube**: revisar el destino y el informe. El marcador se conserva; retirarlo solo después de decidir qué copia será la única operativa. No reintentar contra una base parcialmente transferida sin revisar su estado.
8. Importar el repositorio en Vercel, rama `codex/aurea`, y configurar las variables protegidas indicadas abajo para **Production**. Vercel detecta `vercel.json`: no cambiar directorio raíz, publicar `dist/` y conservar la función `api/index.js`.
9. Desplegar y comprobar `/api/health`, acceso con la cuenta existente, inventario, cartera, compras, archivos históricos y permisos. Probar venta, abono, anulación y cierre en una base de ensayo separada antes de abrir operación real. Confirmar también respaldo y recuperación.

No reabrir la antigua base local después de comenzar a operar en Turso. Una vuelta al equipo requiere recuperar una copia actual de la nube, con sus claves, en una carpeta nueva.

## Variables protegidas de Vercel

| Variable | Contenido |
|---|---|
| `TURSO_DATABASE_URL` | URL de la base de producción |
| `TURSO_AUTH_TOKEN` | Token privado con acceso a esa base |
| `AUREA_ORIGIN` | Origen HTTPS final sin barra final. En Production se puede omitir si Vercel expone `VERCEL_PROJECT_PRODUCTION_URL`. |
| `AUREA_MIGRATION_KEY` | Clave original de `charles-migration.key`, codificada en base64 |
| `AUREA_INTEGRATIONS_KEY` | Clave original de `crm-integrations.key`, codificada en base64 |
| `AUREA_BACKUP_KEY` | Clave de 32 bytes en base64 para respaldos de nube |
| `AUREA_SETUP_TOKEN` | Código privado de instalación inicial |
| `CRON_SECRET` | Secreto aleatorio para el respaldo programado |
| `NODEJS_HELPERS` | `0`; también está declarado en `vercel.json` para conservar el cuerpo HTTP original |
| `DEEPSEEK_API_KEY` | Opcional; también puede configurarse cifrada desde Áurea |

No cambiar las claves de cifrado al actualizar código. Perderlas impide recuperar sus contenidos. Las claves generadas por `cloud:prepare` son privadas de cada instalación.

Las previews están bloqueadas por defecto. Para habilitarlas se requieren **otra base y otras variables**, y `AUREA_ALLOW_PREVIEW=1`. No dar acceso de escritura a producción a despliegues de prueba.

En una instalación nueva sin traslado, `AUREA_ALLOW_EMPTY_SETUP=1` habilita expresamente el asistente protegido por `AUREA_SETUP_TOKEN`. Retirar la autorización después del alta. No usarla para una instalación que espera recibir sus datos existentes.

## Respaldos y recuperación

El cron de `vercel.json` ejecuta a diario, a las 00:00 de Bogotá, seguimiento interno del CRM y un respaldo lógico cifrado. Exige `CRON_SECRET`; no envía campañas. Revisar la ejecución en Vercel y las cuotas del plan. El cron no garantiza por sí solo recuperación ante pérdida de toda la cuenta de Turso.

```sh
node --env-file=.env.vercel.local scripts/cloud-backup.cjs create
node --env-file=.env.vercel.local scripts/cloud-backup.cjs restore-local turso-ID CARPETA_NUEVA
```

La recuperación verifica huella y cifrado, restaura el SQLite y las claves originales en una carpeta nueva. Mantener además copias fuera de la cuenta de Turso y conservar por separado `AUREA_BACKUP_KEY`. Los respaldos de la aplicación permanecen en la base hasta su mantenimiento; vigilar almacenamiento. Configurar también las opciones de recuperación del proveedor según el plan contratado.

El traslado incluye todas las tablas de la base seleccionada y su archivo cifrado de Charles. Los antiguos archivos externos de respaldo y las bases locales preparadas por separado deben conservarse en el equipo; no se publican ni se convierten en servidores de nube. Para ensayos en la nube usar otra base Turso.

## Límites y validación de producción

Las solicitudes JSON de nube admiten 3 MB; el selector de importación deja margen con 2,8 MB. Las capturas grandes se preparan en la instalación local y se trasladan mediante el script. Las respuestas JSON grandes se envían por fragmentos. El estado comercial se conserva en un documento transaccional: no se convierte en una base distribuida sin límites; vigilar tamaño, latencia, concurrencia y cuotas de Turso/Vercel conforme crezca la operación.

El adaptador conserva las operaciones síncronas del dominio mediante un worker y transacciones de libSQL. Las pruebas aisladas verifican integridad, idempotencia, sesiones entre instancias, rutas HTTP y recuperación. Un servidor Hrana de prueba comprueba también el SDK HTTP oficial, incluida la pérdida de una respuesta de confirmación. El ensayo de archivo utiliza SQLite de Node para evitar inestabilidad de los módulos nativos de terceros en Windows. La latencia real y la disponibilidad solo se validan conectando la base alojada y desplegando en la cuenta real. Elegir regiones cercanas para función y base. No se requieren procesos permanentes ni temporizadores locales en Vercel.

El frontend y `/api/` deben usar el mismo origen. Las cookies son HttpOnly, SameSite y Secure en la nube; las escrituras exigen sesión, permisos, origen y CSRF. No configurar caché de las API. La importación antigua parcial está deshabilitada en nube: usar Configuración → Migración completa.

## Uso local

Node.js 24.x y pnpm 11.25.0. Ejecutar `pnpm install --frozen-lockfile` y `pnpm start`; abrir `http://127.0.0.1:4178`. Por defecto se usa `data/aurea.sqlite` sin acceder a Turso. `AUREA_DB` permite elegir otra ruta y debe conservar sus claves junto al archivo. El servidor escucha en loopback; para un servidor permanente externo configurar proxy HTTPS, `AUREA_ORIGIN` y `AUREA_SECURE_COOKIE=1`.

No se cargan archivos `.env` automáticamente. Usar `node --env-file=ARCHIVO …` o variables del servicio. El código de Charles y su base original permanecen en solo lectura durante cualquier importación.
