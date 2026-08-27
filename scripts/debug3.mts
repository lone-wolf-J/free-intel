const b = 'https://free-intel.vercel.app';

console.log('=== Products Resolve ===');
const p = await fetch(b+'/api/products/resolve', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'ChatGPT'})});
console.log('status:', p.status);
const pd = await p.json();
console.log(JSON.stringify(pd, null, 2).substring(0, 500));

console.log('\n=== Search Alternatives ===');
const s = await fetch(b+'/api/products/search-alternatives', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({tool:'ChatGPT'})});
console.log('status:', s.status);
const sd = await s.json();
console.log(JSON.stringify(sd, null, 2).substring(0, 500));

console.log('\n=== Admin Overview ===');
const a = await fetch(b+'/api/admin/overview');
const ad = await a.json();
console.log('recent_scans count:', (ad as any).recent_scans?.length);
if ((ad as any).recent_scans?.length) {
  const scan = (ad as any).recent_scans[0];
  console.log('first scan keys:', Object.keys(scan));
  console.log('first scan:', JSON.stringify(scan, null, 2).substring(0, 300));
}
