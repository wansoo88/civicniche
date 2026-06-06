import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--no-sandbox','--host-resolver-rules=MAP data.utilverse.info 115.68.230.40'] });
const shots = [
  ['https://data.utilverse.info/', 1200, 'en-desktop.png', false],
  ['https://data.utilverse.info/', 390, 'en-mobile.png', true],
  ['https://data.utilverse.info/ko/', 1200, 'ko-desktop.png', false],
];
for (const [url,w,out,full] of shots){
  const p = await b.newPage({ viewport:{width:w,height:900} });
  await p.goto(url,{waitUntil:'networkidle'});
  await p.screenshot({ path: out, fullPage: full });
  await p.close();
  console.log('saved', out);
}
await b.close();
