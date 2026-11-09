'use strict';
const D=require('./domain.cjs'),fs=require('node:fs'),path=require('node:path');
const required=['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','AUREA_MIGRATION_KEY','AUREA_INTEGRATIONS_KEY','AUREA_BACKUP_KEY','AUREA_SETUP_TOKEN','CRON_SECRET'];
function secretKey(value,name){if(Buffer.isBuffer(value)){if(value.length===32)return value;}else if(typeof value==='string'&&/^[A-Za-z0-9+/]{43}=$/.test(value)){const key=Buffer.from(value,'base64');if(key.length===32&&key.toString('base64')===value)return key;}D.fail('Clave de cifrado inválida: '+name,503);}
function databaseUrl(value){let url;try{url=new URL(value);}catch{D.fail('Configura TURSO_DATABASE_URL con una URL protegida válida.',503);}if(!['libsql:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.hash||url.searchParams.has('tls')&&url.searchParams.get('tls')!=='1')D.fail('La conexión de Turso debe utilizar TLS y credenciales separadas.',503);return value;}
function validate(env,{requireAll=true}={}){
 if(env.VERCEL_ENV==='preview'&&env.AUREA_ALLOW_PREVIEW!=='1'){
  D.fail('Este despliegue está en Preview. Usa un despliegue de Production para la base de producción.',503);
 }
 const origin=env.AUREA_ORIGIN||(env.VERCEL==='1'&&env.VERCEL_ENV==='production'&&env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined);
 const missing=required.filter(name=>!env[name]);
 if(!origin)missing.push('AUREA_ORIGIN');
 if(requireAll&&missing.length)D.fail('Faltan variables protegidas: '+missing.join(', '),503);
 if(env.TURSO_DATABASE_URL)databaseUrl(env.TURSO_DATABASE_URL);
 for(const name of ['AUREA_MIGRATION_KEY','AUREA_INTEGRATIONS_KEY','AUREA_BACKUP_KEY']){
  if(env[name])secretKey(env[name],name);
 }
 if(origin){
  let url;
  try{url=new URL(origin);}catch{D.fail('AUREA_ORIGIN debe ser un origen HTTPS válido.',503);}
  if(url.protocol!=='https:'||url.origin!==origin)D.fail('AUREA_ORIGIN debe ser un origen HTTPS sin rutas, credenciales ni parámetros.',503);
 }
 return origin;
}
function sourceKeys(source,filename,getKey){for(const [kind,name,tables] of [['migration','charles-migration.key',['charles_full_imports','charles_migration_drafts']],['integrations','crm-integrations.key',['crm_connections','aurea_server_config']]]){const file=path.join(path.dirname(filename),name);if(fs.existsSync(file)){const key=fs.readFileSync(file);secretKey(key,name);if(!key.equals(getKey(kind)))D.fail('La clave de nube no coincide con '+name,409);}else{for(const table of tables)if(source.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=?').get(table)&&source.prepare('SELECT COUNT(*) n FROM '+table).get().n)D.fail('Restaura '+name+' antes de trasladar contenidos cifrados.',409);}}}
module.exports={validate,databaseUrl,secretKey,sourceKeys};
