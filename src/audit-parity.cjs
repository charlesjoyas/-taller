'use strict';
const D=()=>require('./domain.cjs');
function before(s,cmd,b,user){const d=D();b={...b};if(['sale.void','sale.payment','sale.deliver','purchase.void','purchase.pay','purchase.receive','payment.reverse','expense.delete','expense.save','account.adjust.void'].includes(cmd)){const r=[...s.sales,...s.purchases,...s.movements].find(x=>x.id===b.id);if(r?.importedHistorical||r?.consolidated&&['sale.void','purchase.void'].includes(cmd)||r?.imported&&['expense.delete','expense.save'].includes(cmd))d.fail('Este documento histórico se conserva con sus vínculos de origen. Gestiona el saldo desde el crédito consolidado o registra una corrección nueva.',409);}
 if(cmd==='payment.void'){const parent=[...s.sales,...s.purchases].find(x=>x.id===b.parentId),pay=parent?.payments?.find(x=>x.id===b.id);if(pay?.imported)d.fail('El abono histórico se conserva como parte del origen. Registra una corrección nueva con soporte.',409);}
 if(cmd==='movement.create'&&b.kind==='expense')d.requirePermission(user,'gastos','crear');
 if(cmd==='service.save')b._previousServiceStatus=s.services.find(x=>x.id===b.id)?.status||null;
 if(cmd==='service.save'&&b.customerId&&b.catalog!==true){d.requirePermission(user,'crm');if(!require('./crm.cjs').visible(s,user,b.customerId))d.fail('Este cliente no está asignado a tu cuenta.',403);b.customer=d.find(s.customers,b.customerId,'Cliente').name;}
 if(cmd==='service.save'&&b.catalog===true){b.customer=b.customer||'Servicio de catálogo';b.status=b.status||'Activo';b.dueDate=b.dueDate||null;b.cost=Number(b.cost||0);}
 if(cmd==='asset.save'&&b.status==='Inactivo')b.value=Number(b.value??0);
 if(cmd==='sale.create'&&b.paymentMethodId){const method=s.paymentMethods.find(m=>m.id===b.paymentMethodId);if(!method)d.fail('El medio de pago ya no existe.');if(method.accountId&&Array.isArray(b.payments))b.payments=b.payments.map(p=>p.method===method.channel&&p.method!=='cash'?{...p,accountId:p.accountId||method.accountId}:p);}
 return b;
}
function after(s,cmd,b,result,user){const d=D(),short=(v,n=180)=>String(v||'').trim().slice(0,n);
 if(cmd==='product.save'&&result.barcode&&s.products.some(p=>p.id!==result.id&&p.barcode===result.barcode))d.fail('El código de barras ya está registrado.');
 if(cmd==='contact.save'&&b.kind==='supplier'){for(const k of ['bank','accountNumber','accountType'])if(b[k]!==undefined)result[k]=short(b[k],k==='accountNumber'?80:120);}
 if(cmd==='service.save'){result.category=short(b.category||result.category||'Taller',100);result.catalog=b.catalog===true;}
 if(cmd==='asset.save'){result.category=short(b.category||result.category||'General',100);result.costValue=b.costValue===undefined?result.costValue??result.value:d.amount(Number(b.costValue),'Costo de adquisición',true);result.status=b.status==='Inactivo'?'Inactivo':'Activo';}
 if(cmd==='role.save'){result.description=short(b.description,500);}
 if(cmd==='paymentmethod.save'){
  if(b.accountId){const a=d.find(s.accounts,b.accountId,'Cuenta');if(a.active===false)d.fail('La cuenta está inactiva.');result.accountId=a.id;}
  if(b.createAccount===true){d.requirePermission(user,'config','editar');if(!['transfer','card'].includes(result.channel))d.fail('Solo un medio bancario puede crear una cuenta.');const account=d.apply(s,'account.save',{name:result.name,opening:Number(b.opening||0)},user);result.accountId=account.id;}
 }
 if(cmd==='product.adjust'){s.stockAdjustments??=[];s.stockAdjustments.push({...result,productId:result.id,createdAt:d.now(),userId:user.id,userName:user.name});}
 if(cmd==='category.adjust'){s.stockAdjustments??=[];s.stockAdjustments.push({...result,productId:result.id,category:b.name,createdAt:d.now(),userId:user.id,userName:user.name});}
 return result;
}
function apply(s,cmd,b,user){const d=D();
 switch(cmd){
 case'account.activate':{d.requirePermission(user,'config','editar');const a=d.find(s.accounts,b.id,'Cuenta');a.active=true;return a;}
 case'account.opening':{d.requirePermission(user,'config','editar');const a=d.find(s.accounts,b.id,'Cuenta');if(s.movements.some(m=>m.accountId===a.id))d.fail('La cuenta tiene movimientos. Usa un ajuste para corregir su saldo.');a.opening=d.amount(Number(b.opening),'Saldo inicial',true);return a;}
 case'service.activate':case'asset.activate':{const service=cmd==='service.activate';d.requirePermission(user,service?'servicios':'activos','editar');const item=d.find(service?s.services:s.assets,b.id,'Registro');delete item.archivedAt;item.status=service?(item.catalog?'Activo':'Recibido'):'Activo';return item;}
 case'category.reference.adjust':{d.requirePermission(user,'categorias','editar');if(!s.categories.includes(b.name))d.fail('Categoría inexistente.');const details=s.categoryDetails[b.name],value=d.amount(Number(b.cost),'Costo de referencia',true);details.cost=value;return {id:b.name,cost:value};}
 case'contact.opening.void':{const supplier=b.kind==='supplier';d.requirePermission(user,supplier?'creditos':'cartera','eliminar');const o=d.find(supplier?s.purchases:s.sales,b.id,'Saldo inicial');if(!o.opening||o.voidedAt)d.fail('El saldo inicial no es reversible.');if(d.paid(o)>0)d.fail('Revierte primero los abonos de ese saldo inicial.');o.voidReason=d.text(b.reason,'Motivo');o.voidedAt=d.now();return o;}
 default:d.fail('Operación desconocida.',404);
 }
}
module.exports={before,after,apply};
