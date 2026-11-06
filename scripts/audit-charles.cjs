'use strict';
// Lee nombres y ubicaciones del original; solamente escribe documentación dentro de Áurea.
const fs=require('node:fs'),path=require('node:path');
const original=path.resolve(__dirname,'../../Charlessjoyas-main/Charlessjoyas-main/js/app.js');
const source=fs.readFileSync(original,'utf8'),lines=source.split(/\r?\n/),methods=[];
const groups=[
['IA',/Ai|Copilot|Typing|AssistantMessage|UserMessage|Clipboard|Cobranza/i,'src/assistant.cjs; dist/app.js; dist/parity.js'],
['Acceso, usuarios y perfiles',/User|Auth|Login|Logout|Password|Permission|Checkbox|Perfiles|Profile|_ghost|_isGhost|Role|Admin/i,'src/database.cjs; src/parity.cjs; dist/app.js; dist/parity.js'],
['Resultados e informes',/Report|Reportes|Rep[A-Z]|Informes|Finanzas|Balance|Ranking|TopProducts|Radar|Tendencia|Comparativa|InfPeriodo|DateSafe|DateInPeriod|COGS|Ledger/i,'src/analytics.cjs; src/domain.cjs; dist/parity.js'],
['Caja y cuentas',/Cash|Caja|Account|OpenCash|CardBase|Shift|Expense/i,'src/domain.cjs; src/parity.cjs; src/analytics.cjs; dist/parity.js'],
['Compras, proveedores y abonos',/Purchase|Compras|Compras|Supplier|Abono|Credit/i,'src/domain.cjs; src/parity.cjs; src/analytics.cjs; dist/parity.js'],
['POS y cobro',/Cart|Checkout|Payment|Paymethod|PayMethod|Mixed|CardFee|Pos|POS|MetalRates|CategoryPills|CategoryFilter|Transaction|FinVentas|Sale|SearchResult/i,'src/domain.cjs; src/parity.cjs; dist/app.js; dist/parity.js'],
['Inventario y catálogo',/Product|Inventory|Category|Categorias|Asset|Activos|Service|Servicios|Measure|Weight|Stock|Grams/i,'src/domain.cjs; src/parity.cjs; dist/app.js; dist/parity.js'],
['Clientes',/Customer|Cartera/i,'src/domain.cjs; src/parity.cjs; src/analytics.cjs; dist/parity.js'],
['Comprobantes y exportaciones',/Receipt|Ticket|Thermal|Print|Excel|CSV|Workbook|Xml/i,'src/analytics.cjs; dist/app.js; dist/parity.js'],
['Persistencia y sincronización',/Persist|Realtime|Remote|sanitizeLoaded|syncAll|Ordered|UniqueId|SequentialId/i,'src/database.cjs; server.cjs; dist/offline.js; dist/service-worker.js'],
['Identidad y navegación',/Brand|Theme|Font|Logo|Config|View|Navigation|Sidebar|Mobile|Scroll|Home|Modal|Toast|Chart|Dashboard|GlobalSearch|Keyboard/i,'dist/styles.css; dist/app.js; dist/parity.js'],
];
for(let i=0;i<lines.length;i++){const match=lines[i].match(/^  (?:async )?([\w$]+)\([^;]*\) \{/);if(!match)continue;const name=match[1],entry=groups.find(([,pattern])=>pattern.test(name));methods.push({method:name,line:i+1,group:entry?.[0]||'Utilidades de interfaz',equivalent:entry?.[2]||'dist/app.js; dist/icons.js; src/domain.cjs',note:/ghost/i.test(name)?'Se reemplaza el acceso oculto del original por administrador creado por el dueño y permisos del servidor.':/\{\s*\}/.test(lines[i])?'Método sin implementación en el original; su efecto se cubre en los componentes actuales.':'Equivalencia por capacidad; no se copia el algoritmo interno ni los datos del original.'});}
const output=path.resolve(__dirname,'..','INVENTARIO-METODOS-CHARLES.json');
fs.writeFileSync(output,JSON.stringify({source:'Charles / js/app.js (solo lectura)',generatedAt:new Date().toISOString(),methodCount:methods.length,scope:'Métodos identificados y agrupados. El estado verificable de cada capacidad se documenta en PARIDAD-FUNCIONAL.md; esta clasificación no sustituye pruebas de cada método interno.',methods},null,2));
console.log(JSON.stringify({methods:methods.length,groups:Object.fromEntries([...new Set(methods.map(m=>m.group))].map(g=>[g,methods.filter(m=>m.group===g).length]))},null,2));
