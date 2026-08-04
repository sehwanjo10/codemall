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
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
  },
};

const PERIODS = [
  { days: 1,  label: '하루' },
  { days: 3,  label: '3일' },
  { days: 7,  label: '1주일' },
  { days: 28, label: '4주' },
];

/* 평일 저녁에 감당할 수 있는 조리 시간 */
const TIME_LIMITS = [
  { value: 20,  label: '20분 안에',   desc: '정말 바쁜 평일. 국과 간단한 반찬 위주' },
  { value: 30,  label: '30분 정도',   desc: '보통의 평일 저녁 (추천)' },
  { value: 999, label: '시간 넉넉해요', desc: '갈비찜·삼계탕 같은 메뉴도 평일에 배정' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const STORAGE_SETTINGS = 'kids_meal_plan_settings';
const STORAGE_PLAN     = 'kids_meal_plan_last';

/* 사용자가 고른 조건 */
const state = {
  ages: ['2'],       // 나이대 다중 선택 (형제자매)
  kids: 1,           // 아이 수 — 장보기 수량 계산용
  adults: 2,         // 함께 먹는 어른 수
  month: new Date().getMonth() + 1,
  days: 7,
  meals: ['d', 's'],
  focus: 'growth',
  allergens: [],
  dislikes: [],
  weekdayLimit: 30,  // 평일 최대 조리 시간(분)
};

let currentPlan = null;  // 화면에 떠 있는 식단 (칸별 재뽑기에 필요)

/* ---------- 유틸 ---------- */

function seasonOfMonth(month) {
  return Object.keys(SEASONS).find(key => SEASONS[key].months.includes(month));
}

function focusKeys() {
  return (FOCUS_PRESETS.find(f => f.code === state.focus) || FOCUS_PRESETS[0]).keys;
}

/* 조리 시간(분). 조리법이 없으면 넉넉한 값으로 본다. */
function dishTime(dish) {
  const recipe = RECIPES[dish.name];
  return recipe ? recipe[0] : 30;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/*
 * 한 상을 차리는 데 실제로 걸리는 시간(분).
 * 국이 끓는 동안 반찬을 볶으므로 단순 합계는 과장이다.
 * 가장 오래 걸리는 메뉴 + 나머지의 절반으로 어림잡고 5분 단위로 반올림한다.
 */
function mealEstimate(dishes) {
  if (!dishes.length) return 0;
  const times = dishes.map(dishTime).sort((a, b) => b - a);
  if (times.length === 1) return times[0]; // 한 접시뿐이면 그대로 (반올림하면 2분이 0분이 된다)
  const rest = times.slice(1).reduce((sum, t) => sum + t, 0);
  return Math.max(5, Math.round((times[0] + rest / 2) / 5) * 5);
}

/* 장보기 수량 배수 — 아이를 1인분으로 두고 어른은 1.5인분으로 셈한다 */
function servingFactor() {
  return state.kids + state.adults * 1.5;
}

/*
 * 양파·두부처럼 요리 한 번 기준으로 쓰는 재료의 배수.
 * 인원이 늘면 냄비가 커지긴 하므로 완만하게만 올린다. (1배 ~ 2배)
 */
function dishFactor() {
  return Math.min(2, Math.max(1, servingFactor() / 4));
}

/* 재료 하나가 몇 배로 필요한지 */
function scaleFor(name, cat) {
  return isDishScaled(name, cat) ? dishFactor() : servingFactor();
}

/* ---------- 메뉴 고르기 ---------- */

/*
 * 조건에 맞는 메뉴만 남긴다.
 * 나이대를 여러 개 골랐으면 모든 아이가 먹을 수 있는 메뉴만 통과시킨다.
 */
function isEligible(dish, mealCode, maxTime) {
  if (!dish.meals.includes(mealCode)) return false;
  if (!state.ages.every(age => dish.ages.includes(age))) return false;

  const season = seasonOfMonth(state.month);
  if (dish.seasons !== '*' && !dish.seasons.includes(season)) return false;

  if (dish.al.some(code => state.allergens.includes(code))) return false;
  if (maxTime && dishTime(dish) > maxTime) return false;

  if (state.dislikes.length) {
    const haystack = dish.name + ' ' + dish.ing.map(i => i[0]).join(' ');
    if (state.dislikes.some(word => haystack.includes(word))) return false;
  }
  return true;
}

/* 끼니별로 역할(one/soup/main/side)에 따라 나눠 담은 풀 */
function buildPools(mealCode, maxTime) {
  const pools = { one: [], soup: [], main: [], side: [] };
  DISHES.forEach(dish => {
    if (isEligible(dish, mealCode, maxTime)) pools[roleOf(dish)].push(dish);
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
function pickDish(pool, used, slot, gap, usedIng, budget) {
  if (!pool.length) return null;

  let best = null;
  let bestScore = -Infinity;

  pool.forEach(dish => {
    const lastUsed = used[dish.name];
    const distance = lastUsed === undefined ? Infinity : Math.abs(slot - lastUsed);

    let score = focusScore(dish) * 2 + Math.random() * 2.2;
    if (distance < gap) score -= (gap - distance) * 3;

    if (usedIng && usedIng.size) {
      const clash = dish.ing.filter(([name, cat]) =>
        cat !== 'etc' && usedIng.has(ingredientFamily(name))).length;
      score -= clash * 5;
    }

    /*
     * 남은 시간을 넘기면 넘긴 만큼 감점한다.
     * 아예 후보에서 빼버리면 빠른 반찬 몇 개만 계속 돌아 식단이 단조로워지므로,
     * 조금 넘는 정도는 다양성을 위해 허용한다.
     */
    if (budget != null) {
      const over = dishTime(dish) - budget;
      if (over > 0) score -= over * 0.4;
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

/*
 * 한 끼에 쓸 수 있는 전체 시간.
 * 메뉴 하나하나가 짧아도 세 가지를 차리면 합이 한 시간을 넘을 수 있어,
 * 상차림 전체에도 예산을 둔다. 주말에는 제한하지 않는다.
 */
function mealBudget(mealCode, weekend) {
  if (weekend || state.weekdayLimit >= 999) return null;
  if (mealCode === 'b') return 30;   // 평일 아침은 정말 급하다
  if (mealCode === 's') return null; // 간식은 한 가지뿐이라 제한 불필요
  return state.weekdayLimit * 2;
}

/* 한 끼를 구성한다. 반환: { dishes: [...], rice: bool } */
function composeMeal(pools, mealCode, used, slot, weekend) {
  const dishes = [];
  const usedIng = new Set(); // 이 끼니에 이미 쓴 재료
  let rice = false;

  if (mealCode === 's') {
    const snack = pickDish(pools.main.concat(pools.one, pools.side), used, slot, 6, null, null);
    if (snack) dishes.push(snack);
    return { dishes, rice };
  }

  /* 아침은 간단하게, 점심·저녁은 밥+국+반찬 상차림 비중을 높인다 */
  const oneDishChance = mealCode === 'b' ? 0.75 : 0.45;
  const wantOneDish = Math.random() < oneDishChance;

  /* 이번 끼니에 무엇을 몇 가지 낼지 먼저 정한다 */
  const plan = [];
  if (wantOneDish && pools.one.length) {
    plan.push([pools.one, 5]);
    if (mealCode !== 'b' && pools.side.length) plan.push([pools.side, 4]);
  } else if (pools.main.length || pools.soup.length) {
    rice = true;
    if (pools.soup.length) plan.push([pools.soup, 4]);
    if (pools.main.length) plan.push([pools.main, 5]);
    if (pools.side.length) plan.push([pools.side, 4]);
  } else if (pools.one.length) {
    plan.push([pools.one, 5]);
  }

  /*
   * 전체 예산을 접시 수로 나눠 배분한다.
   * 처음 고른 메뉴가 예산을 다 써버려서 나머지가 밀려나지 않게 하려는 것.
   * 마지막 한 접시는 남은 시간을 그대로 쓴다.
   */
  let left = mealBudget(mealCode, weekend);

  plan.forEach(([pool, gap], i) => {
    let allowance = null;
    if (left != null) {
      const remaining = plan.length - i;
      allowance = remaining === 1 ? left : Math.max(10, (left / remaining) * 1.6);
    }
    const dish = pickDish(pool, used, slot, gap, usedIng, allowance);
    if (dish) {
      dishes.push(dish);
      if (left != null) left = Math.max(0, left - dishTime(dish));
    }
  });

  return { dishes: dishes.filter(Boolean), rice };
}

/*
 * 전체 식단 생성.
 * 평일에는 조리 시간이 짧은 메뉴만, 주말에는 시간이 걸리는 메뉴도 배정한다.
 */
function generatePlan() {
  const weekdayPools = {};
  const weekendPools = {};
  state.meals.forEach(code => {
    weekdayPools[code] = buildPools(code, state.weekdayLimit);
    weekendPools[code] = buildPools(code, 0);
  });

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
    const weekend = isWeekend(date);
    const pools = weekend ? weekendPools : weekdayPools;

    const meals = {};
    state.meals.forEach(code => {
      meals[code] = composeMeal(pools[code], code, used, i, weekend);
    });
    plan.push({ date, meals });
  }
  return plan;
}

/* 한 칸만 다시 뽑는다. 나머지 날에 이미 나온 메뉴는 피한다. */
function rerollMeal(dayIndex, mealCode) {
  const day = currentPlan[dayIndex];
  const weekend = isWeekend(day.date);
  const pools = buildPools(mealCode, weekend ? 0 : state.weekdayLimit);

  /* 이 칸을 뺀 나머지 식단에서 사용 기록을 다시 만든다 */
  const used = {};
  currentPlan.forEach((other, i) => {
    Object.entries(other.meals).forEach(([code, meal]) => {
      if (i === dayIndex && code === mealCode) return;
      meal.dishes.forEach(dish => { used[dish.name] = i; });
    });
  });

  day.meals[mealCode] = composeMeal(pools, mealCode, used, dayIndex, weekend);
  return day.meals[mealCode];
}

/*
 * 고른 조건으로 만들 수 있는 메뉴가 충분한지 확인.
 * 기간이 길수록 더 많은 메뉴가 필요하므로 일수를 함께 본다.
 */
function checkCoverage() {
  const problems = [];
  const need = Math.min(state.days, 7);

  state.meals.forEach(code => {
    const pools = buildPools(code, state.weekdayLimit);
    const label = MEAL_TYPES.find(m => m.code === code).label;

    if (code === 's') {
      const total = pools.one.length + pools.main.length + pools.side.length;
      if (total === 0) problems.push(`${label}으로 낼 수 있는 메뉴가 하나도 없습니다.`);
      else if (total < need) problems.push(`${label} 메뉴가 ${total}가지뿐이라 자주 반복됩니다.`);
      return;
    }

    const primary = pools.one.length + pools.main.length;
    if (primary === 0) {
      problems.push(`평일 ${label}으로 낼 수 있는 메뉴가 하나도 없습니다.`);
      return;
    }
    if (primary < need) {
      problems.push(`평일 ${label} 메인 메뉴가 ${primary}가지뿐이라 자주 반복됩니다.`);
    }
    if (pools.one.length === 0 && pools.soup.length === 0) {
      problems.push(`${label}에 곁들일 국이 없어 반찬만 나옵니다.`);
    }
  });
  return problems;
}

/* ---------- 장보기 목록 ---------- */

/* 실제로 살 수 있는 단위로 올림한다 */
function roundAmount(amount, unit) {
  if (unit === 'g' || unit === 'ml') {
    return Math.max(50, Math.ceil(amount / 50) * 50);
  }
  if (unit === '컵') return Math.ceil(amount * 2) / 2;
  return Math.ceil(amount);
}

/* 1000g을 넘으면 kg으로 바꿔 읽기 쉽게 만든다 */
function formatAmount(amount, unit) {
  if (unit === 'g'  && amount >= 1000) return (Math.round(amount / 100) / 10) + 'kg';
  if (unit === 'ml' && amount >= 1000) return (Math.round(amount / 100) / 10) + 'L';
  return amount + unit;
}

/* 재료 하나에 필요한 양을 문자열로 (양념처럼 정하기 어려우면 null) */
function amountFor(name, cat, count) {
  const unitInfo = ING_UNITS[name];
  if (!unitInfo) return null;
  const [perUse, unit] = unitInfo;
  return formatAmount(roundAmount(perUse * scaleFor(name, cat) * count, unit), unit);
}

/*
 * 장보기 목록을 만든다.
 * '소고기(국거리)'와 '소고기(다짐)'처럼 괄호만 다른 재료는 하나로 합쳐서
 * "소고기 300g · 국거리, 다짐"처럼 보여준다. 마트에서 한 번에 사기 위함.
 */
function buildShoppingList(days) {
  const items = new Map(); // "기본이름|카테고리" -> { base, cat, count, cuts:Set }

  const add = (rawName, cat) => {
    const base = baseIngredient(rawName);
    const match = rawName.match(/^.+?\s*\((.+)\)\s*$/);

    const key = base + '|' + cat;
    if (!items.has(key)) items.set(key, { base, cat, count: 0, cuts: new Set() });
    const item = items.get(key);
    item.count += 1;
    if (match) item.cuts.add(match[1]);
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
      qty: amountFor(item.base, item.cat, item.count),
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
  const time = dishTime(dish);
  return `<li class="dish" data-dish="${dish.name}" tabindex="0" role="button">
      <span class="dish-emoji">${dish.emoji}</span>
      <span class="dish-name">${dish.name}</span>
      <span class="dish-time">${time}분</span>
      ${nutrientTags(dish)}
    </li>`;
}

function renderMeal(day, dayIndex, type) {
  const meal = day.meals[type.code];
  if (!meal || !meal.dishes.length) return '';

  const riceItem = meal.rice
    ? `<li class="dish dish-rice"><span class="dish-emoji">🍚</span><span class="dish-name">밥</span></li>`
    : '';
  const estimate = mealEstimate(meal.dishes);

  return `<div class="meal" data-day="${dayIndex}" data-meal="${type.code}">
      <div class="meal-label">
        <span>${type.emoji} ${type.label}</span>
        <span class="meal-total" title="같이 끓이고 볶는 시간을 감안한 어림값">약 ${estimate}분</span>
        <button class="meal-reroll" type="button" title="이 끼니만 다시 뽑기">🎲</button>
      </div>
      <ul class="dish-list">${riceItem}${meal.dishes.map(renderDish).join('')}</ul>
    </div>`;
}

function renderDayCard(day, index) {
  const dateLabel = `${day.date.getMonth() + 1}월 ${day.date.getDate()}일`;
  const weekday = WEEKDAYS[day.date.getDay()];
  const weekend = isWeekend(day.date);

  const mealsHtml = MEAL_TYPES
    .filter(type => state.meals.includes(type.code))
    .map(type => renderMeal(day, index, type))
    .join('');

  return `<article class="day-card${weekend ? ' weekend' : ''}" data-day="${index}">
      <header class="day-head">
        <span class="day-index">${index + 1}일차</span>
        <span class="day-date">${dateLabel} <b>${weekday}</b></span>
        ${weekend ? '<span class="day-badge">주말</span>' : ''}
      </header>
      ${mealsHtml}
    </article>`;
}

function renderShoppingList(grouped, weekIndex) {
  const sections = Object.keys(ING_CATEGORIES)
    .filter(cat => grouped[cat] && grouped[cat].length)
    .map(cat => {
      const meta = ING_CATEGORIES[cat];
      const items = grouped[cat]
        .map(item => `<li><label class="buy-item">
            <input type="checkbox">
            <span class="buy-name">${item.name}</span>
            ${item.qty ? `<span class="buy-qty">${item.qty}</span>`
                       : `<span class="buy-qty buy-qty-soft">적당량</span>`}
            ${item.cuts.length ? `<span class="buy-cut">${item.cuts.join(', ')}</span>` : ''}
          </label></li>`)
        .join('');
      return `<div class="buy-group">
          <h4>${meta.emoji} ${meta.label}</h4>
          <ul>${items}</ul>
        </div>`;
    })
    .join('');

  const who = `아이 ${state.kids}명` + (state.adults ? ` · 어른 ${state.adults}명` : '');

  return `<section class="shopping">
      <div class="shopping-head">
        <h3>🛒 이만큼만 사시면 됩니다</h3>
        <button class="buy-copy" type="button" data-week="${weekIndex}">📋 복사</button>
      </div>
      <p class="shopping-desc">${who} 기준으로 넉넉하게 올림한 <strong>어림수</strong>예요. 집 식성에 맞춰 조절하시고, 장바구니에 담으면서 체크해 보세요.</p>
      ${sections}
    </section>`;
}

function renderPlan() {
  const chunks = [];
  for (let i = 0; i < currentPlan.length; i += 7) chunks.push(currentPlan.slice(i, i + 7));

  const html = chunks.map((chunk, weekIndex) => {
    const heading = chunks.length > 1
      ? `<h2 class="week-title">${weekIndex + 1}주차</h2>`
      : '';
    return `<section class="week">
        ${heading}
        <div class="day-grid">
          ${chunk.map((day, i) => renderDayCard(day, weekIndex * 7 + i)).join('')}
        </div>
        ${renderShoppingList(buildShoppingList(chunk), weekIndex)}
      </section>`;
  }).join('');

  $('#planOutput').innerHTML = html;
}

/* 한 칸만 새로 그린다 */
function refreshMeal(dayIndex, mealCode) {
  const el = $(`.meal[data-day="${dayIndex}"][data-meal="${mealCode}"]`);
  if (!el) return;
  const type = MEAL_TYPES.find(m => m.code === mealCode);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderMeal(currentPlan[dayIndex], dayIndex, type);
  const fresh = wrapper.firstElementChild;
  if (fresh) {
    el.replaceWith(fresh);
    fresh.classList.add('meal-flash');
    setTimeout(() => fresh.classList.remove('meal-flash'), 600);
  }
  /* 장보기 목록도 다시 계산해야 한다 */
  const weekIndex = Math.floor(dayIndex / 7);
  const chunk = currentPlan.slice(weekIndex * 7, weekIndex * 7 + 7);
  const shopping = $$('.shopping')[weekIndex];
  if (shopping) {
    const wrap2 = document.createElement('div');
    wrap2.innerHTML = renderShoppingList(buildShoppingList(chunk), weekIndex);
    shopping.replaceWith(wrap2.firstElementChild);
  }
}

function conditionTags() {
  const ageLabels = state.ages
    .map(code => AGE_GROUPS.find(a => a.code === code).label)
    .join(' + ');
  const focus  = FOCUS_PRESETS.find(f => f.code === state.focus);
  const period = PERIODS.find(p => p.days === state.days);
  const season = SEASONS[seasonOfMonth(state.month)];
  const limit  = TIME_LIMITS.find(t => t.value === state.weekdayLimit);

  const tags = [
    `👶 ${ageLabels}`,
    `🍽️ 아이 ${state.kids}명${state.adults ? ` · 어른 ${state.adults}명` : ''}`,
    `🗓️ ${state.month}월 (${season.label})`,
    `⏳ ${period ? period.label : state.days + '일'}`,
    `${focus.emoji} ${focus.label}`,
    `⏱️ 평일 ${limit ? limit.label : state.weekdayLimit + '분'}`,
  ];

  if (state.allergens.length) {
    tags.push('🚫 ' + state.allergens
      .map(code => ALLERGENS.find(a => a.code === code).label).join(', ') + ' 제외');
  }
  if (state.dislikes.length) tags.push(`🙅 ${state.dislikes.join(', ')} 제외`);
  return tags;
}

function renderResultTags() {
  const tags = conditionTags();
  $('#resultTags').innerHTML = tags.map(t => `<span class="rtag">${t}</span>`).join('');

  /* 인쇄물 머리글 — 화면에서는 숨겨져 있고 종이에만 찍힌다 */
  const first = currentPlan[0].date;
  const last = currentPlan[currentPlan.length - 1].date;
  const fmt = d => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const range = state.days > 1 ? `${fmt(first)} ~ ${fmt(last)}` : fmt(first);

  $('#printHead').innerHTML = `
    <h1>🍱 우리 아이 식단표</h1>
    <p class="print-range">${first.getFullYear()}년 ${range} (${state.days}일치)</p>
    <p class="print-cond">${tags.join('  ·  ')}</p>`;
}

/* ---------- 레시피 창 ---------- */

function openRecipe(dishName) {
  const dish = DISHES.find(d => d.name === dishName);
  const recipe = RECIPES[dishName];
  if (!dish || !recipe) return;

  const [time, ...steps] = recipe;

  const ingList = dish.ing.map(([name, cat]) => {
    const qty = amountFor(baseIngredient(name), cat, 1) || '적당량';
    return `<li><span>${name}</span><b>${qty}</b></li>`;
  }).join('');

  const allergenNote = dish.al.length
    ? `<p class="recipe-allergen">⚠️ 포함: ${dish.al
        .map(c => ALLERGENS.find(a => a.code === c)?.label || c).join(', ')}</p>`
    : '';

  $('#recipeBody').innerHTML = `
    <div class="recipe-head">
      <span class="recipe-emoji">${dish.emoji}</span>
      <div>
        <h3>${dish.name}</h3>
        <p class="recipe-meta">⏱️ 약 ${time}분 · 아이 ${state.kids}명${state.adults ? ` + 어른 ${state.adults}명` : ''} 기준</p>
      </div>
    </div>
    ${allergenNote}
    <h4>재료</h4>
    <ul class="recipe-ing">${ingList}</ul>
    <h4>이렇게 만들어요</h4>
    <ol class="recipe-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;

  $('#recipeModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (typeof gtag === 'function') {
    gtag('event', 'view_recipe', { event_category: 'webapp', dish_name: dishName });
  }
}

function closeRecipe() {
  $('#recipeModal').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ---------- 실행 환경 ---------- */

/*
 * 인스타그램·페이스북·카카오톡처럼 앱 안에 내장된 브라우저인지 확인한다.
 * 이 환경에서는 window.print()를 불러도 아무 일도 일어나지 않는다.
 * iOS의 WKWebView와 안드로이드 WebView 모두 인쇄를 구현하지 않는데,
 * 오류도 안 나고 조용히 무시되기 때문에 미리 걸러내고 다른 길을 안내해야 한다.
 */
function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|NAVER\(inapp|Line\/|DaumApps|everytimeApp/i.test(ua);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent || '');
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '');
}

/*
 * 눈에 안 보이는 입력칸에 글을 넣고 복사하는 예전 방식.
 * 인앱 브라우저에서는 navigator.clipboard가 아예 없거나 막혀 있어 이 길이 필요하다.
 */
function copyTextSync(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(area);

  try {
    if (isIOS()) {
      /* iOS는 select()만으로 선택이 잡히지 않아 범위를 직접 만들어 준다 */
      area.contentEditable = 'true';
      area.readOnly = false;
      const range = document.createRange();
      range.selectNodeContents(area);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      area.setSelectionRange(0, 999999);
    } else {
      area.select();
      area.setSelectionRange(0, area.value.length);
    }
    return document.execCommand('copy');
  } catch (e) {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

/*
 * 예전 방식을 먼저 시도한다.
 * navigator.clipboard를 먼저 await 하면 그 사이에 '사용자가 방금 눌렀다'는
 * 자격이 풀려버려서, 실패했을 때 대비책마저 못 쓰게 된다.
 */
async function copyText(text) {
  if (copyTextSync(text)) return true;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* 두 방법 다 실패 */ }

  return false;
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
}

/* ---------- 장보기 목록 텍스트로 내보내기 ---------- */

/* 인쇄가 막힌 환경에서도 쓸 수 있게, 목록을 그대로 붙여넣을 수 있는 글로 만든다 */
function shoppingListText(weekIndex) {
  const chunk = currentPlan.slice(weekIndex * 7, weekIndex * 7 + 7);
  const grouped = buildShoppingList(chunk);
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;

  const lines = [
    `🛒 장보기 목록 (${fmt(chunk[0].date)}~${fmt(chunk[chunk.length - 1].date)})`,
    `아이 ${state.kids}명${state.adults ? ` · 어른 ${state.adults}명` : ''} 기준`,
    '',
  ];

  Object.keys(ING_CATEGORIES).forEach(cat => {
    const list = grouped[cat];
    if (!list || !list.length) return;
    lines.push(`[${ING_CATEGORIES[cat].label}]`);
    list.forEach(item => {
      const qty = item.qty ? ` ${item.qty}` : '';
      const cuts = item.cuts.length ? ` (${item.cuts.join(', ')})` : '';
      lines.push(`· ${item.name}${qty}${cuts}`);
    });
    lines.push('');
  });

  lines.push('codemall.kr · 우리 아이 식단표');
  return lines.join('\n');
}

async function copyShoppingList(weekIndex) {
  const text = shoppingListText(weekIndex);

  if (await copyText(text)) {
    closeNotice();
    toast('장보기 목록을 복사했어요. 메모장이나 카톡에 붙여넣으세요.');
    if (typeof gtag === 'function') {
      gtag('event', 'copy_shopping_list', { event_category: 'webapp' });
    }
    return;
  }

  /* 복사가 막힌 브라우저에서도 빈손으로 돌려보내지 않는다 */
  openTextFallback(text);
}

/* 자동 복사가 안 되면 글을 직접 띄워서 손으로 복사할 수 있게 한다 */
function openTextFallback(text) {
  $('#noticeBody').innerHTML = `
    <h3>목록을 직접 복사해 주세요</h3>
    <p class="notice-lead">이 브라우저는 복사 버튼을 막아 두었어요.
      아래 상자를 눌러 전체 선택한 뒤 길게 눌러 복사하시면 됩니다.</p>
    <textarea class="copy-area" id="copyArea" readonly rows="9"></textarea>
    <p class="notice-foot">상자를 한 번 누르면 전체가 선택됩니다.</p>`;

  const area = $('#copyArea');
  area.value = text;
  area.addEventListener('click', () => {
    area.select();
    area.setSelectionRange(0, 999999);
  });

  $('#noticeModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (typeof gtag === 'function') {
    gtag('event', 'copy_fallback_shown', { event_category: 'webapp' });
  }
}

/* ---------- 인쇄 ---------- */

/*
 * mode에 클래스명을 주면 그 클래스를 body에 붙인 채로 인쇄한다.
 * (장보기 목록만 뽑을 때 사용)
 */
function printPlan(mode) {
  /* 인앱 브라우저에서는 눌러도 아무 반응이 없으므로 대신 방법을 알려준다 */
  if (isInAppBrowser()) {
    openPrintGuide();
    if (typeof gtag === 'function') {
      gtag('event', 'print_blocked_inapp', { event_category: 'webapp' });
    }
    return;
  }

  if (mode) document.body.classList.add(mode);

  let timer = null;
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    if (mode) document.body.classList.remove(mode);
    window.removeEventListener('afterprint', cleanup);
    window.removeEventListener('focus', cleanup);
    clearTimeout(timer);
  };

  /*
   * 모바일은 인쇄 시트가 뜨고 사용자가 저장을 마칠 때까지 시간이 걸린다.
   * 예전처럼 3초 뒤에 정리해버리면 '장보기 목록만'을 눌러도
   * 그 사이 클래스가 벗겨져 전체 식단이 인쇄된다.
   * afterprint를 우선 쓰되, 그 이벤트를 쏘지 않는 브라우저를 위해
   * 화면으로 돌아오는 시점과 넉넉한 타이머를 함께 둔다.
   */
  window.addEventListener('afterprint', cleanup);
  window.addEventListener('focus', cleanup);
  timer = setTimeout(cleanup, 120000);

  if (typeof gtag === 'function') {
    gtag('event', 'print_meal_plan', {
      event_category: 'webapp',
      print_mode: mode ? 'shopping_only' : 'full',
    });
  }

  window.print();
}

/* 인앱 브라우저에서 인쇄를 누른 사람에게 대안을 안내한다 */
function openPrintGuide() {
  $('#noticeBody').innerHTML = `
    <h3>앱 안에서는 인쇄가 안 돼요</h3>
    <p class="notice-lead">인스타그램이나 카카오톡 안에서 열린 창은 인쇄·PDF 저장 기능이 없습니다.
      앱 잘못도 사이트 잘못도 아니고, 원래 그 기능이 빠져 있어요.</p>

    <div class="notice-pick">
      <button class="btn btn-primary" id="noticeCopyBtn" type="button">📋 장보기 목록 복사하기</button>
      <p>제일 빠른 방법이에요. 복사해서 메모장이나 카톡에 붙여넣으면 마트에서 그대로 보면서 장 볼 수 있어요.</p>
    </div>

    <div class="notice-pick">
      <button class="btn" id="noticeOpenBtn" type="button">${isAndroid() ? '🌐 브라우저로 열기' : '🔗 링크 복사하기'}</button>
      <p>${isAndroid()
        ? '크롬 같은 브라우저에서 열면 인쇄와 PDF 저장이 됩니다.'
        : '사파리 주소창에 붙여넣어 주세요. 사파리에서는 인쇄와 PDF 저장이 됩니다.'}</p>
    </div>

    <p class="notice-foot">화면 오른쪽 위 <b>⋯</b> 를 눌러 <b>‘외부 브라우저에서 열기’</b>를 골라도 됩니다.</p>`;

  $('#noticeModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  $('#noticeCopyBtn').addEventListener('click', () => copyShoppingList(0));
  $('#noticeOpenBtn').addEventListener('click', openInExternalBrowser);
}

function closeNotice() {
  $('#noticeModal').classList.add('hidden');
  document.body.style.overflow = '';
}

function openInExternalBrowser() {
  const url = window.location.href;

  /* 안드로이드는 intent로 기본 브라우저를 띄울 수 있다 */
  if (isAndroid()) {
    window.location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;end';
    return;
  }

  /* iOS는 앱 밖으로 나가게 강제할 방법이 없어 링크 복사로 안내한다 */
  copyText(url).then(ok => {
    toast(ok ? '링크를 복사했어요. 사파리 주소창에 붙여넣어 주세요.'
             : '주소창의 링크를 직접 복사해 주세요.');
  });
}

/* ---------- 저장 / 복원 ---------- */

function saveSettings() {
  safeStore.set(STORAGE_SETTINGS, JSON.stringify(state));
}

function savePlan() {
  const payload = {
    savedAt: Date.now(),
    state: JSON.parse(JSON.stringify(state)),
    plan: currentPlan.map(day => ({
      date: day.date.toISOString(),
      meals: Object.fromEntries(Object.entries(day.meals).map(([code, meal]) => [
        code, { rice: meal.rice, dishes: meal.dishes.map(d => d.name) },
      ])),
    })),
  };
  safeStore.set(STORAGE_PLAN, JSON.stringify(payload));
}

/* 저장된 식단을 되살린다. 메뉴 데이터가 바뀌어 못 찾으면 null. */
function loadSavedPlan() {
  const raw = safeStore.get(STORAGE_PLAN);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (!saved.plan || !saved.plan.length) return null;

    const plan = saved.plan.map(day => ({
      date: new Date(day.date),
      meals: Object.fromEntries(Object.entries(day.meals).map(([code, meal]) => [
        code, {
          rice: meal.rice,
          dishes: meal.dishes.map(n => DISHES.find(d => d.name === n)).filter(Boolean),
        },
      ])),
    }));
    return { savedAt: saved.savedAt, state: saved.state, plan };
  } catch (e) {
    return null;
  }
}

function restoreSettings() {
  const raw = safeStore.get(STORAGE_SETTINGS);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.ages) && saved.ages.length) {
      const valid = saved.ages.filter(c => AGE_GROUPS.some(a => a.code === c));
      if (valid.length) state.ages = valid;
    }
    if (Number.isInteger(saved.kids)   && saved.kids   >= 1 && saved.kids   <= 4) state.kids = saved.kids;
    if (Number.isInteger(saved.adults) && saved.adults >= 0 && saved.adults <= 2) state.adults = saved.adults;
    if (PERIODS.some(p => p.days === saved.days)) state.days = saved.days;
    if (FOCUS_PRESETS.some(f => f.code === saved.focus)) state.focus = saved.focus;
    if (TIME_LIMITS.some(t => t.value === saved.weekdayLimit)) state.weekdayLimit = saved.weekdayLimit;
    if (Array.isArray(saved.meals) && saved.meals.length) {
      const valid = saved.meals.filter(c => MEAL_TYPES.some(m => m.code === c));
      if (valid.length) state.meals = valid;
    }
    if (Array.isArray(saved.allergens)) {
      state.allergens = saved.allergens.filter(c => ALLERGENS.some(a => a.code === c));
    }
    if (Array.isArray(saved.dislikes)) state.dislikes = saved.dislikes;
  } catch (e) { /* 저장값이 깨졌으면 기본값으로 */ }
}

/* ---------- 폼 만들기 ---------- */

function chipHtml(value, label, desc, checked) {
  return `<button type="button" class="chip${checked ? ' on' : ''}" data-value="${value}">
      <span class="chip-label">${label}</span>
      ${desc ? `<span class="chip-desc">${desc}</span>` : ''}
    </button>`;
}

function bindSingle(container, onPick) {
  container.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('.chip', container).forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    onPick(chip.dataset.value);
  });
}

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

/* -/+ 로 숫자를 조절하는 작은 위젯 */
function buildStepper(container, min, max, getValue, setValue) {
  const render = () => { $('.stepper-value', container).textContent = getValue(); };
  container.addEventListener('click', e => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn) return;
    const next = getValue() + (btn.dataset.dir === 'up' ? 1 : -1);
    if (next < min || next > max) return;
    setValue(next);
    render();
  });
  render();
}

function updateSeasonBadge() {
  const season = SEASONS[seasonOfMonth(state.month)];
  $('#seasonBadge').textContent = `${season.label} 제철 재료로`;
}

function buildForm() {
  $('#ageChips').innerHTML = AGE_GROUPS
    .map(a => chipHtml(a.code, a.label, a.desc, state.ages.includes(a.code))).join('');
  bindMulti($('#ageChips'), v => { state.ages = v; }, true);

  buildStepper($('#kidsStepper'), 1, 4, () => state.kids, v => { state.kids = v; });
  buildStepper($('#adultsStepper'), 0, 2, () => state.adults, v => { state.adults = v; });

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

  $('#timeChips').innerHTML = TIME_LIMITS
    .map(t => chipHtml(t.value, t.label, t.desc, t.value === state.weekdayLimit)).join('');
  bindSingle($('#timeChips'), v => { state.weekdayLimit = Number(v); });

  $('#focusChips').innerHTML = FOCUS_PRESETS
    .map(f => chipHtml(f.code, `${f.emoji} ${f.label}`, f.desc, f.code === state.focus)).join('');
  bindSingle($('#focusChips'), v => { state.focus = v; });

  $('#allergyChips').innerHTML = ALLERGENS
    .map(a => chipHtml(a.code, a.label, '', state.allergens.includes(a.code))).join('');
  bindMulti($('#allergyChips'), v => { state.allergens = v; }, false);

  $('#dislikeInput').value = state.dislikes.join(', ');
}

/* ---------- 실행 ---------- */

function readDislikes() {
  state.dislikes = $('#dislikeInput').value
    .split(',').map(s => s.trim()).filter(Boolean);
}

function showResult() {
  renderResultTags();
  renderPlan();
  $('#setup').classList.add('hidden');
  $('#result').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function run() {
  readDislikes();

  const problems = checkCoverage();
  const warning = $('#warning');
  if (problems.length) {
    warning.innerHTML = '<strong>조건이 조금 좁습니다.</strong><br>' + problems.join('<br>')
      + '<br>알레르기·빼고 싶은 재료를 줄이거나, 평일 조리 시간을 늘려보세요.';
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }

  currentPlan = generatePlan();
  showResult();
  saveSettings();
  savePlan();
}

function initSavedPlanBanner() {
  const saved = loadSavedPlan();
  const banner = $('#savedBanner');
  if (!saved) return;

  const when = new Date(saved.savedAt);
  $('#savedWhen').textContent = `${when.getMonth() + 1}월 ${when.getDate()}일에 만든 식단`;
  banner.classList.remove('hidden');

  $('#savedOpenBtn').addEventListener('click', () => {
    Object.assign(state, saved.state);
    currentPlan = saved.plan;
    buildForm();
    showResult();
  });
  $('#savedDropBtn').addEventListener('click', () => {
    safeStore.remove(STORAGE_PLAN);
    banner.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreSettings();
  buildForm();
  initSavedPlanBanner();

  $('#generateBtn').addEventListener('click', () => {
    if (typeof gtag === 'function') {
      gtag('event', 'generate_meal_plan', {
        event_category: 'webapp',
        ages: state.ages.join('+'),
        days: state.days,
        focus: state.focus,
      });
    }
    run();
  });

  $('#rerollBtn').addEventListener('click', () => {
    currentPlan = generatePlan();
    renderPlan();
    savePlan();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#backBtn').addEventListener('click', () => {
    $('#result').classList.add('hidden');
    $('#setup').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#printAllBtn').addEventListener('click', () => printPlan(null));
  $('#printBuyBtn').addEventListener('click', () => printPlan('print-shopping-only'));

  /* 식단표 안의 클릭은 한곳에서 처리한다 (칸별 재뽑기 · 레시피 보기 · 목록 복사) */
  $('#planOutput').addEventListener('click', e => {
    const copyBtn = e.target.closest('.buy-copy');
    if (copyBtn) {
      copyShoppingList(Number(copyBtn.dataset.week));
      return;
    }
    const rerollBtn = e.target.closest('.meal-reroll');
    if (rerollBtn) {
      const meal = rerollBtn.closest('.meal');
      const dayIndex = Number(meal.dataset.day);
      const mealCode = meal.dataset.meal;
      rerollMeal(dayIndex, mealCode);
      refreshMeal(dayIndex, mealCode);
      savePlan();
      return;
    }
    const dish = e.target.closest('.dish[data-dish]');
    if (dish) openRecipe(dish.dataset.dish);
  });

  $('#planOutput').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const dish = e.target.closest('.dish[data-dish]');
    if (!dish) return;
    e.preventDefault();
    openRecipe(dish.dataset.dish);
  });

  $('#recipeClose').addEventListener('click', closeRecipe);
  $('#recipeModal').addEventListener('click', e => {
    if (e.target.id === 'recipeModal') closeRecipe();
  });

  $('#noticeClose').addEventListener('click', closeNotice);
  $('#noticeModal').addEventListener('click', e => {
    if (e.target.id === 'noticeModal') closeNotice();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#recipeModal').classList.contains('hidden')) closeRecipe();
    if (!$('#noticeModal').classList.contains('hidden')) closeNotice();
  });
});
