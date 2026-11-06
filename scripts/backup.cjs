'use strict';
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const filename=process.env.AUREA_DB||path.join(root,'data','aurea.sqlite');
if(!fs.existsSync(filename)){console.error('No existe una base de datos de Áurea para respaldar.');process.exit(1);}
fs.mkdirSync(path.join(root,'backups'),{recursive:true});
const output=path.join(root,'backups','aurea-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
const db=new DatabaseSync(filename);db.exec("VACUUM INTO '"+output.replace(/'/g,"''")+"'");db.close();
console.log('Respaldo creado: '+output);

for(const name of ['charles-migration.key','crm-integrations.key'])if(fs.existsSync(path.join(path.dirname(filename),name)))console.log('Conserva además una copia protegida y separada de '+path.join(path.dirname(filename),name)+'. La base cifrada depende de esa clave.');
