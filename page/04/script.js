/* ============================================================
   우리 아이 식단표 — 생성 로직
   ============================================================ */

const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

/* 인앱 브라우저(인스타 등)에서 storage 접근이 막혀도 죽지 않도록 */
const safeStore = {
  get(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* 무시 */ }
  },
};

const PERIODS = [
  { days: 1,  label: '하루' },
  { days: 3,  label: '3일' },
  { days: 7,  label: '1주일' },
  { days: 28, label: '4주' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* 사용자가 고른 조건 */
const state = {
  age: '2',
  month: new Date().getMonth() + 1,
  days: 7,
  meals: ['d', 's'],
  focus: 'growth',
  allergens: [],
  dislikes: [],
};

/* ---------- 유틸 ---------- */

function seasonOfMonth(month) {
  return Object.keys(SEASONS).find(key => SEASONS[key].months.includes(month));
}

function focusKeys() {
  return (FOCUS_PRESETS.find(f => f.code === state.focus) || FOCUS_PRESETS[0]).keys;
}

/* 조건에 맞는 메뉴만 남긴다 */
function isEligible(dish, mealCode) {
  if (!dish.meals.includes(mealCode)) return false;
  if (!dish.ages.includes(state.age)) return false;

  const season = seasonOfMonth(state.month);
  if (dish.seasons !== '*' && !dish.seasons.includes(season)) return false;

  if (dish.al.some(code => state.allergens.includes(code))) return false;

  if (state.dislikes.length) {
    const haystack = dish.name + ' ' + dish.ing.map(i => i[0]).join(' ');
    if (state.dislikes.some(word => haystack.includes(word))) return false;
  }
  return true;
}

/* 끼니별로 역할(one/soup/main/side)에 따라 나눠 담은 풀 */
function buildPools(mealCode) {
  const pools = { one: [], soup: [], main: [], side: [] };
  DISHES.forEach(dish => {
    if (isEligible(dish, mealCode)) pools[roleOf(dish)].push(dish);
  });
  return pools;
}

/* 포커스 영양소를 얼마나 채워주는지 (0~3) */
function focusScore(dish) {
  const keys = focusKeys();
  const sum = keys.reduce((acc, key) => acc + (dish.nu[key] || 0), 0);
  return sum / keys.length;
}

/* '소고기(국거리)' → '소고기'. 같은 재료인지 비교할 때 쓴다. */
function baseIngredient(name) {
  const match = name.match(/^(.+?)\s*\(.+\)\s*$/);
  return match ? match[1] : name;
}

/* 한 상에 겹쳐 보이는지 판단할 때 쓰는 이름 ('미역줄기' → '미역') */
function ingredientFamily(name) {
  const base = baseIngredient(name);
  return ING_FAMILY[base] || base;
}

/*
 * 풀에서 한 접시를 고른다.
 * - 포커스 영양소 점수가 높을수록 유리
 * - 최근에 나왔던 메뉴일수록 강한 감점 (같은 메뉴 반복 방지)
 * - 같은 끼니에 이미 쓴 재료가 겹치면 강한 감점
 *   (두부국 + 두부조림 + 두부무침 같은 한 상이 나오지 않도록)
 * - 약간의 난수를 섞어 매번 다른 조합이 나오게 한다
 */
function pickDish(pool, used, slot, gap, usedIng) {
  if (!pool.length) return null;

  let best = null;
  let bestScore = -Infinity;

  pool.forEach(dish => {
    const lastUsed = used[dish.name];
    const distance = lastUsed === undefined ? Infinity : slot - lastUsed;

    let score = focusScore(dish) * 2 + Math.random() * 2.2;
    if (distance < gap) score -= (gap - distance) * 3;

    if (usedIng && usedIng.size) {
      const clash = dish.ing.filter(([name, cat]) =>
        cat !== 'etc' && usedIng.has(ingredientFamily(name))).length;
      score -= clash * 5;
    }

    if (score > bestScore) {
      bestScore = score;
      best = dish;
    }
  });

  used[best.name] = slot;
  if (usedIng) {
    best.ing.forEach(([name, cat]) => {
      if (cat !== 'etc') usedIng.add(ingredientFamily(name));
    });
  }
  return best;
}

/* 한 끼를 구성한다. 반환: { dishes: [...], rice: bool } */
function composeMeal(pools, mealCode, used, slot) {
  const dishes = [];
  const usedIng = new Set(); // 이 끼니에 이미 쓴 재료
  let rice = false;

  if (mealCode === 's') {
    const snack = pickDish(pools.main.concat(pools.one, pools.side), used, slot, 6, null);
    if (snack) dishes.push(snack);
    return { dishes, rice };
  }

  /* 아침은 간단하게, 점심·저녁은 밥+국+반찬 상차림 비중을 높인다 */
  const oneDishChance = mealCode === 'b' ? 0.75 : 0.45;
  const wantOneDish = Math.random() < oneDishChance;

  if (wantOneDish && pools.one.length) {
    dishes.push(pickDish(pools.one, used, slot, 5, usedIng));
    if (mealCode !== 'b' && pools.side.length) {
      dishes.push(pickDish(pools.side, used, slot, 4, usedIng));
    }
  } else if (pools.main.length || pools.soup.length) {
    /* 밥 + 국 + 반찬 상차림 */
    rice = true;
    const soup = pickDish(pools.soup, used, slot, 4, usedIng);
    if (soup) dishes.push(soup);

    const main = pickDish(pools.main, used, slot, 5, usedIng);
    if (main) dishes.push(main);

    if (pools.side.length) {
      dishes.push(pickDish(pools.side, used, slot, 4, usedIng));
    }
  } else if (pools.one.length) {
    dishes.push(pickDish(pools.one, used, slot, 5, usedIng));
  }

  return { dishes: dishes.filter(Boolean), rice };
}

/* 전체 식단 생성. 반환: [{ date, meals: { b: {...}, d: {...} } }, ...] */
function generatePlan() {
  const poolsByMeal = {};
  state.meals.forEach(code => { poolsByMeal[code] = buildPools(code); });

  /*
   * 최근 사용 기록은 네 끼니가 모두 함께 쓴다.
   * 끼니마다 따로 두면 같은 날 점심과 저녁에 같은 메뉴가 그대로 나오거나,
   * 아침에 낸 메뉴가 간식으로 또 나온다.
   */
  const used = {};

  const today = new Date();
  const plan = [];

  for (let i = 0; i < state.days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const meals = {};
    state.meals.forEach(code => {
      meals[code] = composeMeal(poolsByMeal[code], code, used, i);
    });
    plan.push({ date, meals });
  }
  return plan;
}

/*
 * 고른 조건으로 만들 수 있는 메뉴가 충분한지 확인.
 * 기간이 길수록 더 많은 메뉴가 필요하므로 일수를 함께 본다.
 */
function checkCoverage() {
  const problems = [];
  const need = Math.min(state.days, 7);

  state.meals.forEach(code => {
    const pools = buildPools(code);
    const label = MEAL_TYPES.find(m => m.code === code).label;

    if (code === 's') {
      const total = pools.one.length + pools.main.length + pools.side.length;
      if (total === 0) problems.push(`${label}으로 낼 수 있는 메뉴가 하나도 없습니다.`);
      else if (total < need) problems.push(`${label} 메뉴가 ${total}가지뿐이라 자주 반복됩니다.`);
      return;
    }

    const primary = pools.one.length + pools.main.length;
    if (primary === 0) {
      problems.push(`${label}으로 낼 수 있는 메뉴가 하나도 없습니다.`);
      return;
    }
    if (primary < need) {
      problems.push(`${label} 메인 메뉴가 ${primary}가지뿐이라 자주 반복됩니다.`);
    }
    if (pools.one.length === 0 && pools.soup.length === 0) {
      problems.push(`${label}에 곁들일 국이 없어 반찬만 나옵니다.`);
    }
  });
  return problems;
}

/* ---------- 장보기 목록 ---------- */

/*
 * 장보기 목록을 만든다.
 * '소고기(국거리)'와 '소고기(다짐)'처럼 괄호만 다른 재료는 하나로 합쳐서
 * "소고기 5회 · 국거리, 다짐"처럼 보여준다. 마트에서 한 번에 사기 위함.
 */
function buildShoppingList(days) {
  const items = new Map(); // "기본이름|카테고리" -> { base, cat, count, cuts:Set }

  const add = (rawName, cat) => {
    const match = rawName.match(/^(.+?)\s*\((.+)\)\s*$/);
    const base = match ? match[1] : rawName;
    const cut  = match ? match[2] : null;

    const key = base + '|' + cat;
    if (!items.has(key)) items.set(key, { base, cat, count: 0, cuts: new Set() });
    const item = items.get(key);
    item.count += 1;
    if (cut) item.cuts.add(cut);
  };

  days.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      if (meal.rice) add('쌀', 'grain');
      meal.dishes.forEach(dish => dish.ing.forEach(([name, cat]) => add(name, cat)));
    });
  });

  const grouped = {};
  items.forEach(item => {
    (grouped[item.cat] = grouped[item.cat] || []).push({
      name: item.base,
      count: item.count,
      cuts: Array.from(item.cuts),
    });
  });

  Object.values(grouped).forEach(list => list.sort((a, b) => b.count - a.count));
  return grouped;
}

/* ---------- 렌더링 ---------- */

function nutrientTags(dish) {
  return focusKeys()
    .filter(key => (dish.nu[key] || 0) >= 3)
    .slice(0, 2)
    .map(key => `<span class="nu-tag">${NUTRIENTS[key]}</span>`)
    .join('');
}

function renderDish(dish) {
  return `<li class="dish">
      <span class="dish-emoji">${dish.emoji}</span>
      <span class="dish-name">${dish.name}</span>
      ${nutrientTags(dish)}
    </li>`;
}

function renderDayCard(day, index) {
  const dateLabel = `${day.date.getMonth() + 1}월 ${day.date.getDate()}일`;
  const weekday = WEEKDAYS[day.date.getDay()];
  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

  const mealsHtml = MEAL_TYPES
    .filter(type => state.meals.includes(type.code))
    .map(type => {
      const meal = day.meals[type.code];
      if (!meal || !meal.dishes.length) return '';
      const riceItem = meal.rice
        ? `<li class="dish dish-rice"><span class="dish-emoji">🍚</span><span class="dish-name">밥</span></li>`
        : '';
      return `<div class="meal">
          <div class="meal-label">${type.emoji} ${type.label}</div>
          <ul class="dish-list">${riceItem}${meal.dishes.map(renderDish).join('')}</ul>
        </div>`;
    })
    .join('');

  return `<article class="day-card${isWeekend ? ' weekend' : ''}">
      <header class="day-head">
        <span class="day-index">${index + 1}일차</span>
        <span class="day-date">${dateLabel} <b>${weekday}</b></span>
      </header>
      ${mealsHtml}
    </article>`;
}

function renderShoppingList(grouped) {
  const sections = Object.keys(ING_CATEGORIES)
    .filter(cat => grouped[cat] && grouped[cat].length)
    .map(cat => {
      const meta = ING_CATEGORIES[cat];
      const items = grouped[cat]
        .map(item => `<li><label class="buy-item">
            <input type="checkbox">
            <span class="buy-name">${item.name}</span>
            ${item.count > 1 ? `<span class="buy-count">${item.count}회</span>` : ''}
            ${item.cuts.length ? `<span class="buy-cut">${item.cuts.join(', ')}</span>` : ''}
          </label></li>`)
        .join('');
      return `<div class="buy-group">
          <h4>${meta.emoji} ${meta.label}</h4>
          <ul>${items}</ul>
        </div>`;
    })
    .join('');

  return `<section class="shopping">
      <h3>🛒 이만큼만 사시면 됩니다</h3>
      <p class="shopping-desc">옆의 숫자는 이 기간에 그 재료가 쓰이는 횟수예요. 장바구니에 담으면서 체크해 보세요.</p>
      ${sections}
    </section>`;
}

function renderPlan(plan) {
  const chunks = [];
  for (let i = 0; i < plan.length; i += 7) chunks.push(plan.slice(i, i + 7));

  const html = chunks.map((chunk, weekIndex) => {
    const heading = chunks.length > 1
      ? `<h2 class="week-title">${weekIndex + 1}주차</h2>`
      : '';
    return `<section class="week">
        ${heading}
        <div class="day-grid">
          ${chunk.map((day, i) => renderDayCard(day, weekIndex * 7 + i)).join('')}
        </div>
        ${renderShoppingList(buildShoppingList(chunk))}
      </section>`;
  }).join('');

  $('#planOutput').innerHTML = html;
}

function renderResultTags() {
  const age    = AGE_GROUPS.find(a => a.code === state.age);
  const focus  = FOCUS_PRESETS.find(f => f.code === state.focus);
  const period = PERIODS.find(p => p.days === state.days);
  const season = SEASONS[seasonOfMonth(state.month)];

  const tags = [
    `👶 ${age.label}`,
    `🗓️ ${state.month}월 (${season.label})`,
    `⏳ ${period ? period.label : state.days + '일'}`,
    `${focus.emoji} ${focus.label}`,
  ];

  if (state.allergens.length) {
    const labels = state.allergens
      .map(code => ALLERGENS.find(a => a.code === code).label)
      .join(', ');
    tags.push(`🚫 ${labels} 제외`);
  }
  if (state.dislikes.length) {
    tags.push(`🙅 ${state.dislikes.join(', ')} 제외`);
  }

  $('#resultTags').innerHTML = tags.map(t => `<span class="rtag">${t}</span>`).join('');

  /* 인쇄물 머리글 — 화면에서는 숨겨져 있고 종이에만 찍힌다 */
  const today = new Date();
  const last = new Date(today);
  last.setDate(today.getDate() + state.days - 1);
  const fmt = d => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const range = state.days > 1 ? `${fmt(today)} ~ ${fmt(last)}` : fmt(today);

  $('#printHead').innerHTML = `
    <h1>🍱 우리 아이 식단표</h1>
    <p class="print-range">${today.getFullYear()}년 ${range} (${state.days}일치)</p>
    <p class="print-cond">${tags.join('  ·  ')}</p>`;
}

/* ---------- 인쇄 ---------- */

/*
 * mode에 클래스명을 주면 그 클래스를 body에 붙인 채로 인쇄한다.
 * (장보기 목록만 뽑을 때 사용)
 * afterprint를 지원하지 않는 브라우저를 위해 타이머로도 정리한다.
 */
function printPlan(mode) {
  if (mode) document.body.classList.add(mode);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    if (mode) document.body.classList.remove(mode);
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 3000);

  if (typeof gtag === 'function') {
    gtag('event', 'print_meal_plan', {
      event_category: 'webapp',
      print_mode: mode ? 'shopping_only' : 'full',
    });
  }

  window.print();
}

/* ---------- 폼 만들기 ---------- */

function chipHtml(value, label, desc, checked) {
  return `<button type="button" class="chip${checked ? ' on' : ''}" data-value="${value}">
      <span class="chip-label">${label}</span>
      ${desc ? `<span class="chip-desc">${desc}</span>` : ''}
    </button>`;
}

/* 단일 선택 그룹 */
function bindSingle(container, onPick) {
  container.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('.chip', container).forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    onPick(chip.dataset.value);
  });
}

/* 다중 선택 그룹 */
function bindMulti(container, onChange, requireOne) {
  container.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const on = $$('.chip.on', container);
    if (requireOne && on.length === 1 && on[0] === chip) return; // 마지막 하나는 못 끄게
    chip.classList.toggle('on');
    onChange($$('.chip.on', container).map(c => c.dataset.value));
  });
}

function updateSeasonBadge() {
  const season = SEASONS[seasonOfMonth(state.month)];
  $('#seasonBadge').textContent = `${season.label} 제철 재료로`;
}

function buildForm() {
  $('#ageChips').innerHTML = AGE_GROUPS
    .map(a => chipHtml(a.code, a.label, a.desc, a.code === state.age)).join('');
  bindSingle($('#ageChips'), v => { state.age = v; });

  $('#monthSelect').innerHTML = Array.from({ length: 12 }, (_, i) =>
    `<option value="${i + 1}"${i + 1 === state.month ? ' selected' : ''}>${i + 1}월</option>`).join('');
  $('#monthSelect').addEventListener('change', e => {
    state.month = Number(e.target.value);
    updateSeasonBadge();
  });
  updateSeasonBadge();

  $('#periodChips').innerHTML = PERIODS
    .map(p => chipHtml(p.days, p.label, '', p.days === state.days)).join('');
  bindSingle($('#periodChips'), v => { state.days = Number(v); });

  $('#mealChips').innerHTML = MEAL_TYPES
    .map(m => chipHtml(m.code, `${m.emoji} ${m.label}`, '', state.meals.includes(m.code))).join('');
  bindMulti($('#mealChips'), v => { state.meals = v; }, true);

  $('#focusChips').innerHTML = FOCUS_PRESETS
    .map(f => chipHtml(f.code, `${f.emoji} ${f.label}`, f.desc, f.code === state.focus)).join('');
  bindSingle($('#focusChips'), v => { state.focus = v; });

  $('#allergyChips').innerHTML = ALLERGENS
    .map(a => chipHtml(a.code, a.label, '', state.allergens.includes(a.code))).join('');
  bindMulti($('#allergyChips'), v => { state.allergens = v; }, false);

  $('#dislikeInput').value = state.dislikes.join(', ');
}

/* ---------- 설정 저장 / 복원 ---------- */

const STORAGE_KEY = 'kids_meal_plan_settings';

function saveSettings() {
  safeStore.set(STORAGE_KEY, JSON.stringify(state));
}

function restoreSettings() {
  const raw = safeStore.get(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (AGE_GROUPS.some(a => a.code === saved.age)) state.age = saved.age;
    if (PERIODS.some(p => p.days === saved.days)) state.days = saved.days;
    if (FOCUS_PRESETS.some(f => f.code === saved.focus)) state.focus = saved.focus;
    if (Array.isArray(saved.meals) && saved.meals.length) {
      state.meals = saved.meals.filter(c => MEAL_TYPES.some(m => m.code === c));
    }
    if (Array.isArray(saved.allergens)) {
      state.allergens = saved.allergens.filter(c => ALLERGENS.some(a => a.code === c));
    }
    if (Array.isArray(saved.dislikes)) state.dislikes = saved.dislikes;
  } catch (e) { /* 저장값이 깨졌으면 기본값으로 */ }
}

/* ---------- 실행 ---------- */

function readDislikes() {
  state.dislikes = $('#dislikeInput').value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function run() {
  readDislikes();

  const problems = checkCoverage();
  const warning = $('#warning');
  if (problems.length) {
    warning.innerHTML = '<strong>조건이 조금 좁습니다.</strong><br>' + problems.join('<br>')
      + '<br>알레르기·빼고 싶은 재료를 줄이거나, 다른 달을 골라보세요.';
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }

  renderResultTags();
  renderPlan(generatePlan());
  saveSettings();

  $('#setup').classList.add('hidden');
  $('#result').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreSettings();
  buildForm();

  $('#generateBtn').addEventListener('click', () => {
    if (typeof gtag === 'function') {
      gtag('event', 'generate_meal_plan', {
        event_category: 'webapp',
        age: state.age,
        days: state.days,
        focus: state.focus,
      });
    }
    run();
  });

  $('#rerollBtn').addEventListener('click', () => {
    renderPlan(generatePlan());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#backBtn').addEventListener('click', () => {
    $('#result').classList.add('hidden');
    $('#setup').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#printAllBtn').addEventListener('click', () => printPlan(null));
  $('#printBuyBtn').addEventListener('click', () => printPlan('print-shopping-only'));
});
