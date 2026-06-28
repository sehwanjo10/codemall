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

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let hasResults = false;

        // Filter App Cards
        appCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const desc = card.querySelector('p').textContent.toLowerCase();
            
            if (title.includes(query) || desc.includes(query)) {
                card.classList.remove('hidden');
                hasResults = true;
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
            } else {
                card.classList.add('hidden');
            }
        });

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
    const skipBtn = document.getElementById('skipBtn');
    
    let currentTargetHref = '';
    let currentTargetType = '';

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
    skipBtn.addEventListener('click', () => {
        if (typeof gtag === 'function') gtag('event', 'click_coupang_skip', { 'event_category': 'monetization' });
        closeModal();
        navigateToTarget();
    });
    
    // Support Button Event
    supportBtn.addEventListener('click', () => {
        if (typeof gtag === 'function') gtag('event', 'click_coupang_support', { 'event_category': 'monetization' });
        localStorage.setItem('coupang_visited', 'true');
        window.open(COUPANG_URL, '_blank');
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

            const hasVisitedCoupang = localStorage.getItem('coupang_visited');

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
