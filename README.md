# Áurea · Gestión de joyería

Aplicación para administrar una joyería de una sola sede. Combina operación comercial, inventario, cuentas, reportes y CRM con una interfaz en marfil, verde profundo y acentos dorados.

## Funciones

- **POS:** ventas por unidad o gramaje, precio manual o tarifa de metal, descuentos, pagos mixtos, comprobantes y utilidad según permisos.
- **Inventario:** catálogo, categorías, existencias, ajustes, tarifas de metales, proveedores, servicios de taller y activos.
- **Operación:** compras, crédito de clientes y proveedores, separes, abonos, caja, cuentas y cierres.
- **Informes:** paneles comerciales, cartera y mora, compras, flujo de fondos, balance, ranking y tendencias. Los costos históricos desconocidos se indican expresamente.
- **CRM Beta:** fichas comerciales, agenda, oportunidades, cotizaciones, posventa, segmentos, campañas y canales configurables. Los servicios externos requieren configuración propia.
- **Administración:** usuarios, perfiles, permisos del servidor y auditoría.
- **Migración de Charles:** captura completa de Mongo en solo lectura, revisión cifrada, ensayo aislado, respaldo y confirmación del superadministrador. No sincroniza automáticamente movimientos futuros ni modifica Charles.
- **Interfaz adaptable:** navegación lateral plegable, modo claro/oscuro y paginación de listados. Las exportaciones conservan todos los resultados del filtro.

## Requisitos y arranque

Node.js **24 o superior** y pnpm **11.25.0**. No es necesario compilar el frontend: los archivos estáticos están en `dist/`.

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm start
```

Abrir [http://127.0.0.1:4178](http://127.0.0.1:4178). En el primer acceso se crea el superadministrador. No hay una cuenta universal de producción. En Windows también se puede ejecutar `INICIAR-AUREA.cmd` después de instalar las dependencias.

Las pruebas y demostraciones contienen únicamente datos ficticios. Sus credenciales no se utilizan al iniciar la aplicación normal.

## Datos y seguridad

El servidor utiliza SQLite en `data/aurea.sqlite`, con transacciones, control de revisión y claves de idempotencia para operaciones. MongoDB se utiliza para importar el origen de Charles; no es necesario para operar una instalación vacía de Áurea.

**Este repositorio contiene el software, no los datos de ninguna joyería.** Bases, respaldos, claves, credenciales, exportaciones e informes internos están excluidos. La instalación existente debe conservar su carpeta de datos y sus claves al actualizar el código.

```sh
pnpm run backup
```

Los respaldos de datos y las claves locales de cifrado deben conservarse en ubicaciones protegidas. Las claves `charles-migration.key` y `crm-integrations.key`, cuando existan, son necesarias para recuperar sus contenidos cifrados; no deben subirse a GitHub.

## Configuración y despliegue

Ver [DEPLOY.md](DEPLOY.md). Por defecto el servidor escucha en `127.0.0.1:4178`. El uso desde Internet requiere un servidor Node permanente, almacenamiento persistente y HTTPS mediante un proxy. El frontend necesita esta API: GitHub Pages no ejecuta el servidor.

Las variables de entorno se configuran en el servicio de ejecución. Para una configuración local en archivo se puede copiar `.env.example` a `.env` y ejecutar:

```sh
node --env-file=.env server.cjs
```

No introducir claves en el navegador salvo en los formularios protegidos previstos para configuración del superadministrador. La integración de IA, cuando se activa, comunica información al proveedor configurado: revisar el alcance antes de usar datos reales.

## Pruebas

```sh
pnpm test
```

Incluye regresiones de POS, permisos, pagos anulados, migración/BSON, integridad del archivo cifrado, saldos, costos desconocidos, CRM, exportaciones, paginación y HTTP. GitHub Actions ejecuta las pruebas al publicar cambios y abrir pull requests.

Diagnósticos de una instalación existente, en lectura:

```sh
node scripts/diagnose-app.cjs
node scripts/verify-migration.cjs
node scripts/audit-migration-data.cjs
```

El último comando necesita acceso de lectura al Mongo original y una migración previa; no se utiliza en la integración continua. Los informes generados quedan en `validacion/`, fuera de Git.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/` | Modelo de operación, persistencia, informes, CRM y migración |
| `dist/` | Interfaz, estilos y recursos servidos directamente |
| `scripts/` | Respaldos, diagnósticos y pruebas visuales aisladas |
| `tests/` | Pruebas automatizadas con datos ficticios |
| `.github/workflows/` | Integración continua |

Los medios de pago registran operaciones; no ejecutan transferencias bancarias. Los comprobantes comerciales no constituyen una integración de factura electrónica. La distribución fiscal, contable y de periféricos debe validarse para cada instalación.
