'use strict';
// Isolated offline rehearsals only. Production always uses the official HTTP SDK.
const {DatabaseSync}=require('node:sqlite');
function createClient({url}){
 const db=new DatabaseSync(url.slice(5));db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL');
 const execute=async({sql,args=[]})=>{const stmt=db.prepare(sql),cols=stmt.columns(),rows=cols.length?stmt.all(...args):[];let result={changes:0,lastInsertRowid:0};if(!cols.length)result=stmt.run(...args);return {columns:cols.map(c=>c.name),rows,rowsAffected:result.changes,lastInsertRowid:result.lastInsertRowid};};
 const executeMultiple=async sql=>{db.exec(sql);};
 const statements=async stmts=>{const rows=[];for(const stmt of stmts)rows.push(await execute(stmt));return rows;};
 return {execute,executeMultiple,async transaction(mode){db.exec(mode==='write'?'BEGIN IMMEDIATE':'BEGIN');return {execute,executeMultiple,batch:statements,async commit(){db.exec('COMMIT');},async rollback(){db.exec('ROLLBACK');}};},async batch(stmts){db.exec('BEGIN IMMEDIATE');try{const r=await statements(stmts);db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}},close(){db.close();}};
}
module.exports={createClient};
