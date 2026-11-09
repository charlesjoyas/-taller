'use strict';
// Canonical identifiers used by Charles' account module; no balances are inferred here.
function key(name,force=false){const s=String(name||'').trim().toLowerCase();if(!s)return null;if(/zharick|sharick/.test(s))return 'cuenta_sharick';if(s.includes('carlos')&&!s.includes('charles'))return 'cuenta_carlos';if(s.includes('charles joyas'))return 'cuenta_charles_joyas';if(s.includes('efectivo')||s.includes('caja mostrador')||s==='caja')return 'efectivo_caja';if(!force){if(/separe|cr[eé]dito|bizum|pago mixto/.test(s)||['tarjeta','transferencia','transferencia bancaria'].includes(s))return null;if(!/cuenta|cta|banco|bancaria|nequi|daviplata|ahorros|corriente|billetera|wallet/.test(s))return null;}return 'acc_'+s.replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
function nameFor(raw,accountKey){if(accountKey==='efectivo_caja')return 'Efectivo';const names=[...Object.entries(raw.cashShiftLog?.accountBreakdown||{}).map(([n,v])=>v.name||n),...(raw.cashShiftsHistory||[]).flatMap(sh=>Object.entries(sh.accountBreakdown||{}).map(([n,v])=>v.name||n)),...(raw.paymentMethods||[]).map(p=>p.name)];return names.find(n=>key(n,true)===accountKey)||({cuenta_sharick:'Cuenta Sharick',cuenta_carlos:'Cuenta Carlos',cuenta_charles_joyas:'CUENTA CHARLES JOYAS SAS'})[accountKey]||null;}
function recordedCash(record){
 const values={};
 for(const field of ['cashSales','cashExpenses']){
  const raw=record[field],amount=typeof raw==='number'?raw:typeof raw==='string'&&raw.trim()?Number(raw.replace(',','.')):NaN;
  if(Number.isFinite(amount)&&Math.abs(amount)<=1e12)values[field]=amount;
 }
 return Object.keys(values).length?values:null;
}
module.exports={key,nameFor,recordedCash};
