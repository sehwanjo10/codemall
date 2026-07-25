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
    const urlParams = new URLSearchParams(window.location.search);
    const target = urlParams.get('target');
    
    if (target === 'frog' || target === 'worldcup' || target === 'treasure') {
        const hasVisitedCoupang = checkVisitedCoupang();
        currentTargetHref = target === 'frog' ? './page/02/index.html' : 
                            target === 'worldcup' ? './page/01/index.html' : 
                            './page/03/treasure-words.html';
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
