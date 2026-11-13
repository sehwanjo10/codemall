/* ============================================================
   인앱 브라우저 탈출 (식단표로 들어갈 때만)
   ------------------------------------------------------------
   인스타그램·카카오톡 안에 내장된 브라우저에서는 식단표의
   인쇄·PDF 저장, 링크 복사, 만든 식단 저장이 망가진다.
   랜딩 페이지는 인앱에서도 문제없으니 들어오자마자 막지 않고,
   식단표로 넘어가려는 순간에만 크롬·사파리로 넘기자고 안내한다.

   쿠팡 링크 여는 방법은 coupang.js 에 있다.
   ============================================================ */
var MEAL_PAGE = './page/04/index.html';

var InAppEscape = (function () {
    var ua = navigator.userAgent || '';
    // 유튜브 등 앱 안 브라우저 판별은 coupang.js 와 같이 쓴다
    var isInApp = window.isInAppBrowserUA ? window.isInAppBrowserUA() : false;
    var isAndroid = /Android/i.test(ua);

    // '여기서 볼게요'를 고른 사람에게는 다시 묻지 않는다
    var stayed = function () {
        try { return sessionStorage.getItem('inapp_stay') === 'true'; }
        catch (e) { return false; /* 저장소가 막혀 있으면 그냥 진행 */ }
    };

    /*
     * 안내 화면을 띄운다. 외부 브라우저로 열 주소는 식단표 주소다.
     * '그냥 여기서 볼게요'를 누르면 인앱 그대로 식단표로 보낸다.
     */
    var show = function (destHref) {
        var url = new URL(destHref, window.location.href).href;

        var overlay  = document.getElementById('inappOverlay');
        var openBtn  = document.getElementById('inappOpenBtn');
        var stayBtn  = document.getElementById('inappStayBtn');
        var failMsg  = document.getElementById('inappFail');
        var urlBox   = document.getElementById('inappUrlBox');
        var urlField = document.getElementById('inappUrl');
        if (!overlay) { window.location.href = url; return; }

        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (urlField) urlField.value = url;

        // 안드로이드 인스타는 점 세 개가 세로(⋮)로 표시된다
        if (isAndroid) {
            var dots = ['inappDotsIcon', 'inappDotsInline'];
            for (var i = 0; i < dots.length; i++) {
                var el = document.getElementById(dots[i]);
                if (el) el.textContent = '⋮';
            }
        }

        /*
         * 자동 이동은 앱이 막는 경우가 많다. (특히 iOS 인스타)
         * 그래서 되면 좋고 안 되면 마는 보조 수단으로만 쓰고,
         * 화면의 주인공은 확실히 동작하는 ⋯ 메뉴 안내로 둔다.
         */
        var jump = function () {
            if (isAndroid) {
                window.location.href = 'intent://' + url.replace(/^https?:\/\//, '')
                    + '#Intent;scheme=https;package=com.android.chrome;end';
            } else {
                window.location.href = 'x-safari-' + url;
            }

            // 1.2초 뒤에도 화면이 그대로면 앱이 막은 것이다. 솔직히 알리고 수동 방법을 강조한다.
            setTimeout(function () {
                if (document.hidden) return;
                if (failMsg) failMsg.classList.remove('hidden');
                if (urlBox) urlBox.classList.remove('hidden');
                overlay.classList.add('inapp-manual');
            }, 1200);
        };

        // 띄우자마자 한 번만 조용히 시도한다 (안드로이드는 대체로 이 단계에서 넘어간다)
        setTimeout(jump, 150);

        if (openBtn) openBtn.onclick = jump;

        if (urlField) {
            urlField.onclick = function () {
                urlField.select();
                urlField.setSelectionRange(0, 99999);
            };
        }

        if (stayBtn) {
            stayBtn.onclick = function () {
                try { sessionStorage.setItem('inapp_stay', 'true'); } catch (e) {}
                if (typeof gtag === 'function') {
                    gtag('event', 'inapp_stay', { 'event_category': 'navigation' });
                }
                window.location.href = url;
            };
        }

        if (typeof gtag === 'function') {
            gtag('event', 'inapp_escape_shown', {
                'event_category': 'navigation',
                'platform': isAndroid ? 'android' : 'ios'
            });
        }
    };

    return {
        // 안내가 필요하면 띄우고 true, 아니면 false (그냥 이동하면 된다)
        guard: function (destHref) {
            if (!isInApp || stayed()) return false;
            show(destHref);
            return true;
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    /* 1. 인스타 등에서 ?target=meal 처럼 들어오면 해당 웹앱으로 바로 보낸다 */
    const TARGET_PAGES = {
        worldcup: './page/01/index.html',
        frog:     './page/02/index.html',
        treasure: './page/03/treasure-words.html',
        meal:     MEAL_PAGE,
    };
    const target = new URLSearchParams(window.location.search).get('target');
    if (TARGET_PAGES[target]) {
        // 식단표는 인앱에서 망가지므로 먼저 외부 브라우저 안내를 띄운다
        if (target === 'meal' && InAppEscape.guard(MEAL_PAGE)) return;
        window.location.replace(TARGET_PAGES[target]);
        return;
    }

    const track = (name, params) => {
        if (typeof gtag === 'function') gtag('event', name, params);
    };

    /* 2. 식단표 카드를 누르면 인앱일 때만 외부 브라우저 안내를 띄운다 */
    document.querySelectorAll(`a[href="${MEAL_PAGE}"]`).forEach(link => {
        link.addEventListener('click', e => {
            if (InAppEscape.guard(link.getAttribute('href'))) e.preventDefault();
        });
    });

    /* 3. 웹앱 · SNS 클릭 기록 */
    document.querySelectorAll('.app-card').forEach(card => {
        card.addEventListener('click', () => track('click_webapp_item', {
            event_category: 'content',
            app_name: card.querySelector('h3')?.textContent || 'App',
        }));
    });
    document.querySelector('.meal-shortcut')?.addEventListener('click', () => track('click_meal_shortcut', {
        event_category: 'content',
    }));
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => track('click_social', {
            event_category: 'content',
            platform: btn.dataset.social,
        }));
    });

    /* 4. 아빠의 추천템 — products.js 의 PRODUCTS 로 카드를 그린다
       배열 맨 아래에 붙인 상품이 가장 최근 것이므로, 거꾸로 뒤집어 최신순으로 보여준다 */
    const picks = typeof PRODUCTS !== 'undefined' ? [...PRODUCTS].reverse() : [];
    const picksSection = document.getElementById('picksSection');
    const pickGrid = document.getElementById('pickGrid');
    const pickTabs = document.getElementById('pickTabs');

    if (!picks.length) {
        picksSection.classList.add('hidden');
        return;
    }

    const escapeHtml = str => String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));

    const renderPicks = cat => {
        pickGrid.innerHTML = picks
            .filter(p => !cat || p.cat === cat)
            .map(p => `<article class="pick-card">
                <a class="pick-thumb" href="${escapeHtml(p.url)}" target="_blank" rel="sponsored noopener" data-pick="${escapeHtml(p.name)}">
                    ${p.img
                        ? `<img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.name)}" loading="lazy" referrerpolicy="no-referrer">`
                        : '<span class="pick-noimg"><i class="fa-solid fa-bag-shopping"></i></span>'}
                    ${p.badge ? `<span class="pick-badge">${escapeHtml(p.badge)}</span>` : ''}
                </a>
                <div class="pick-body">
                    <h3>${escapeHtml(p.name)}</h3>
                    <p>${escapeHtml(p.note)}</p>
                    <div class="pick-actions">
                        <a class="pick-buy" href="${escapeHtml(p.url)}" target="_blank" rel="sponsored noopener" data-pick="${escapeHtml(p.name)}">쿠팡에서 보기</a>
                        ${p.video ? `<a class="pick-video" href="${escapeHtml(p.video)}" target="_blank" rel="noopener"><i class="fa-brands fa-youtube"></i> 영상</a>` : ''}
                    </div>
                </div>
            </article>`)
            .join('');
    };

    /* 카테고리가 두 개 이상일 때만 탭을 보여준다 */
    const cats = [...new Set(PRODUCTS.map(p => p.cat))]; // 탭 순서는 등록 순서 그대로
    if (cats.length > 1) {
        pickTabs.innerHTML = ['전체', ...cats]
            .map((c, i) => `<button type="button" role="tab" class="pick-tab${i ? '' : ' active'}" data-cat="${i ? escapeHtml(c) : ''}">${escapeHtml(c)}</button>`)
            .join('');
        pickTabs.classList.remove('hidden');
        pickTabs.addEventListener('click', e => {
            const tab = e.target.closest('.pick-tab');
            if (!tab) return;
            pickTabs.querySelectorAll('.pick-tab').forEach(t => t.classList.toggle('active', t === tab));
            renderPicks(tab.dataset.cat);
        });
    }
    renderPicks('');

    /* PC 화살표: 한 번에 보이는 폭만큼 넘기고, 끝에 닿으면 그쪽 화살표를 숨긴다 */
    const pickPrev = document.getElementById('pickPrev');
    const pickNext = document.getElementById('pickNext');
    const updatePickNav = () => {
        const max = pickGrid.scrollWidth - pickGrid.clientWidth;
        pickPrev.disabled = pickGrid.scrollLeft <= 8; // 스냅이 첫 카드 앞 여백(4px)만큼 밀어 둔다
        pickNext.disabled = pickGrid.scrollLeft >= max - 8;
    };
    pickPrev.addEventListener('click', () => pickGrid.scrollBy({ left: -pickGrid.clientWidth * 0.8, behavior: 'smooth' }));
    pickNext.addEventListener('click', () => pickGrid.scrollBy({ left: pickGrid.clientWidth * 0.8, behavior: 'smooth' }));
    pickGrid.addEventListener('scroll', updatePickNav, { passive: true });
    window.addEventListener('resize', updatePickNav);
    pickTabs.addEventListener('click', () => { pickGrid.scrollLeft = 0; updatePickNav(); });
    updatePickNav();

    pickGrid.addEventListener('click', e => {
        const link = e.target.closest('[data-pick]');
        if (link) track('click_pick_item', { event_category: 'monetization', item_name: link.dataset.pick });
    });
});
