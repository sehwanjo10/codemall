/* ============================================================
   인앱 브라우저 탈출 (식단표로 들어갈 때만)
   ------------------------------------------------------------
   인스타그램·카카오톡 안에 내장된 브라우저에서는 식단표의
   인쇄·PDF 저장, 링크 복사, 만든 식단 저장이 망가진다.
   랜딩 페이지는 인앱에서도 문제없으니 들어오자마자 막지 않고,
   식단표로 넘어가려는 순간에만 크롬·사파리로 넘기자고 안내한다.

   외부 브라우저 모바일에서는 쿠팡 링크를 같은 탭으로 연다 (파일 맨 아래 참고).
   ============================================================ */
var MEAL_PAGE = './page/04/index.html';

var InAppEscape = (function () {
    var ua = navigator.userAgent || '';
    var isInApp = /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|NAVER\(inapp|Line\/|DaumApps|everytimeApp/i.test(ua);
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
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => track('click_social', {
            event_category: 'content',
            platform: btn.dataset.social,
        }));
    });

    /* 4. 아빠의 추천템 — products.js 의 PRODUCTS 로 카드를 그린다 */
    const picks = typeof PRODUCTS !== 'undefined' ? PRODUCTS : [];
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
                    <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.name)}" loading="lazy" referrerpolicy="no-referrer">
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
    const cats = [...new Set(picks.map(p => p.cat))];
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

    pickGrid.addEventListener('click', e => {
        const link = e.target.closest('[data-pick]');
        if (link) track('click_pick_item', { event_category: 'monetization', item_name: link.dataset.pick });
    });
});

/* ============================================================
   모바일에서 쿠팡 링크는 같은 탭으로 연다
   ------------------------------------------------------------
   link.coupang.com 은 이동 중에 쿠팡 앱을 호출한다. 그런데 새 탭
   (target="_blank")으로 열면 그 탭에는 '사용자가 누른 동작'이 없어서
   iOS 크롬·사파리가 앱 호출을 막고 "문제가 발생했습니다. 애플리케이션을
   열 수 없습니다" 창을 띄운다. 같은 탭으로 열면 누른 동작이 그대로
   이어져 앱이 열리고, 앱이 없으면 쿠팡 모바일 웹으로 넘어간다.
   파트너스 링크 주소는 그대로라 수수료 추적에는 영향이 없다.
   ============================================================ */
(function openCoupangInSameTabOnMobile() {
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) return;
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || !/^https:\/\/(link|www|m)\.coupang\.com\//.test(a.href)) return;
        e.preventDefault();
        var href = a.href;
        // 클릭 기록(gtag)이 먼저 나가도록 한 박자 늦게 이동한다
        setTimeout(function () { window.location.href = href; }, 50);
    });
})();
