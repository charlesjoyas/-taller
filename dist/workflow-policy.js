'use strict';
const WorkflowPolicy=(()=>{
 const snapshots={cartera:{kind:'cartera',title:'Cartera y mora',description:'Saldos pendientes de tus clientes y seguimiento de cobros.',subject:'clientes',book:'cartera',views:[['cartera','Clientes'],['cartera_aging','Antigüedad de cartera']]},creditos:{kind:'creditos_proveedores',title:'Créditos de proveedores',description:'Obligaciones con proveedores y seguimiento de sus pagos.',subject:'proveedores',book:'creditos',views:[['creditos_proveedores','Proveedores'],['proveedores_aging','Antigüedad de la deuda']]}};
 const routes={
  compras:{kind:'compras',title:'Compras',description:'Entradas de mercancía, facturas y pagos a proveedores.',fields:['query','status','supplierId'],period:'all',purchase:true},
  ventas:{kind:'ventas',title:'Ventas',description:'Ventas registradas, comprobantes y saldos por operación.',fields:['query','status','seller','method'],period:'all',sales:true},
  ...Object.fromEntries(Object.entries(snapshots).map(([key,c])=>[key,{...c,snapshot:true,fields:['query','status'],period:'all'}])),
  reportescompras:{kind:'compras_dashboard',title:'Análisis de compras',description:'Compras por proveedor y evolución del abastecimiento.',fields:['supplierId'],period:'month',book:'compras',views:[['compras_dashboard','Resumen'],['libro_compras','Compras y pagos']]},
  abonos:{kind:'abonos_ventas',title:'Abonos de clientes',description:'Cobros recibidos de clientes, con sus comprobantes y anulaciones.',fields:['query'],period:'month'},
  abonoscompras:{kind:'abonos_compras',title:'Abonos a proveedores',description:'Pagos realizados a proveedores, con sus comprobantes y anulaciones.',fields:['query'],period:'month'},
  finanzas:{kind:'finanzas',title:'Finanzas y resultados',description:'Ventas reconocidas, costos históricos y gastos del periodo.',fields:['category','seller'],period:'month',book:'finanzas',private:true},
  general:{kind:'general',title:'Reporte general',description:'Resultados y movimientos consolidados del negocio.',fields:['category','seller'],period:'month',book:'general',private:true},
  cierres:{kind:'cierres',title:'Historial de caja',description:'Turnos cerrados, conteos y diferencias registradas.',fields:['query'],period:'month'},
  balance:{kind:'balance',title:'Balance general',description:'Activos, obligaciones y patrimonio operativo actual.',fields:[],snapshot:true,period:'all',private:true},
  ranking:{kind:'productos',title:'Ventas por producto',description:'Compara las piezas vendidas durante el periodo.',fields:['category','seller','metric','limit','query'],period:'month',private:true},
  tendencia:{kind:'tendencia',title:'Tendencia por producto',description:'Cantidad e ingresos diarios de una pieza en el periodo.',fields:['productId'],period:'month',private:true},
  periodos:{kind:'mensual',title:'Comparativa mensual',description:'Ventas, costos y resultados de cada mes.',fields:[],period:'year',book:'periodos',private:true},
  radar:{kind:'radar',title:'Radar de stock',description:'Disponibilidad actual y rotación de los últimos 30 días.',fields:['category','query','status','sort'],snapshot:true,period:'all'},
  margen:{kind:'margen',title:'Margen real',description:'Margen del inventario actual y resultados realizados en el periodo.',fields:['category','query'],period:'month',private:true},
  ajustes:{kind:'ajustes_stock',title:'Ajustes de inventario',description:'Variaciones de existencias, motivos y responsables.',fields:['query'],period:'month'},
  flujo:{kind:'flujo',title:'Flujo de fondos',description:'Entradas y salidas registradas en caja y bancos.',fields:['accountId'],period:'month'},
  resumen:{kind:'operaciones',title:'Resumen comercial',description:'Ventas netas, operaciones y ticket promedio.',fields:[],period:'month'},
  adquisiciones:{kind:'adquisiciones',title:'Costo de adquisición',description:'Adquisiciones y gramaje documentados desde el inicio de la operación.',fields:[],snapshot:true,period:'all',private:true},
  comparacion:{kind:'periodos',title:'Comparación de periodos',description:'Contrasta el rango elegido con el periodo anterior de igual duración.',fields:[],period:'month',private:true}
 };
 const presets=[['all','Todo el historial'],['today','Hoy'],['week','Esta semana'],['month','Este mes'],['lastmonth','Mes pasado'],['year','Este año'],['custom','Rango personalizado']];
 function dates(preset,today){const at=new Date(today+'T12:00:00Z'),iso=d=>d.toISOString().slice(0,10);if(preset==='today')return {start:today,end:today};if(preset==='week'){at.setUTCDate(at.getUTCDate()-(at.getUTCDay()+6)%7);return {start:iso(at),end:today};}if(preset==='month')return {start:today.slice(0,7)+'-01',end:today};if(preset==='lastmonth')return {start:iso(new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth()-1,1))),end:iso(new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),0)))};if(preset==='year')return {start:today.slice(0,4)+'-01-01',end:today};return {start:'0001-01-01',end:today};}
 function config(route){const c=routes[route];if(!c)throw Error('Sección desconocida.');return c;}
 function normalize(route,input={},today){const c=config(route),period=c.snapshot?'all':presets.some(([p])=>p===input.period)?input.period:c.period,range=period==='custom'?{start:input.start,end:input.end}:dates(period,today);for(const v of Object.values(range))if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw Error('Selecciona fechas válidas para el periodo.');if(range.start>range.end)throw Error('La fecha inicial debe ser anterior o igual a la final.');const result={period,...range,view:c.views?.some(([v])=>v===input.view)?input.view:c.kind};for(const field of c.fields)if(input[field]!==undefined)result[field]=String(input[field]);return result;}
 function query(route,input,today,exporting=false){const c=config(route),state=normalize(route,input,today),kind=state.view,query={kind,start:state.start,end:state.end};const fields=kind.endsWith('_aging')?[]:c.fields;for(const key of fields)if(state[key])query[key]=state[key];if(exporting)query.export='1';return query;}
 return {routes,presets,config,dates,normalize,query};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=WorkflowPolicy;
