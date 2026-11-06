'use strict';
const fs=require('node:fs');
require('../src/cloud-config.cjs').validate(process.env,{requireAll:!!process.env.VERCEL});
if(!fs.existsSync('dist/index.html'))throw Error('Falta la interfaz de Áurea.');console.log('Verificación de archivos y configuración de despliegue completada.');
