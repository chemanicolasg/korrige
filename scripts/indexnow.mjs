// Avisa a los buscadores que usan IndexNow (Bing, Yandex, Seznam, Naver…) de que las
// páginas públicas han cambiado. Google no usa IndexNow: para Google, Search Console.
//   node scripts/indexnow.mjs
const HOST = 'korrige.es';
const KEY = 'f3f91642aacc4e33d0631f3c7cf9aecb'; // debe existir https://korrige.es/<KEY>.txt (public/<KEY>.txt)
// se toman del sitemap publicado, así no hay que mantener la lista a mano
const urls = [...(await (await fetch(`https://${HOST}/sitemap.xml`)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow → ${res.status} ${res.statusText} (${urls.length} URLs)`);
process.exit(res.ok ? 0 : 1);
