'use strict';
// Source SQL is read-only. A marker prevents restarting local operation after cutover.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),T=require('../src/sqlite-transfer.cjs'),{TursoDatabase}=require('../src/turso.cjs');
async function main(){
 const apply=process.argv.includes('--apply'),sourceFile=path.resolve(process.env.AUREA_DB||path.join(__dirname,'../data/aurea.sqlite')),marker=sourceFile+'.cloud-cutover.json';
 const reportFile=path.resolve(process.env.AUREA_CLOUD_REPORT||path.join(__dirname,'../validacion/migracion-turso.json')),saveReport=value=>{fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(value,null,2)+'\n');};let source,target,temp,ownsMarker=false;
 saveReport({checkedAt:new Date().toISOString(),mode:apply?'turso-applied':'offline-rehearsal',verified:false,status:'running'});
 try{if(apply&&!process.argv.includes('--local-stopped'))throw Error('Detén el servidor local y añade --local-stopped.');source=new DatabaseSync(sourceFile,{readOnly:true});
  if(apply){
   target=new TursoDatabase();for(const kind of ['migration','integrations','backup'])target.secret(kind);
   // The target and encryption keys are required above. Vercel settings are needed at deployment.
   const cloudConfig=require('../src/cloud-config.cjs');
   cloudConfig.validate(process.env,{requireAll:false});
   cloudConfig.sourceKeys(source,sourceFile,kind=>target.secret(kind));
   fs.writeFileSync(marker,JSON.stringify({status:'transferring',at:new Date().toISOString()})+'\n',{flag:'wx',mode:0o600});ownsMarker=true;
  }else{temp=fs.mkdtempSync(path.join(os.tmpdir(),'aurea-turso-rehearsal-'));target=new TursoDatabase({url:'file:'+path.join(temp,'target.sqlite'),allowFile:true});}
  const capture=T.snapshot(source),restored=T.restore(target,capture),current=T.snapshot(source);
  if(current.integrity!==capture.integrity)throw Error('La base local cambió durante la transferencia. No actives la nube.');
  const state=JSON.parse(source.prepare('SELECT content FROM store WHERE id=1').get().content),counts=Object.fromEntries(Object.entries(state).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]));
  const report={checkedAt:new Date().toISOString(),mode:apply?'turso-applied':'offline-rehearsal',sourceReadOnly:true,verified:true,revision:source.prepare('SELECT revision FROM store WHERE id=1').get().revision,counts,tables:restored};
  saveReport({...report,status:'verified'});
  if(apply)fs.writeFileSync(marker,JSON.stringify({status:'verified',at:report.checkedAt,revision:report.revision,origin:process.env.AUREA_ORIGIN||null})+'\n',{mode:0o600});
  console.log(JSON.stringify({mode:report.mode,verified:true,revision:report.revision,tables:restored.length,records:restored.reduce((n,t)=>n+t.rows,0),counts}));
 }catch(e){saveReport({checkedAt:new Date().toISOString(),mode:apply?'turso-applied':'offline-rehearsal',verified:false,status:'failed',sourceReadOnly:true,message:e.status?e.message:'La transferencia no se completó. No actives la nube.'});if(ownsMarker)fs.writeFileSync(marker,JSON.stringify({status:'failed',at:new Date().toISOString()})+'\n',{mode:0o600});throw e;}finally{source?.close();await target?.close();if(temp){const absolute=path.resolve(temp);if(path.dirname(absolute)!==path.resolve(os.tmpdir())||!path.basename(absolute).startsWith('aurea-turso-rehearsal-'))throw Error('Directorio temporal no permitido');fs.rmSync(absolute,{recursive:true,force:true,maxRetries:10,retryDelay:100});}}
}
main().catch(e=>{console.error(e.message.includes('local-stopped')?e.message:'No se completó la transferencia. No actives la nube. Revisa configuración, destino vacío e informe; la base local no fue modificada. El marcador de traslado se conserva si se inició la migración.');process.exitCode=1;});
