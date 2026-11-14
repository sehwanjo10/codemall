/* ============================================================
   쿠팡 링크 여는 방법 (랜딩 · 식단표 공용)
   ------------------------------------------------------------
   link.coupang.com 은 이동 중에 쿠팡 앱을 호출한다.

   1) 크롬·사파리(모바일)
      새 탭(target="_blank")으로 열면 그 탭에는 '사용자가 누른 동작'이
      없어서 앱 호출이 막히고 "애플리케이션을 열 수 없습니다" 창이 뜬다.
      → 같은 탭으로 연다.

   2) 유튜브·인스타·카톡 같은 앱 안의 브라우저(인앱)
      → 누르자마자 크롬(안드로이드)·사파리(iOS)로 넘겨 본다.
      → 앱이 막으면(특히 iOS 인스타) 0.9초 뒤 그 자리에서 바로 쿠팡으로 간다.
      안내 창·링크 복사 같은 중간 단계는 띄우지 않는다. 한 번 누르면 끝.
      쿠팡이 안 열려서 뒤로 돌아온 사람에게만 아래쪽에 작은 띠를 보여 준다.

   어느 경우든 파트너스 링크 주소는 그대로라 수수료 추적에는 영향이 없다.
   ============================================================ */
(function () {
    var ua = navigator.userAgent || '';
    var isAndroid = /Android/i.test(ua);
    var isIOS = /iPhone|iPad|iPod/i.test(ua);

    /*
     * 앱 안에 내장된 브라우저인지 확인한다.
     * - 이름으로 알 수 있는 앱: 인스타·페북·카톡·네이버·라인·다음·에타·유튜브
     * - 이름이 없어도: 안드로이드 WebView는 UA에 '; wv)'가 붙고,
     *   iOS WKWebView는 사파리·iOS 크롬과 달리 'Safari/' 표시가 없다.
     */
    var isInApp = /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|NAVER\(inapp|Line\/|DaumApps|everytimeApp|YouTube|com\.google\.ios\.youtube/i.test(ua)
        || (isAndroid && /; wv\)/.test(ua))
        || (isIOS && !/Safari\//.test(ua));

    window.isInAppBrowserUA = function () { return isInApp; };

    if (!isAndroid && !isIOS) return;

    var isCoupang = function (href) {
        return /^https:\/\/(link|www|m)\.coupang\.com\//.test(href);
    };

    var PENDING_KEY = 'cp_pending';
    var store = {
        set: function (v) { try { sessionStorage.setItem(PENDING_KEY, v); } catch (e) {} },
        take: function () {
            try {
                var v = sessionStorage.getItem(PENDING_KEY);
                sessionStorage.removeItem(PENDING_KEY);
                return v;
            } catch (e) { return null; }
        }
    };

    var track = function (name, params) {
        if (typeof gtag === 'function') gtag('event', name, params);
    };

    /* 크롬·사파리로 넘긴다. 크롬이 없으면 이 화면에서 그대로 연다. */
    var openOutside = function (url) {
        if (isAndroid) {
            window.location.href = 'intent://' + url.replace(/^https?:\/\//, '')
                + '#Intent;scheme=https;package=com.android.chrome;'
                + 'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
        } else {
            window.location.href = 'x-safari-' + url;
        }
    };

    /* ---------- 아래쪽 작은 띠 (이동 중 / 안 열렸을 때) ---------- */
    var css = ''
        + '.cp-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;'
        + 'max-width:440px;margin:0 auto;background:#222;color:#fff;border-radius:14px;padding:12px 14px;'
        + 'display:flex;align-items:center;gap:10px;font-size:14px;line-height:1.4;box-shadow:0 6px 24px rgba(0,0,0,.25);font-family:inherit}'
        + '.cp-bar span{flex:1}'
        + '.cp-bar button{border:0;border-radius:10px;padding:8px 12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}'
        + '.cp-bar .cp-go{background:#e52528;color:#fff}'
        + '.cp-bar .cp-copy{background:#444;color:#fff}'
        + '.cp-bar .cp-x{background:none;color:#aaa;padding:4px 2px;font-size:18px}';

    var bar, styled = false;

    var hideBar = function () {
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        bar = null;
    };

    var showBar = function (html, bind) {
        if (!styled) {
            var style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            styled = true;
        }
        hideBar();
        bar = document.createElement('div');
        bar.className = 'cp-bar';
        bar.setAttribute('role', 'status');
        bar.innerHTML = html;
        document.body.appendChild(bar);
        if (bind) bind(bar);
    };

    var copyText = function (text, btn) {
        var done = function () { btn.textContent = '복사됨'; };
        var fallback = function () {
            var t = document.createElement('textarea');
            t.value = text;
            t.setAttribute('readonly', '');
            t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
            document.body.appendChild(t);
            t.select();
            t.setSelectionRange(0, 99999);
            try { if (document.execCommand('copy')) done(); } catch (e) {}
            document.body.removeChild(t);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallback);
        } else {
            fallback();
        }
    };

    /* 인앱에서 쿠팡 링크를 눌렀을 때: 바깥 브라우저 시도 → 막히면 바로 이동 */
    var goInApp = function (url) {
        showBar('<span>쿠팡으로 이동 중…</span>');
        track('coupang_inapp_escape', { event_category: 'monetization', platform: isAndroid ? 'android' : 'ios' });

        openOutside(url);

        setTimeout(function () {
            if (document.hidden) { hideBar(); return; } // 크롬·사파리로 넘어감
            // 앱이 막았다. 묻지 않고 이 화면에서 바로 쿠팡으로 간다.
            store.set(url);
            track('coupang_inapp_direct', { event_category: 'monetization', platform: isAndroid ? 'android' : 'ios' });
            window.location.href = url;
        }, 900);
    };

    /* 쿠팡이 안 열려서 뒤로 돌아온 사람에게만 보여 준다 */
    var offerRetry = function () {
        var url = store.take();
        if (!url || !isInApp) return;
        var browser = isAndroid ? '크롬' : '사파리';
        showBar(
            '<span>쿠팡 안 열렸나요?</span>'
            + '<button type="button" class="cp-copy">링크 복사</button>'
            + '<button type="button" class="cp-go">다시 열기</button>'
            + '<button type="button" class="cp-x" aria-label="닫기">✕</button>',
            function (el) {
                el.querySelector('.cp-go').addEventListener('click', function () {
                    hideBar();
                    window.location.href = url;
                });
                el.querySelector('.cp-copy').addEventListener('click', function (e) {
                    copyText(url, e.currentTarget);
                    el.querySelector('span').textContent = browser + ' 주소창에 붙여넣으세요';
                });
                el.querySelector('.cp-x').addEventListener('click', hideBar);
            }
        );
        track('coupang_inapp_returned', { event_category: 'monetization' });
    };

    window.addEventListener('pageshow', function () {
        hideBar();
        offerRetry();
    });

    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || !isCoupang(a.href)) return;
        e.preventDefault();
        var href = a.href;

        if (isInApp) {
            goInApp(href);
            return;
        }
        // 클릭 기록(gtag)이 먼저 나가도록 한 박자 늦게 이동한다
        setTimeout(function () { window.location.href = href; }, 50);
    });
})();
