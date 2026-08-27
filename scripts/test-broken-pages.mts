const base = 'https://free-intel.vercel.app';

console.log('=== products/resolve ===');
const r1 = await fetch(`${base}/api/products/resolve`, {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({name:'Claude'})
});
console.log('status:', r1.status);
const d1 = await r1.json();
console.log(JSON.stringify(d1, null, 2).slice(0, 500));

console.log('\n=== cost/analyze ===');
const r2 = await fetch(`${base}/api/cost/analyze`, {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({tools:[{name:'Notion',monthly_cost:10}]})
});
console.log('status:', r2.status);
const d2 = await r2.json();
console.log(JSON.stringify(d2, null, 2).slice(0, 500));

console.log('\n=== stacks/generate ===');
const r3 = await fetch(`${base}/api/stacks/generate`, {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({goal:'Create chatting tool'})
});
console.log('status:', r3.status);
const d3 = await r3.json();
console.log(JSON.stringify(d3, null, 2).slice(0, 500));

console.log('\n=== capabilities ===');
const r4 = await fetch(`${base}/api/capabilities`);
console.log('status:', r4.status);
const d4 = await r4.json();
console.log(JSON.stringify(d4, null, 2).slice(0, 500));
