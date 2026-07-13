document.addEventListener('DOMContentLoaded', () => {
    // 1. YouTube Fetch Functionality
    const CHANNEL_ID = 'UCGPFR68NtBH0scTCzvnMzIw'; // @et_dad channel ID
    const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
    const contentContainer = document.getElementById('contentContainer');
    
    // We declare contentCards globally so search can access it
    let contentCards = [];

    // 1.5 Horizontal Scroll Logic
    const scrollLeftBtn = document.getElementById('scrollLeft');
    const scrollRightBtn = document.getElementById('scrollRight');
    
    if (scrollLeftBtn && scrollRightBtn && contentContainer) {
        // Arrow Buttons
        scrollLeftBtn.addEventListener('click', () => {
            contentContainer.scrollBy({ left: -200, behavior: 'smooth' });
        });
        scrollRightBtn.addEventListener('click', () => {
            contentContainer.scrollBy({ left: 200, behavior: 'smooth' });
        });

        // Mouse Drag to Scroll (for desktop)
        let isDown = false;
        let startX;
        let scrollLeft;

        contentContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            contentContainer.style.cursor = 'grabbing';
            contentContainer.style.scrollSnapType = 'none'; // disable snap during drag
            startX = e.pageX - contentContainer.offsetLeft;
            scrollLeft = contentContainer.scrollLeft;
        });
        contentContainer.addEventListener('mouseleave', () => {
            isDown = false;
            contentContainer.style.cursor = 'grab';
            contentContainer.style.scrollSnapType = 'x mandatory';
        });
        contentContainer.addEventListener('mouseup', () => {
            isDown = false;
            contentContainer.style.cursor = 'grab';
            contentContainer.style.scrollSnapType = 'x mandatory';
        });
        contentContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault(); // prevent text selection
            const x = e.pageX - contentContainer.offsetLeft;
            const walk = (x - startX) * 2; // scroll speed multiplier
            contentContainer.scrollLeft = scrollLeft - walk;
        });
        
        contentContainer.style.cursor = 'grab';
    }

    // 2. Search Functionality
    const searchInput = document.getElementById('searchInput');
    const appCards = document.querySelectorAll('.app-card');
    const noResults = document.getElementById('noResults');
    const profileSection = document.querySelector('.profile-section');
    
    // Select the sections to hide them if they are empty
    const contentSection = document.getElementById('contentContainer').closest('.section');
    const appSection = document.getElementById('appContainer').closest('.section');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let hasResults = false;
        let hasContentResults = false;
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

        // Filter Content Cards
        contentCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            
            if (title.includes(query)) {
                card.classList.remove('hidden');
                hasResults = true;
                hasContentResults = true;
            } else {
                card.classList.add('hidden');
            }
        });
        
        // Hide empty sections when searching
        if (query.length > 0) {
            contentSection.style.display = hasContentResults ? 'block' : 'none';
            appSection.style.display = hasAppResults ? 'block' : 'none';
        } else {
            contentSection.style.display = 'block';
            appSection.style.display = 'block';
        }

        // Toggle No Results Message
        if (!hasResults && query.length > 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    });

    // 3. Coupang Partners Modal Interceptor Function
    const COUPANG_URL = 'https://link.coupang.com/a/eTRm2BNzEG';
    const modal = document.getElementById('coupangModal');
    const modalClose = document.getElementById('modalClose');
    const supportBtn = document.getElementById('supportBtn');
    
    let currentTargetHref = '';
    let currentTargetType = '';

    // Safe localStorage wrapper for in-app browsers (like Instagram)
    const checkVisitedCoupang = () => {
        try {
            return localStorage.getItem('coupang_visited');
        } catch (e) {
            console.warn('localStorage access denied:', e);
            return window._coupangVisitedFallback;
        }
    };

    const setVisitedCoupang = () => {
        try {
            localStorage.setItem('coupang_visited', 'true');
        } catch (e) {
            console.warn('localStorage access denied:', e);
        }
        window._coupangVisitedFallback = true;
    };

    // 4. Shared Link Target Routing Logic
    const urlParams = new URLSearchParams(window.location.search);
    const target = urlParams.get('target');
    
    if (target === 'frog' || target === 'worldcup') {
        const hasVisitedCoupang = checkVisitedCoupang();
        currentTargetHref = target === 'frog' ? './page/02/index.html' : './page/01/index.html';
        currentTargetType = '_self';
        
        if (!hasVisitedCoupang) {
            modal.classList.remove('hidden');
        } else {
            window.location.href = currentTargetHref;
        }
    };

    // Function to navigate to the original link
    const navigateToTarget = () => {
        if (currentTargetType === '_blank') {
            window.open(currentTargetHref, '_blank');
        } else {
            window.location.href = currentTargetHref;
        }
    };

    // Modal Close Events
    const closeModal = () => modal.classList.add('hidden');
    modalClose.addEventListener('click', closeModal);
    
    // Support Button Event
    supportBtn.addEventListener('click', () => {
        if (typeof gtag === 'function') gtag('event', 'click_coupang_support', { 'event_category': 'monetization' });
        setVisitedCoupang();
        
        try {
            window.open(COUPANG_URL, '_blank');
        } catch (e) {
            window.location.href = COUPANG_URL; // fallback if window.open is blocked
        }
        
        closeModal();
        setTimeout(navigateToTarget, 300);
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

    // Fetch and render YouTube videos
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'ok' && data.items.length > 0) {
                contentContainer.innerHTML = ''; // clear loading spinner
                
                data.items.slice(0, 10).forEach(item => {
                    const card = document.createElement('a');
                    card.href = item.link;
                    card.className = 'content-card intercepted-link';
                    card.target = '_blank';
                    
                    // Format date (e.g., 2023. 10. 25.)
                    const pubDate = new Date(item.pubDate.replace(' ', 'T')).toLocaleDateString();
                    
                    const safeTitle = item.title.replace(/"/g, '&quot;');
                    
                    card.innerHTML = `
                        <div class="content-thumb">
                            <img src="${item.thumbnail}" class="thumb-img" alt="${safeTitle}">
                            <div class="play-overlay"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <div class="content-info">
                            <div class="content-info-header">
                                <h3 title="${safeTitle}">${item.title}</h3>
                                <i class="fa-solid fa-ellipsis-vertical more-icon"></i>
                            </div>
                            <p>${pubDate}</p>
                        </div>
                    `;
                    
                    contentContainer.appendChild(card);
                    contentCards.push(card);
                    
                    card.addEventListener('click', () => {
                        if (typeof gtag === 'function') gtag('event', 'click_youtube_item', { 'event_category': 'content', 'video_title': item.title });
                    });
                    
                    attachInterceptor(card); // Attach redirect logic to dynamic items
                });
            } else {
                contentContainer.innerHTML = '<p class="section-desc" style="padding: 20px;">최신 영상을 불러올 수 없습니다.</p>';
            }
        })
        .catch(err => {
            console.error('Error fetching YouTube data:', err);
            contentContainer.innerHTML = '<p class="section-desc" style="padding: 20px;">영상을 불러오는 중 오류가 발생했습니다.</p>';
        });
});
