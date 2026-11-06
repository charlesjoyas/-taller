# Ejecutar y actualizar Áurea

## Instalación nueva

1. Instalar Node.js 24 y pnpm 11.25.0.
2. Clonar este repositorio y ejecutar `pnpm install --frozen-lockfile`.
3. Elegir una carpeta persistente privada para `AUREA_DB`.
4. Configurar variables en el servicio de ejecución e iniciar `node server.cjs`.
5. Crear la cuenta de superadministrador desde el primer acceso.

La primera instalación expuesta a otros equipos debe protegerse con un `AUREA_SETUP_TOKEN` propio antes de permitir acceso. El asistente admite el código de instalación. No incluirlo en el repositorio.

## Variables

| Variable | Uso |
|---|---|
| `PORT` | Puerto local, por defecto 4178 |
| `AUREA_DB` | Ruta del SQLite persistente; por defecto `data/aurea.sqlite` |
| `AUREA_ORIGIN` | Origen HTTPS autorizado, por ejemplo `https://aurea.ejemplo.com` |
| `AUREA_SECURE_COOKIE` | `1` al usar HTTPS |
| `AUREA_SETUP_TOKEN` | Código privado para autorizar la primera instalación |
| `DEEPSEEK_API_KEY` | Opcional; clave de IA solo en el servidor |
| `AUREA_CHARLES_ROOT` | Opcional; carpeta local del original para detectar su conexión de importación sin ejecutar Charles |

No se carga `.env` automáticamente. Usar variables del servicio o `node --env-file=.env server.cjs`. No configurar `AUREA_CHARLES_ROOT` si la instalación no necesita acceso local al original.

## Servidor y HTTPS

Áurea escucha en la interfaz de loopback. Ejecutar el proxy HTTPS en el mismo host o espacio de red y dirigirlo a `127.0.0.1:4178`. Configurar `AUREA_ORIGIN` con el dominio final y activar `AUREA_SECURE_COOKIE=1`. El proxy debe conservar `Host` y no almacenar respuestas `/api/`.

El proceso Node debe permanecer activo y reiniciarse mediante el gestor de servicios de la plataforma. SQLite y sus claves no pueden vivir únicamente en un disco efímero. Si la plataforma ejecuta el proxy en otro contenedor, hay que adaptar expresamente la topología de red antes de desplegar; la configuración local no expone Node a otras interfaces.

Los archivos públicos de `dist/` y las API deben servirse desde el mismo origen. No publicar Mongo, SQLite, claves ni la carpeta completa del proyecto como archivos estáticos.

## Actualizar una instalación con datos

1. Realizar un respaldo consistente con `node scripts/backup.cjs` y conservar por separado las claves locales correspondientes.
2. Detener el servidor y revisar el cambio de código.
3. Actualizar los archivos versionados sin eliminar la carpeta de datos, sus archivos de recuperación ni las claves.
4. Ejecutar `pnpm install --frozen-lockfile` y las pruebas.
5. Reiniciar con el mismo `AUREA_DB` y configuración.
6. Comprobar acceso, datos y diagnósticos; recargar el navegador para renovar el caché de la interfaz.

No ejecutar el importador para actualizar código ni reemplazar la base de una joyería con los datos de otra instalación.

## Recuperación

Para recuperar datos, detener el proceso y restaurar el SQLite y sus claves en una carpeta nueva protegida. Arrancar con `AUREA_DB` apuntando a esa copia y comprobar integridad, saldos y accesos antes de usarla. Mantener el respaldo anterior hasta validar la recuperación.

GitHub almacena este código y ejecuta sus pruebas; el alojamiento y el dominio de una instalación son configuraciones independientes.
