
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');

test('POS muestra el stock con precio pendiente y habilita el pago al fijar un precio válido',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8');
  const product={id:'piece',sku:'001',name:'Cadena lazo',active:true,measureType:'Pesaje',stock:2.08,weight:2.08,price:0};
  const out={...product,id:'out',sku:'010',stock:0,weight:1.54};
  const appState={category:'Todos',cart:[{productId:product.id,qty:1,unitPrice:0,discount:0}]};
  const checkoutButton={disabled:true};
  const total={textContent:''};
  const price={value:'',dataset:{unitPrice:'0'}};
  const qty={value:'1',dataset:{cartQty:'0'}};
  const discount={value:'0',dataset:{discount:'0'}};
  let input;
  const document={
    addEventListener(_type,handler){input=handler;},
    querySelector(selector){return selector==='[data-action=checkout]'?checkoutButton:selector==='.cart-summary .grand span:last-child'?total:null;},
    querySelectorAll(selector){return {'[data-cart-qty]':[qty],'[data-unit-price]':[price],'[data-discount]':[discount]}[selector]||[];}
  };
  const ctx=vm.createContext({appState,document,allowed:()=>true,esc:String,jewel:()=>'',money:n=>'$ '+n,grams:n=>n.toFixed(2).replace('.',',')+' g',countLabel:p=>p.stock.toFixed(2).replace('.',',')+' g',data:()=>({products:[product,out],customers:[],suppliers:[],settings:{}}),select:()=>'',icon:()=>''});
  const catalog=source.slice(source.indexOf('function posWeightLabel('),source.indexOf('function productForm('));
  const update=source.slice(source.indexOf('function syncCartFields('),source.indexOf('\n',source.indexOf("document.addEventListener('input',e=>{if(e.target.matches('[data-cart-qty]")));
  vm.runInContext(catalog+'\n'+update+'\nresult={catalog,cartView};',ctx);
  const rendered=ctx.result.catalog();
  assert.match(rendered,/Disponible: 2,08 g/);
  assert.match(rendered,/Precio por definir/);
  assert.match(rendered,/data-add="out" disabled/);
  assert.match(rendered,/Peso de referencia: 1,54 g/);
  assert.doesNotMatch(rendered,/\$ 0 \/ g/);
  assert.match(ctx.result.cartView(),/Gramos a vender/);
  assert.match(ctx.result.cartView(),/data-action="checkout" disabled/);
  const edit=()=>input({target:{matches:()=>true,closest:()=>null}});
  price.value='450000';
  edit();
  assert.equal(total.textContent,'$ 450000');
  assert.equal(checkoutButton.disabled,false);
  price.value='';
  edit();
  assert.equal(checkoutButton.disabled,true);
});

