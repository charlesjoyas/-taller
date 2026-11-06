'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../dist/workflow-policy.js');
const today='2026-10-28';
test('cartera y proveedores no pueden cambiar a informes ajenos ni heredar filtros de compras',()=>{
 const malicious={kind:'compras',view:'creditos_proveedores',period:'custom',start:'2020-01-01',end:'2020-02-01',seller:'otro',category:'Oro',supplierId:'proveedor',query:'Cliente',status:'Vencido'};
 assert.deepEqual(P.query('cartera',malicious,today),{kind:'cartera',start:'0001-01-01',end:today,query:'Cliente',status:'Vencido'});
 assert.equal(P.query('creditos',{view:'cartera'},today).kind,'creditos_proveedores');
 assert.equal(P.query('cartera',{view:'cartera_aging',query:'no aplicar',status:'Vencido'},today).query,undefined);
});
test('periodos se resuelven a fechas reales y el rango personalizado se valida antes de consultar',()=>{
 assert.deepEqual(P.dates('week',today),{start:'2026-10-26',end:today});assert.deepEqual(P.dates('lastmonth',today),{start:'2026-09-01',end:'2026-09-30'});
 assert.deepEqual(P.dates('lastmonth','2024-03-12'),{start:'2024-02-01',end:'2024-02-29'});
 assert.throws(()=>P.normalize('compras',{period:'custom',start:'2026-02-30',end:today},today),/fechas válidas/);
 assert.throws(()=>P.normalize('compras',{period:'custom',start:'2026-10-29',end:today},today),/inicial/);
});
test('cada pantalla conserva su estado y exporta exactamente los filtros aplicados',()=>{
 const compras=P.normalize('compras',{period:'custom',start:'2026-09-01',end:'2026-09-30',supplierId:'s1',status:'pending',query:'Factura'},today),cartera=P.normalize('cartera',{query:'Ana'},today);
 const query=P.query('compras',compras,today),exported=P.query('compras',compras,today,true);assert.deepEqual(exported,{...query,export:'1'});
 assert.equal(cartera.start,'0001-01-01');assert.equal(cartera.end,today);assert.equal(cartera.supplierId,undefined);assert.equal(compras.start,'2026-09-01');
});
test('abonos de cada lado tienen una única fuente y compras solo admite vistas de compras',()=>{
 assert.equal(P.query('abonos',{view:'abonos_compras'},today).kind,'abonos_ventas');assert.equal(P.query('abonoscompras',{view:'abonos_ventas'},today).kind,'abonos_compras');
 assert.equal(P.query('reportescompras',{view:'cartera'},today).kind,'compras_dashboard');assert.equal(P.query('reportescompras',{view:'libro_compras'},today).kind,'libro_compras');
});
test('el libro de compras excluye los cobros de clientes y los filtros se aplican al listado',()=>{
 const D=require('../src/domain.cjs'),S=require('../src/parity.cjs').normalize(D.initialState()),A=require('../src/analytics.cjs'),R=require('../src/audit-reports.cjs');
 S.purchases=[{id:'P1',date:today,createdAt:today+'T12:00:00Z',supplierId:'s1',supplier:'Proveedor 1',invoice:'F1',total:100,payments:[],product:'Pieza',qty:1},{id:'P2',date:today,createdAt:today+'T12:00:00Z',supplierId:'s2',supplier:'Proveedor 2',invoice:'F2',total:200,payments:[{id:'ab',amount:200,createdAt:today+'T12:00:00Z'}],product:'Pieza',qty:1}];
 assert.deepEqual(A.build(S,'compras',{supplierId:'s1',status:'pending'}).rows.map(r=>r[1]),['P1']);
 assert.equal(A.build(S,'compras',{supplierId:'s1',status:'paid'}).rows.length,0);
 const book=R.workbook(S,'compras',{}, {role:'Superadministrador'});assert.deepEqual(book.sheets.map(s=>s.name),['Compras','Pagos proveedores','Saldos proveedores']);
});
