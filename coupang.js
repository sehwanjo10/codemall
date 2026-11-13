/* ============================================================
   쿠팡 링크 여는 방법 (랜딩 · 식단표 공용)
   ------------------------------------------------------------
   link.coupang.com 은 이동 중에 쿠팡 앱을 호출한다.

   1) 크롬·사파리(모바일)
      새 탭(target="_blank")으로 열면 그 탭에는 '사용자가 누른 동작'이
      없어서 앱 호출이 막히고 "애플리케이션을 열 수 없습니다" 창이 뜬다.
      → 같은 탭으로 연다.

   2) 유튜브·인스타·카톡 같은 앱 안의 브라우저(인앱)
      앱 호출 자체를 처리하지 못한다. "다른 애플리케이션을 열려고
      합니다"를 허용해도 결국 "애플리케이션을 열 수 없습니다"로 끝나고
      쿠팡 웹으로 넘어가지도 않는다.
      → 쿠팡 링크를 크롬(안드로이드)·사파리(iOS)로 넘겨서 연다.
        자동으로 안 넘어가면 '⋯ → 외부 브라우저로 열기'와 링크 복사를 안내한다.

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

    /* 크롬·사파리로 넘긴다. 앱이 막으면 화면이 그대로 남는다. */
    var openOutside = function (url) {
        if (isAndroid) {
            window.location.href = 'intent://' + url.replace(/^https?:\/\//, '')
                + '#Intent;scheme=https;package=com.android.chrome;end';
        } else {
            window.location.href = 'x-safari-' + url;
        }
    };

    /* ---------- 인앱 안내 창 ---------- */
    var css = ''
        + '.cp-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;font-family:inherit}'
        + '.cp-ov.cp-hidden{display:none}'
        + '.cp-box{position:relative;width:100%;max-width:440px;background:#fff;color:#222;border-radius:20px 20px 0 0;padding:26px 20px calc(22px + env(safe-area-inset-bottom));box-sizing:border-box;text-align:center;line-height:1.5}'
        + '.cp-x{position:absolute;top:10px;right:12px;border:0;background:none;font-size:22px;color:#888;padding:6px;cursor:pointer}'
        + '.cp-box h2{margin:0 0 8px;font-size:19px}'
        + '.cp-box p{margin:0 0 14px;font-size:14.5px;color:#555}'
        + '.cp-btn{display:block;width:100%;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:700;background:#e52528;color:#fff;cursor:pointer;margin-bottom:10px;font-family:inherit}'
        + '.cp-btn.cp-sub{background:#f1f1f3;color:#222;font-weight:600}'
        + '.cp-fail{background:#fff4e5;color:#8a5300!important;border-radius:10px;padding:10px;font-size:14px!important}'
        + '.cp-fail.cp-hidden,.cp-url.cp-hidden{display:none}'
        + '.cp-url{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;resize:none;margin-bottom:10px;color:#333;background:#fafafa}';

    var overlay, failEl, urlEl, copyBtn, current = '';

    var build = function () {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        var dots = isAndroid ? '⋮' : '⋯';
        var browser = isAndroid ? '크롬' : '사파리';
        overlay = document.createElement('div');
        overlay.className = 'cp-ov cp-hidden';
        overlay.innerHTML = ''
            + '<div class="cp-box" role="dialog" aria-modal="true" aria-labelledby="cpTitle">'
            + '<button type="button" class="cp-x" aria-label="닫기">✕</button>'
            + '<h2 id="cpTitle">쿠팡은 ' + browser + '에서 열어주세요</h2>'
            + '<p>유튜브·인스타 같은 앱 안에서는 쿠팡이 열리지 않아요.<br>'
            + '오른쪽 위 <b>' + dots + '</b> → <b>‘외부 브라우저로 열기’</b>를 눌러도 됩니다.</p>'
            + '<button type="button" class="cp-btn cp-go">' + browser + '로 쿠팡 열기</button>'
            + '<p class="cp-fail cp-hidden">앱이 자동 이동을 막고 있어요.<br>아래 링크를 복사해서 ' + browser + ' 주소창에 붙여넣어 주세요.</p>'
            + '<textarea class="cp-url cp-hidden" readonly rows="2"></textarea>'
            + '<button type="button" class="cp-btn cp-sub cp-copy">링크 복사하기</button>'
            + '</div>';
        document.body.appendChild(overlay);

        failEl = overlay.querySelector('.cp-fail');
        urlEl = overlay.querySelector('.cp-url');
        copyBtn = overlay.querySelector('.cp-copy');

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay || e.target.closest('.cp-x')) close();
        });
        overlay.querySelector('.cp-go').addEventListener('click', function () { tryOpen(); });
        urlEl.addEventListener('click', function () {
            urlEl.select();
            urlEl.setSelectionRange(0, 99999);
        });
        copyBtn.addEventListener('click', copy);
    };

    var close = function () {
        overlay.classList.add('cp-hidden');
        document.body.style.overflow = '';
    };

    var showManual = function () {
        failEl.classList.remove('cp-hidden');
        urlEl.classList.remove('cp-hidden');
    };

    var tryOpen = function () {
        openOutside(current);
        // 1.2초 뒤에도 이 화면이 보이면 앱이 막은 것이다
        setTimeout(function () {
            if (!document.hidden) showManual();
        }, 1200);
    };

    var copy = function () {
        var done = function () { copyBtn.textContent = '복사했어요! 주소창에 붙여넣어 주세요'; };
        var manual = function () {
            showManual();
            urlEl.select();
            urlEl.setSelectionRange(0, 99999);
            try { if (document.execCommand('copy')) done(); } catch (e) {}
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(current).then(done, manual);
        } else {
            manual();
        }
    };

    var showInApp = function (url) {
        if (!overlay) build();
        current = url;
        urlEl.value = url;
        failEl.classList.add('cp-hidden');
        urlEl.classList.add('cp-hidden');
        copyBtn.textContent = '링크 복사하기';
        overlay.classList.remove('cp-hidden');
        document.body.style.overflow = 'hidden';

        if (typeof gtag === 'function') {
            gtag('event', 'coupang_inapp_escape', {
                event_category: 'monetization',
                platform: isAndroid ? 'android' : 'ios'
            });
        }

        // 누른 동작이 살아 있을 때 바로 한 번 넘겨본다
        tryOpen();
    };

    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || !isCoupang(a.href)) return;
        e.preventDefault();
        var href = a.href;

        if (isInApp) {
            showInApp(href);
            return;
        }
        // 클릭 기록(gtag)이 먼저 나가도록 한 박자 늦게 이동한다
        setTimeout(function () { window.location.href = href; }, 50);
    });
})();
