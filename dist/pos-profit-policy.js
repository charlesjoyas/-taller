'use strict';
const PosProfitPolicy={
 canView:user=>['Administrador','Superadministrador'].includes(user?.role),
 calculate(items,products){
  if(!items.length)return {status:'empty'};
  let sale=0,cost=0,missingCost=false,zeroCost=false,pending=false;
  for(const item of items){const product=products.find(p=>p.id===item.productId),q=Number(item.qty),price=Number(item.unitPrice),discount=Number(item.discount||0);
   if(!product||!Number.isFinite(q)||q<=0||(product.measureType==='Unidades'&&!Number.isInteger(q))||q>product.stock||!Number.isFinite(price)||price<0||!Number.isSafeInteger(discount)||discount<0)return {status:'invalid'};
   const gross=Math.round(q*price);if(price===0){pending=true;if(discount>0)return {status:'invalid'};}else if(discount>=gross)return {status:'invalid'};
   sale+=gross-discount;
   if(typeof product.cost!=='number'||!Number.isFinite(product.cost)||product.cost<0)missingCost=true;else{cost+=Math.round(q*product.cost);zeroCost=zeroCost||product.cost===0;}
  }
  if(missingCost)return {status:'missing-cost',sale};
  const profit=sale-cost;return {status:pending?'pending':'ready',sale,cost,profit:pending?null:profit,margin:pending||!sale?null:profit/sale*100,loss:!pending&&profit<0,zeroCost};
 },
 quote(row,product,values){const qty=Number(values.qty),unitPrice=values.lineTotal?Number((Number(values.lineTotal)/qty).toFixed(6)):Math.round(Number(values.rate)*(product.measureType==='Pesaje'?1:product.weight||1));return {...row,qty,unitPrice};}
};
if(typeof module!=='undefined')module.exports=PosProfitPolicy;
