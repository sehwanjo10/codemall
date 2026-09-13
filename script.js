/* ============================================================
   인앱 브라우저 탈출
   ------------------------------------------------------------
   인스타그램·카카오톡 안에 내장된 브라우저에서는 세 가지가 망가진다.
   1) target="_blank"가 새 탭을 못 열어, 쿠팡으로 넘어가면 돌아오지 못한다
   2) window.print()가 구현되어 있지 않아 인쇄·PDF 저장이 안 된다
   3) 클립보드 복사가 조용히 실패해서 링크 복사도 되지 않는다
   그래서 들어오자마자 크롬·사파리로 넘긴다.

   쿠팡 모달 로직은 전혀 건드리지 않는다. 외부 브라우저에서 새 세션으로
   똑같이 동작하고, 오히려 거기서는 새 탭이 정상적으로 열려 제대로 작동한다.
   ============================================================ */
(function escapeInAppBrowser() {
    var ua = navigator.userAgent || '';
    var isInApp = /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|NAVER\(inapp|Line\/|DaumApps|everytimeApp/i.test(ua);
    if (!isInApp) return;

    // '여기서 볼게요'를 고른 사람에게는 다시 묻지 않는다
    try {
        if (sessionStorage.getItem('inapp_stay') === 'true') return;
    } catch (e) { /* 저장소가 막혀 있으면 그냥 진행 */ }

    var isAndroid = /Android/i.test(ua);
    var url = window.location.href;

    var overlay = document.getElementById('inappOverlay');
    if (!overlay) return;

    var openBtn  = document.getElementById('inappOpenBtn');
    var stayBtn  = document.getElementById('inappStayBtn');
    var failMsg  = document.getElementById('inappFail');
    var urlBox   = document.getElementById('inappUrlBox');
    var urlField = document.getElementById('inappUrl');

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

    // 들어오자마자 한 번만 조용히 시도한다 (안드로이드는 대체로 이 단계에서 넘어간다)
    setTimeout(jump, 150);

    if (openBtn) openBtn.addEventListener('click', jump);

    if (urlField) {
        urlField.addEventListener('click', function () {
            urlField.select();
            urlField.setSelectionRange(0, 99999);
        });
    }

    if (stayBtn) {
        stayBtn.addEventListener('click', function () {
            try { sessionStorage.setItem('inapp_stay', 'true'); } catch (e) {}
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
            if (typeof gtag === 'function') {
                gtag('event', 'inapp_stay', { 'event_category': 'navigation' });
            }
        });
    }

    if (typeof gtag === 'function') {
        gtag('event', 'inapp_escape_shown', {
            'event_category': 'navigation',
            'platform': isAndroid ? 'android' : 'ios'
        });
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Search Functionality
    const searchInput = document.getElementById('searchInput');
    const appCards = document.querySelectorAll('.app-card');
    const noResults = document.getElementById('noResults');
    const profileSection = document.querySelector('.profile-section');
    
    // Select the sections to hide them if they are empty
    const appSection = document.getElementById('appContainer').closest('.section');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let hasResults = false;
        let hasAppResults = false;

        // Hide Profile Section when searching
        if (query.length > 0) {
            profileSection.style.display = 'none';
        } else {
            profileSection.style.display = 'flex';
        }

        // Filter App Cards
        appCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const desc = card.querySelector('p').textContent.toLowerCase();
            
            if (title.includes(query) || desc.includes(query)) {
                card.classList.remove('hidden');
                hasResults = true;
                hasAppResults = true;
            } else {
                card.classList.add('hidden');
            }
        });

        // Hide empty sections when searching
        if (query.length > 0) {
            appSection.style.display = hasAppResults ? 'block' : 'none';
        } else {
            appSection.style.display = 'block';
        }

        // Toggle No Results Message
        if (!hasResults && query.length > 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    });

    // 2. Coupang Partners Modal Interceptor Function
    const COUPANG_URL = 'https://link.coupang.com/a/eTRm2BNzEG';
    const modal = document.getElementById('coupangModal');
    const modalClose = document.getElementById('modalClose');
    const supportBtn = document.getElementById('supportBtn');
    
    let currentTargetHref = '';
    let currentTargetType = '';

    // Safe sessionStorage wrapper for in-app browsers (like Instagram)
    // Temporary bypass: Always return true to disable Coupang modal window
    const checkVisitedCoupang = () => {
        try {
            return sessionStorage.getItem('coupang_visited') === 'true' || window._coupangVisitedFallback;
        } catch (e) {
            return window._coupangVisitedFallback || false;
        }
    };

    const setVisitedCoupang = () => {
        try {
            sessionStorage.setItem('coupang_visited', 'true');
        } catch (e) {
            console.warn('sessionStorage access denied:', e);
        }
        window._coupangVisitedFallback = true;
    };

    // 3. Shared Link Target Routing Logic
    const TARGET_PAGES = {
        worldcup: './page/01/index.html',
        frog:     './page/02/index.html',
        treasure: './page/03/treasure-words.html',
        meal:     './page/04/index.html',
    };

    const urlParams = new URLSearchParams(window.location.search);
    const target = urlParams.get('target');

    if (TARGET_PAGES[target]) {
        const hasVisitedCoupang = checkVisitedCoupang();
        currentTargetHref = TARGET_PAGES[target];
        currentTargetType = '_self';

        if (!hasVisitedCoupang) {
            modal.classList.remove('hidden');
        } else {
            window.location.href = currentTargetHref;
        }
    }

    // Function to navigate to the original link
    const navigateToTarget = () => {
        window.location.href = currentTargetHref;
    };

    // Modal Close Events
    const closeModal = () => modal.classList.add('hidden');
    modalClose.addEventListener('click', closeModal);
    
    // Support Button Event
    supportBtn.addEventListener('click', (e) => {
        if (typeof gtag === 'function') gtag('event', 'click_coupang_support', { 'event_category': 'monetization' });
        setVisitedCoupang();
        
        closeModal();
        setTimeout(navigateToTarget, 500);
    });

    const attachInterceptor = (link) => {
        link.addEventListener('click', (e) => {
            if (typeof gtag === 'function') {
                if (link.classList.contains('app-card')) {
                    gtag('event', 'click_webapp_item', { 'event_category': 'content', 'app_name': link.querySelector('h3')?.textContent || 'App' });
                }
            }

            const hasVisitedCoupang = checkVisitedCoupang();

            if (!hasVisitedCoupang) {
                e.preventDefault();
                currentTargetHref = link.getAttribute('href');
                currentTargetType = link.getAttribute('target');
                modal.classList.remove('hidden');
            }
        });
    };

    // Attach interceptor to existing static links
    const existingInterceptedLinks = document.querySelectorAll('.intercepted-link, .social-btn');
    existingInterceptedLinks.forEach(attachInterceptor);
});
