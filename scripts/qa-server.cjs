'use strict';
// Base efímera de pruebas visuales. Nunca abre la base operativa de Áurea.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {randomUUID}=require('node:crypto');
const {createApplication}=require('../server.cjs');
const D=require('../src/domain.cjs');
const directory=process.env.AUREA_QA_DB?path.dirname(path.resolve(process.env.AUREA_QA_DB)):fs.mkdtempSync(path.join(os.tmpdir(),'aurea-visual-'));if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('aurea-visual-'))throw Error('La base de QA debe estar en un directorio temporal autorizado.');
const app=createApplication({filename:path.join(directory,'qa.sqlite')});
if(!app.store.initialized()){
const admin=app.store.setup({name:'Ana · Pruebas',email:'qa@example.test',password:'Aurea-Prueba-Local-2026!',storeName:'Áurea · Base de pruebas'});
app.store.createUser({name:'Administrador de prueba',email:'admin@example.test',password:'Aurea-Prueba-Local-2026!',role:'Administrador'},admin);
if(!process.env.AUREA_QA_EMPTY){
const run=(command,body)=>app.store.execute(admin,command,body,app.store.read().revision,randomUUID()).result;
const client=run('contact.save',{kind:'customer',name:'Valentina · Prueba',doc:'QA-001',creditLimit:5000000});
const supplier=run('contact.save',{kind:'supplier',name:'Metales · Prueba',doc:'QA-P01',bank:'Banco ficticio',accountType:'Ahorros',accountNumber:'QA-CUENTA-001'});
const pieces=[['AN-018','Anillo solitario Aurora','Anillos','Oro 18k',3.25,1970000,1443000,4],['CA-042','Cadena tejido veneciano','Cadenas','Oro 18k',5.8,3364000,2575200,3],['AR-026','Aretes argollas Élite','Aretes','Oro 18k',2.4,1392000,1065600,6],['PU-011','Pulsera eslabón clásico','Pulseras','Oro 14k',4.1,2091000,1558000,1],['AN-033','Anillo sello Oval','Anillos','Plata 925',6.2,235600,173600,8],['DI-008','Dije corazón mini','Dijes','Oro 18k',1.1,638000,488400,3]];
const products=pieces.map(([sku,name,category,metal,weight,price,cost,stock])=>run('product.save',{sku,name,category,metal,measureType:'Unidades',weight,price,cost,stock,minStock:1}));
run('shift.open',{opening:500000});
run('sale.create',{items:[{productId:products[0].id,qty:1}],mode:'credit',customerId:client.id,dueDate:D.today(),payments:[{method:'cash',amount:500000}]});
run('sale.create',{items:[{productId:products[2].id,qty:1}],payments:[{method:'transfer',amount:1392000,accountId:'bank'}]});
run('sale.create',{items:[{productId:products[5].id,qty:1}],payments:[{method:'cash',amount:638000}]});
run('purchase.create',{supplierId:supplier.id,productId:products[4].id,invoice:'QA-COMPRA-001',qty:2,total:347200,dueDate:D.today(),payments:[{method:'cash',amount:100000}]});
run('expense.save',{description:'Insumos de prueba',category:'Taller',amount:35000,accountId:'cash'});
run('asset.save',{name:'Balanza de prueba',category:'Equipos',value:400000,costValue:500000,purchaseDate:D.today()});
run('service.save',{name:'Pulido de prueba',category:'Mantenimiento',catalog:true,price:50000,cost:0});
}
}
const port=Number(process.env.AUREA_QA_PORT||4179);app.server.listen(port,'127.0.0.1',()=>console.log('Áurea · Pruebas visuales efímeras: http://127.0.0.1:'+port));
process.on('SIGINT',()=>app.server.close(()=>{app.store.close();const resolved=path.resolve(directory);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('aurea-visual-'))throw Error('Ruta temporal inesperada.');if(!process.env.AUREA_QA_DB)fs.rmSync(resolved,{recursive:true,force:true});process.exit(0);}));
