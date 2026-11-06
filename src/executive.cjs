'use strict';
const D=require('./domain.cjs');
const A=require('./analytics.cjs');
const day=v=>new Date(v).toLocaleDateString('en-CA',{timeZone:'America/Bogota'});
function build(s,f={},privatePanel=false){
 const {start,end}=A.range(f),sales=s.sales.filter(o=>!o.voidedAt&&o.recognizedAt&&day(o.recognizedAt)>=start&&day(o.recognizedAt)<=end);
 if(privatePanel)require('./migration-costs.cjs').assertKnown(s,start,end);const products=s.products.filter(p=>p.active&&!p.categoryReserve),grams=products.reduce((n,p)=>n+(p.isExtra?0:p.measureType==='Pesaje'?p.stock:p.weight*p.stock),0);
 const cost=products.reduce((n,p)=>n+p.stock*p.cost,0),metalCost=products.filter(p=>!p.isExtra&&(p.measureType==='Pesaje'||p.weight>0)).reduce((n,p)=>n+p.stock*p.cost,0);
 const categories=new Map(),sellers=new Map(),payments=new Map(),months=new Map();
 for(const o of sales){const seller=sellers.get(o.userId)||{name:o.cashier||'Sin vendedor',revenue:0,transactions:0};seller.revenue+=o.total-(o.tax||0);seller.transactions++;sellers.set(o.userId,seller);
  for(const i of o.items){const name=s.products.find(p=>p.id===i.productId)?.category||'Sin categoría';categories.set(name,(categories.get(name)||0)+i.lineTotal);}
 }
 for(const o of s.sales.filter(o=>!o.voidedAt))for(const p of o.payments.filter(p=>!p.voidedAt&&day(p.createdAt)>=start&&day(p.createdAt)<=end)){const name=p.methodName||p.method;payments.set(name,(payments.get(name)||0)+p.amount);}
 const report=D.report(s,start,end),result={start,end,summary:{revenue:report.netSales,transactions:report.transactions,ticket:report.transactions?Math.round(report.netSales/report.transactions):0,customers:s.customers.filter(c=>c.active!==false).length,suppliers:s.suppliers.filter(c=>c.active!==false).length,services:s.services.filter(o=>!o.archivedAt&&!['Entregado','Cancelado'].includes(o.status)).length,grams:D.round(grams),references:products.length,lowStock:products.filter(p=>p.stock<=p.minStock).length},categories:[...categories].map(([name,value])=>({name,value})),sellers:[...sellers.values()].sort((a,b)=>b.revenue-a.revenue),payments:[...payments].map(([name,value])=>({name,value}))};
 if(privatePanel){const keys=new Set([...sales.map(o=>day(o.recognizedAt).slice(0,7)),...s.movements.filter(m=>m.kind==='expense'&&m.date>=start&&m.date<=end).map(m=>m.date.slice(0,7))]);for(const key of [...keys].sort()){const last=new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5)),0)).toISOString().slice(0,10);const r=D.report(s,key+'-01'>start?key+'-01':start,last<end?last:end);months.set(key,{month:key,revenue:r.netSales,cost:r.cost,expenses:r.expenses,gross:r.grossProfit,profit:r.operatingProfit,margin:r.netSales?r.operatingProfit/r.netSales*100:0});}const retail=products.reduce((n,p)=>n+p.stock*D.effectivePrice(s,p),0);Object.assign(result,{profit:{...report,netMargin:report.netSales?report.operatingProfit/report.netSales*100:0},inventory:{cost:Math.round(cost),retail:Math.round(retail),potential:Math.round(retail-cost),averagePerGram:grams?Math.round(metalCost/grams):0},months:[...months.values()],top:A.products(s,f).slice(0,10)});}
 return result;
}
module.exports={build};
