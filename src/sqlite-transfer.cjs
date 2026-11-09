'use strict';
const crypto=require('node:crypto'),D=require('./domain.cjs');
const identifier=s=>'"'+String(s).replaceAll('"','""')+'"';
const excluded=new Set(['aurea_cloud_backups','aurea_cloud_backup_parts','aurea_cloud_uploads','aurea_cloud_upload_parts']);
function encode(value){return (value instanceof Uint8Array||value instanceof ArrayBuffer)?{$aurea_blob:Buffer.from(value).toString('base64')}:typeof value==='bigint'?{$aurea_integer:String(value)}:value;}
function decode(value){return value&&typeof value==='object'&&value.$aurea_blob!==undefined?Buffer.from(value.$aurea_blob,'base64'):value&&typeof value==='object'&&value.$aurea_integer!==undefined?BigInt(value.$aurea_integer):value;}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function manifest(snapshot){return snapshot.tables.map(t=>({name:t.name,rows:t.rows.length,hash:digest(t.rows.map(r=>JSON.stringify(r)).sort())})).sort((a,b)=>a.name.localeCompare(b.name));}
function structure(source){return {schema:source.schema,sequences:source.sequences||[],metadata:source.metadata||{userVersion:0,applicationId:0}};}
function snapshot(db,{transaction=true}={}){
 if(transaction)db.exec('BEGIN');
 try{
  const schema=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*' ORDER BY type,name").all().filter(o=>!excluded.has(o.name)&&!excluded.has(o.tbl_name));
  const definitions=schema.filter(o=>o.type==='table');
  const queries=definitions.flatMap(o=>['PRAGMA table_info('+identifier(o.name)+')','SELECT * FROM '+identifier(o.name)]);
  const resultRows=db.batch&&queries.length?db.batch(queries.map(sql=>({sql,args:[]}))).map(r=>r.rows):queries.map(sql=>db.prepare(sql).all());
  const tables=definitions.map((o,i)=>{
   const columns=resultRows[2*i].map(c=>c.name);
   return {name:o.name,columns,rows:resultRows[2*i+1].map(r=>columns.map(c=>encode(r[c])))};
  });
  const sequences=db.prepare("SELECT name FROM sqlite_master WHERE name='sqlite_sequence'").get()?db.prepare('SELECT name,seq FROM sqlite_sequence ORDER BY name').all():[];
  const metadata={userVersion:db.prepare('PRAGMA user_version').get().user_version,applicationId:db.prepare('PRAGMA application_id').get().application_id};
  const result={format:'aurea-sqlite-transfer-v1',createdAt:D.now(),schema,tables,sequences,metadata};
  result.manifest=manifest(result);
  result.integrity=digest({...structure(result),manifest:result.manifest});
  if(transaction)db.exec('COMMIT');
  return result;
 }catch(e){if(transaction)try{db.exec('ROLLBACK');}catch{}throw e;}
}
function restore(db,source){
 if(source?.format!=='aurea-sqlite-transfer-v1'||JSON.stringify(manifest(source))!==JSON.stringify(source.manifest)||source.integrity&&source.integrity!==digest({...structure(source),manifest:source.manifest}))D.fail('La copia de transferencia no coincide con su manifiesto.',409);
 const occupied=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*'").all();
 if(occupied.length)D.fail('El destino debe estar vacío. La migración no sobrescribe bases existentes.',409);

 const writes=[];
 const add=(sql,args=[])=>writes.push({sql,args});
 add('PRAGMA defer_foreign_keys=ON');
 for(const o of source.schema.filter(o=>o.type==='table'))add(o.sql);
 for(const table of source.tables){
  const sql='INSERT INTO '+identifier(table.name)+'('+table.columns.map(identifier).join(',')+') VALUES('+table.columns.map(()=>'?').join(',')+')';
  for(const row of table.rows)add(sql,row.map(decode));
 }
 for(const row of source.sequences||[]){
  add('DELETE FROM sqlite_sequence WHERE name=?',[row.name]);
  add('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)',[row.name,row.seq]);
 }
 for(const o of source.schema.filter(o=>o.type!=='table'))add(o.sql);
 if(source.metadata){
  for(const [name,key] of [['user_version','userVersion'],['application_id','applicationId']]){
   const value=source.metadata[key];
   if(!Number.isInteger(value)||value< -2147483648||value>2147483647)D.fail('Metadatos SQLite inválidos.',409);
   if(db.prepare('PRAGMA '+name).get()[name]!==value)add('PRAGMA '+name+'='+value);
  }
 }

 db.exec('BEGIN IMMEDIATE');
 try{
  if(db.batch){
   let group=[],bytes=0;
   for(const stmt of writes){
    const size=Buffer.byteLength(stmt.sql)+Buffer.byteLength(JSON.stringify(stmt.args.map(encode)));
    if(group.length&&(bytes+size>2000000||group.length===100)){db.batch(group);group=[];bytes=0;}
    group.push(stmt);
    bytes+=size;
   }
   if(group.length)db.batch(group);
  }else{
   for(const {sql,args} of writes)db.prepare(sql).run(...args);
  }
  if(db.prepare('PRAGMA foreign_key_check').all().length)D.fail('La copia contiene referencias a registros inexistentes.',409);
  const actual=snapshot(db,{transaction:false});
  if(JSON.stringify(actual.manifest)!==JSON.stringify(source.manifest)||digest(structure(actual))!==digest(structure(source)))D.fail('Los datos escritos no coinciden con el origen.',500);
  db.exec('COMMIT');
  return actual.manifest;
 }catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}
}
module.exports={snapshot,restore,manifest,encode,decode,digest};
