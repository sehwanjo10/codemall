/*
 * 식단표 재료마다 쿠팡 검색 결과를 파트너스 링크로 바꿔 page/04/links.js 에 저장한다.
 * 키는 사이트에 들어가지 않는다 — 이 스크립트는 내 컴퓨터에서만 돌린다.
 *
 *   1) .env.example 을 .env 로 복사하고 키를 채운다
 *   2) node tools/coupang_links.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
process.loadEnvFile(path.join(ROOT, '.env'));
const { COUPANG_ACCESS_KEY: ACCESS, COUPANG_SECRET_KEY: SECRET } = process.env;
if (!ACCESS || !SECRET) throw new Error('.env 에 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 를 넣어주세요');

/* 재료 이름 그대로 검색하면 엉뚱한 게 나오는 경우만 검색어를 바꾼다 */
const SEARCH_WORD = {
  // '쌀': '백미 10kg',
};

const API_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
const BATCH = 20;

function authHeader(method, apiPath) {
  const d = new Date().toISOString();                  // 2026-09-24T12:34:56.789Z
  const signedDate = d.slice(2, 10).replace(/-/g, '') + 'T' + d.slice(11, 19).replace(/:/g, '') + 'Z';
  const signature = crypto.createHmac('sha256', SECRET)
    .update(signedDate + method + apiPath)
    .digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${ACCESS}, signed-date=${signedDate}, signature=${signature}`;
}

async function deeplinks(urls) {
  const res = await fetch('https://api-gateway.coupang.com' + API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader('POST', API_PATH) },
    body: JSON.stringify({ coupangUrls: urls }),
  });
  const json = await res.json();
  if (json.rCode !== '0') throw new Error(`쿠팡 API 오류: ${JSON.stringify(json)}`);
  return json.data;
}

/* data.js 에서 재료 이름만 뽑는다 ('소고기(국거리)' → '소고기') */
function ingredientNames() {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'page/04/data.js'), 'utf8') + ';this.DISHES = DISHES;', ctx);
  const names = new Set(['쌀']);
  ctx.DISHES.forEach(d => d.ing.forEach(([n]) => names.add(n.replace(/\s*\(.+\)\s*$/, ''))));
  return [...names];
}

const searchUrl = name =>
  'https://www.coupang.com/np/search?q=' + encodeURIComponent(SEARCH_WORD[name] || name);

const names = ingredientNames();
const links = {};
for (let i = 0; i < names.length; i += BATCH) {
  const chunk = names.slice(i, i + BATCH);
  const data = await deeplinks(chunk.map(searchUrl));
  chunk.forEach((name, j) => { links[name] = data[j].shortenUrl; });
  console.log(`${Math.min(i + BATCH, names.length)} / ${names.length}`);
  await new Promise(r => setTimeout(r, 1000));
}

fs.writeFileSync(path.join(ROOT, 'page/04/links.js'),
`/* 재료 → 쿠팡 파트너스 링크. tools/coupang_links.mjs 가 만든다.
   여기에 없는 재료는 일반 쿠팡 검색으로 연결된다. */
const ING_LINKS = ${JSON.stringify(links, null, 2)};
`);
console.log(`page/04/links.js 에 ${Object.keys(links).length}개 저장했습니다.`);
