import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const OG = resolve('../og');
const b = await chromium.launch({ args:['--no-sandbox'] });
for (const [html,out] of [['og.html','og.png'],['og-ko.html','og-ko.png']]){
  const p = await b.newPage({ viewport:{width:1200,height:630}, deviceScaleFactor:1 });
  await p.goto(pathToFileURL(resolve(OG,html)).href, { waitUntil:'networkidle' });
  await p.screenshot({ path: resolve(OG,out) });
  await p.close();
  console.log('rendered', out);
}
await b.close();
