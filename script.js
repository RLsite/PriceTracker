/*!
 * Price Tracker - Interactive JavaScript
 * מעקב מחירים - קוד JavaScript אינטראקטיבי
 * Version: 1.0.0
 */

// ===================================
// Global Variables & Configuration
// ===================================
const CONFIG = {
    API_BASE_URL: 'https://api.pricetracker.co.il', // כרגע לא קיים - לעתיד
    SEARCH_DELAY: 300, // דחיית חיפוש במילישניות
    ANIMATION_SPEED: 300,
    MAX_SEARCH_RESULTS: 20,
    
    // Store configurations
    STORES: {
        ksp: { name: 'KSP', logo: 'K', color: '#667eea' },
        bug: { name: 'Bug', logo: 'B', color: '#e74c3c' },
        zap: { name: 'זאפ', logo: 'Z', color: '#27ae60' },
        ivory: { name: 'Ivory', logo: 'I', color: '#f39c12' },
        plonter: { name: 'Plonter', logo: 'P', color: '#9b59b6' }
    },
    
    // Hebrew product categories
    CATEGORIES: {
        'electronics': 'אלקטרוניקה',
        'computers': 'מחשבים', 
        'phones': 'סלולר',
        'home': 'בית וגן',
        'fashion': 'אופנה',
        'books': 'ספרים',
        'toys': 'צעצועים'
    }
};

// Global state
let searchTimeout;
let currentSearch = '';
let animationObserver;

// ===================================
// Utility Functions
// ===================================

/**
 * קיצור ל-querySelector
 */
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/**
 * פונקציה לדחיית ביצוע (debounce)
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * פונקציה לעיצוב מחירים
 */
function formatPrice(price) {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 0
    }).format(price);
}

/**
 * פונקציה לבדיקה אם אלמנט נראה במסך
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * פונקציה להצגת הודעות toast
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // סגנון הtoast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '10px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '10000',
        transform: 'translateX(400px)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });
    
    // צבעים לפי סוג
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    toast.style.background = colors[type] || colors.info;
    
    document.body.appendChild(toast);
    
    // אנימציה של כניסה
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // הסרה אחרי זמן מוגדר
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}

/**
 * פונקציה ליצירת loading spinner
 */
function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-circle"></div>
        <div class="spinner-text">מחפש מוצרים...</div>
    `;
    
    // CSS inline לspinner
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            text-align: center;
        }
        .spinner-circle {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
        }
        .spinner-text {
            color: #666;
            font-size: 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    if (!document.querySelector('#spinner-styles')) {
        style.id = 'spinner-styles';
        document.head.appendChild(style);
    }
    
    return spinner;
}

// ===================================
// Animation Functions
// ===================================

/**
 * אנימציות כניסה לאלמנטים
 */
function initScrollAnimations() {
    // בדיקה אם Intersection Observer נתמך
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // הסרת האלמנט מהצפייה אחרי האנימציה
                    animationObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        // הוספת אלמנטים לצפייה
        $$('.feature-card, .store-card, .stat-card').forEach(el => {
            el.classList.add('animate-on-scroll');
            animationObserver.observe(el);
        });
    }
}

/**
 * אנימציית ספירת מספרים
 */
function animateNumbers() {
    const counters = $$('.stat-number');
    const targets = [5, 1000, 24, 100]; // המטרות לכל מונה
    
    counters.forEach((counter, index) => {
        const target = targets[index];
        const duration = 2000; // 2 שניות
        const step = target / (duration / 50);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counter.textContent = target + (target === 100 ? '%' : target === 24 ? '/7' : '+');
                clearInterval(timer);
            } else {
                const value = Math.floor(current);
                counter.textContent = value + (target === 100 ? '%' : target === 24 ? '/7' : '+');
            }
        }, 50);
    });
}

/**
 * אפקט typing לכותרות
 */
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// ===================================
// Search Functionality
// ===================================

/**
 * אתחול מערכת החיפוש
 */
function initSearchSystem() {
    const searchForm = $('#searchForm');
    const searchInput = $('#productName');
    const searchBtn = $('.search-btn');
    
    if (!searchForm || !searchInput) return;
    
    // טיפול בשליחת הטופס
    searchForm.addEventListener('submit', handleSearchSubmit);
    
    // חיפוש בזמן אמת (debounced)
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                showSearchSuggestions(query);
            } else {
                hideSearchSuggestions();
            }
        }, CONFIG.SEARCH_DELAY));
        
        // מחיקת הצעות כשהשדה מאבד פוקוס
        searchInput.addEventListener('blur', () => {
            setTimeout(hideSearchSuggestions, 200);
        });
    }
    
    // קיצורי מקלדת
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * טיפול בשליחת טופס החיפוש
 */
async function handleSearchSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const searchQuery = formData.get('productName')?.trim();
    const category = formData.get('category') || '';
    
    if (!searchQuery) {
        showToast('אנא הכנס שם מוצר לחיפוש', 'warning');
        $('#productName')?.focus();
        return;
    }
    
    // עדכון המצב הגלובלי
    currentSearch = searchQuery;
    
    // הפעלת אנימציית טעינה
    showSearchLoading();
    
    try {
        // ביצוע החיפוש
        const results = await performSearch(searchQuery, category);
        
        // הצגת התוצאות או מעבר לדף תוצאות
        if (results && results.length > 0) {
            redirectToResults(searchQuery, category);
        } else {
            showNoResults(searchQuery);
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showToast('שגיאה בביצוע החיפוש. נסה שוב.', 'error');
    } finally {
        hideSearchLoading();
    }
}

/**
 * ביצוע החיפוש בפועל
 */
async function performSearch(query, category = '') {
    // סימולציה של קריאה לAPI
    // בעתיד זה יהיה קריאה אמיתית לשרת
    
    return new Promise((resolve) => {
        setTimeout(() => {
            // נתונים מדומים לצורך הדגמה
            const mockResults = generateMockResults(query);
            resolve(mockResults);
        }, 1500 + Math.random() * 1000); // 1.5-2.5 שניות
    });
}

/**
 * יצירת תוצאות מדומות
 */
function generateMockResults(query) {
    const stores = Object.keys(CONFIG.STORES);
    const basePrice = 1000 + Math.random() * 4000; // מחיר בסיס
    
    return stores.map((storeKey, index) => {
        const store = CONFIG.STORES[storeKey];
        const priceVariation = (Math.random() - 0.5) * 500; // וריאציה של ±250₪
        const discount = Math.random() > 0.7 ? Math.random() * 0.3 : 0; // 30% סיכוי להנחה
        
        const originalPrice = basePrice + priceVariation;
        const currentPrice = originalPrice * (1 - discount);
        
        return {
            id: `${storeKey}_${Date.now()}_${index}`,
            name: `${query} - ${store.name}`,
            store: store.name,
            storeLogo: store.logo,
            originalPrice: discount > 0 ? originalPrice : null,
            currentPrice: currentPrice,
            discount: discount > 0 ? Math.round(discount * 100) : 0,
            availability: Math.random() > 0.8 ? 'אזל מהמלאי' : 'במלאי',
            inStock: Math.random() > 0.8 ? false : true,
            url: `https://${storeKey}.co.il/product/${encodeURIComponent(query)}`,
            rating: 3 + Math.random() * 2, // דירוג 3-5
            reviews: Math.floor(Math.random() * 500) + 10,
            imageUrl: `https://via.placeholder.com/200x200?text=${encodeURIComponent(store.logo)}`
        };
    }).sort((a, b) => a.currentPrice - b.currentPrice); // מיון לפי מחיר
}

/**
 * הצגת הצעות חיפוש
 */
function showSearchSuggestions(query) {
    const suggestionsContainer = createSuggestionsContainer();
    
    // הצעות מדומות בעברית
    const suggestions = [
        `${query} פרו`,
        `${query} 256GB`,
        `${query} במבצע`,
        `${query} זול`,
        `${query} משומש`
    ].filter(suggestion => suggestion !== query);
    
    suggestionsContainer.innerHTML = '';
    suggestions.forEach(suggestion => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'search-suggestion';
        suggestionElement.textContent = suggestion;
        suggestionElement.addEventListener('click', () => {
            $('#productName').value = suggestion;
            hideSearchSuggestions();
            $('#searchForm')?.dispatchEvent(new Event('submit'));
        });
        suggestionsContainer.appendChild(suggestionElement);
    });
    
    suggestionsContainer.style.display = 'block';
}

/**
 * יצירת מיכל הצעות החיפוש
 */
function createSuggestionsContainer() {
    let container = $('#searchSuggestions');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'searchSuggestions';
        container.className = 'search-suggestions';
        
        // סגנון inline
        Object.assign(container.style, {
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            background: 'white',
            border: '1px solid #e1e5e9',
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            zIndex: '1000',
            display: 'none',
            maxHeight: '200px',
            overflowY: 'auto'
        });
        
        // הוספת CSS לhover
        const style = document.createElement('style');
        style.textContent = `
            .search-suggestions {
                border-top: none !important;
            }
            .search-suggestion {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s ease;
            }
            .search-suggestion:hover {
                background-color: #f8f9fa;
            }
            .search-suggestion:last-child {
                border-bottom: none;
            }
        `;
        document.head.appendChild(style);
        
        // הכנסה אחרי שדה החיפוש
        const searchInput = $('#productName');
        if (searchInput && searchInput.parentNode) {
            searchInput.parentNode.style.position = 'relative';
            searchInput.parentNode.appendChild(container);
        }
    }
    
    return container;
}

/**
 * הסתרת הצעות החיפוש
 */
function hideSearchSuggestions() {
    const container = $('#searchSuggestions');
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * הצגת מצב טעינה בחיפוש
 */
function showSearchLoading() {
    const searchBtn = $('.search-btn');
    if (searchBtn) {
        searchBtn.classList.add('btn-loading');
        searchBtn.textContent = 'מחפש...';
        searchBtn.disabled = true;
    }
}

/**
 * הסתרת מצב טעינה בחיפוש
 */
function hideSearchLoading() {
    const searchBtn = $('.search-btn');
    if (searchBtn) {
        searchBtn.classList.remove('btn-loading');
        searchBtn.textContent = '🔍 חפש עכשיו';
        searchBtn.disabled = false;
    }
}

/**
 * מעבר לדף תוצאות
 */
function redirectToResults(query, category = '') {
    const params = new URLSearchParams({
        q: query,
        ...(category && { category })
    });
    
    // שמירת התוצאות בlocalStorage לדף התוצאות
    const searchData = {
        query,
        category,
        timestamp: Date.now(),
        results: generateMockResults(query)
    };
    
    try {
        localStorage.setItem('lastSearch', JSON.stringify(searchData));
    } catch (e) {
        console.warn('Could not save search to localStorage:', e);
    }
    
    // מעבר לדף תוצאות (אם קיים) או הצגת הודעה
    const resultsPageExists = checkIfPageExists('results.html');
    if (resultsPageExists) {
        window.location.href = `results.html?${params.toString()}`;
    } else {
        showSearchResults(searchData.results);
    }
}

/**
 * בדיקה אם עמוד קיים
 */
async function checkIfPageExists(page) {
    try {
        const response = await fetch(page, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * הצגת תוצאות באותו עמוד
 */
function showSearchResults(results) {
    // יצירת section תוצאות דינמי
    let resultsSection = $('#dynamicResults');
    
    if (!resultsSection) {
        resultsSection = document.createElement('section');
        resultsSection.id = 'dynamicResults';
        resultsSection.className = 'results-section glass-card';
        
        // הוספה אחרי הsearch section
        const searchSection = $('.search-section');
        if (searchSection && searchSection.parentNode) {
            searchSection.parentNode.insertBefore(resultsSection, searchSection.nextSibling);
        }
    }
    
    resultsSection.innerHTML = createResultsHTML(results);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * יצירת HTML לתוצאות
 */
function createResultsHTML(results) {
    const bestPrice = Math.min(...results.map(r => r.currentPrice));
    
    return `
        <h2 class="results-title">🎯 נמצאו ${results.length} תוצאות</h2>
        <div class="results-grid">
            ${results.map((result, index) => `
                <div class="result-card ${result.currentPrice === bestPrice ? 'best-deal' : ''}" 
                     style="animation-delay: ${index * 0.1}s">
                    ${result.currentPrice === bestPrice ? '<div class="best-deal-badge">🏆 הטוב ביותר</div>' : ''}
                    
                    <div class="result-image">
                        <div class="store-logo-large" style="background: ${CONFIG.STORES[result.store.toLowerCase()]?.color || '#667eea'}">
                            ${result.storeLogo}
                        </div>
                    </div>
                    
                    <div class="result-content">
                        <h3 class="result-title">${result.name}</h3>
                        <div class="result-store">
                            <span class="store-name">${result.store}</span>
                            <span class="availability ${result.inStock ? 'in-stock' : 'out-of-stock'}">
                                ${result.availability}
                            </span>
                        </div>
                        
                        <div class="price-section">
                            ${result.originalPrice ? `<div class="original-price">${formatPrice(result.originalPrice)}</div>` : ''}
                            <div class="current-price">${formatPrice(result.currentPrice)}</div>
                            ${result.discount > 0 ? `<div class="discount-badge">${result.discount}% הנחה</div>` : ''}
                        </div>
                        
                        <div class="result-actions">
                            <button class="btn btn-success btn-sm" onclick="window.open('${result.url}', '_blank')">
                                🛒 רכישה
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="trackPrice('${result.id}', '${result.name}', ${result.currentPrice})">
                                🔔 עקוב
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * הצגת הודעה על אין תוצאות
 */
function showNoResults(query) {
    showToast(`לא נמצאו תוצאות עבור "${query}". נסה מילות חיפוש אחרות.`, 'warning', 5000);
}

// ===================================
// Price Tracking Functions
// ===================================

/**
 * פתיחת מודל מעקב מחיר
 */
function trackPrice(productId, productName, currentPrice) {
    const modal = createPriceTrackingModal(productId, productName, currentPrice);
    document.body.appendChild(modal);
    
    // הצגה עם אנימציה
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

/**
 * יצירת מודל מעקב מחיר
 */
function createPriceTrackingModal(productId, productName, currentPrice) {
    const modal = document.createElement('div');
    modal.className = 'price-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closePriceModal(this.parentElement)"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>🔔 הגדר מעקב מחיר</h2>
                <button class="close-btn" onclick="closePriceModal(this.closest('.price-modal'))">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="product-summary">
                    <h3>${productName}</h3>
                    <div class="current-price-display">${formatPrice(currentPrice)}</div>
                </div>
                
                <form class="tracking-form" onsubmit="submitPriceTracking(event, '${productId}')">
                    <div class="form-group">
                        <label>כתובת אימייל *</label>
                        <input type="email" name="email" required placeholder="your@email.com">
                    </div>
                    
                    <div class="form-group">
                        <label>טלפון נייד (אופציונלי)</label>
                        <input type="tel" name="phone" placeholder="050-1234567">
                    </div>
                    
                    <div class="form-group">
                        <label>התראה כשהמחיר יורד מתחת ל:</label>
                        <input type="number" name="targetPrice" placeholder="${Math.floor(currentPrice * 0.9)}" min="1">
                        <small>השאר ריק למעקב אחר כל שינוי</small>
                    </div>
                    
                    <div class="form-group">
                        <label>משך המעקב</label>
                        <select name="duration" required>
                            <option value="7">שבוע</option>
                            <option value="14" selected>שבועיים</option>
                            <option value="30">חודש</option>
                            <option value="90">3 חודשים</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="instantAlerts" checked>
                            התראות מיידיות על שינויי מחיר
                        </label>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        🚀 התחל מעקב
                    </button>
                </form>
            </div>
        </div>
    `;
    
    // הוספת סגנונות למודל
    addModalStyles();
    
    return modal;
}

/**
 * הוספת סגנונות למודל
 */
function addModalStyles() {
    if (document.querySelector('#modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
        .price-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .price-modal.show {
            opacity: 1;
            visibility: visible;
        }
        
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .modal-header {
            padding: 25px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h2 {
            margin: 0;
            color: #333;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 5px;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        
        .close-btn:hover {
            background: #f0f0f0;
            color: #333;
        }
        
        .modal-body {
            padding: 25px;
        }
        
        .product-summary {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-radius: 15px;
            margin-bottom: 25px;
        }
        
        .product-summary h3 {
            margin: 0 0 10px 0;
            font-size: 1.2rem;
        }
        
        .current-price-display {
            font-size: 2rem;
            font-weight: bold;
        }
        
        .tracking-form .form-group {
            margin-bottom: 20px;
        }
        
        .tracking-form label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
        }
        
        .tracking-form input,
        .tracking-form select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .tracking-form input:focus,
        .tracking-form select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .tracking-form small {
            color: #666;
            font-size: 0.85rem;
            display: block;
            margin-top: 5px;
        }
        
        .checkbox-label {
            display: flex !important;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-weight: normal !important;
        }
        
        .checkbox-label input[type="checkbox"] {
            width: auto !important;
            margin: 0;
        }
    `;
    document.head.appendChild(style);
}

/**
 * סגירת מודל מעקב מחיר
 */
function closePriceModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
    }, 300);
}

/**
 * שליחת טופס מעקב מחיר
 */
async function submitPriceTracking(event, productId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const trackingData = {
        productId,
        email: formData.get('email'),
        phone: formData.get('phone'),
        targetPrice: formData.get('targetPrice'),
        duration: formData.get('duration'),
        instantAlerts: formData.has('instantAlerts'),
        timestamp: Date.now()
    };
    
    // הצגת מצב טעינה
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'שומר...';
    submitBtn.disabled = true;
    
    try {
        // סימולציה של שליחה לשרת
        await simulateTrackingSubmission(trackingData);
        
        // הצגת הודעת הצלחה
        showToast('🎉 מעקב המחיר הופעל בהצלחה! תקבל התראות במייל.', 'success', 5000);
        
        // סגירת המודל
        closePriceModal(event.target.closest('.price-modal'));
        
        // שמירה בlocalStorage למעקב מקומי
        saveTrackingToLocal(trackingData);
        
    } catch (error) {
        console.error('Tracking submission error:', error);
        showToast('שגיאה בשמירת המעקב. נסה שוב.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * סימולציה של שליחת מעקב לשרת
 */
function simulateTrackingSubmission(data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // סימולציה של 95% הצלחה
            if (Math.random() > 0.05) {
                resolve({ success: true, trackingId: generateTrackingId() });
            } else {
                reject(new Error('Network error'));
            }
        }, 1000 + Math.random() * 1000);
    });
}

/**
 * יצירת ID מעקב ייחודי
 */
function generateTrackingId() {
    return 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * שמירת מעקב ב-localStorage
 */
function saveTrackingToLocal(trackingData) {
    try {
        let trackedItems = JSON.parse(localStorage.getItem('trackedPrices') || '[]');
        trackedItems.push({
            ...trackingData,
            id: generateTrackingId(),
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('trackedPrices', JSON.stringify(trackedItems));
    } catch (e) {
        console.warn('Could not save tracking to localStorage:', e);
    }
}

// ===================================
// Interactive Features
// ===================================

/**
 * טיפול בקיצורי מקלדת
 */
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K לפתיחת חיפוש
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = $('#productName');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Escape לסגירת מודלים
    if (e.key === 'Escape') {
        const openModal = $('.price-modal.show');
        if (openModal) {
            closePriceModal(openModal);
        } else {
            hideSearchSuggestions();
        }
    }
}

/**
 * אפקטים אינטראקטיביים לכרטיסים
 */
function initCardEffects() {
    // אפקט hover מתקדם לכרטיסי תכונות
    $('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-15px) rotateX(5deg)';
            this.style.transition = 'all 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) rotateX(0)';
        });
    });
    
    // אפקט tilt לכרטיסי חנויות
    $('.store-card').forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / centerY * -10;
            const rotateY = (x - centerX) / centerX * 10;
            
            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
}

/**
 * מערכת פיד בק מחוות
 */
function initHapticFeedback() {
    // רטט קל בלחיצה על כפתורים (אם נתמך)
    $('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if ('vibrate' in navigator) {
                navigator.vibrate(50); // 50ms רטט קל
            }
        });
    });
}

/**
 * מערכת התראות דינמית
 */
function initDynamicNotifications() {
    // הצגת התראות אקראיות על פעילות במערכת
    const notifications = [
        'משתמש חדש הצטרף לפני רגע! 🎉',
        'מצאנו מבצע חדש באייפון! 📱',
        'חיסכון של ₪500 נמצא עכשיו בKSP! 💰',
        '3 משתמשים עוקבים אחר אותו מוצר 👥',
        'מבצע בזק התחיל ב-Bug! ⚡'
    ];
    
    let notificationIndex = 0;
    
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% סיכוי כל מחזור
            const notification = notifications[notificationIndex % notifications.length];
            showToast(notification, 'info', 4000);
            notificationIndex++;
        }
    }, 15000); // כל 15 שניות
}

/**
 * מעקב אחר פעילות משתמש
 */
function initUserAnalytics() {
    let sessionStart = Date.now();
    let interactions = 0;
    
    // מעקב אחר אינטראקציות
    document.addEventListener('click', () => {
        interactions++;
    });
    
    // שמירת נתונים בעזיבת הדף
    window.addEventListener('beforeunload', () => {
        const sessionData = {
            duration: Date.now() - sessionStart,
            interactions: interactions,
            searches: currentSearch ? 1 : 0,
            timestamp: new Date().toISOString()
        };
        
        // שמירה ב-localStorage לצרכים סטטיסטיים
        try {
            let analytics = JSON.parse(localStorage.getItem('siteAnalytics') || '[]');
            analytics.push(sessionData);
            // שמירת 10 הסשנים האחרונים בלבד
            analytics = analytics.slice(-10);
            localStorage.setItem('siteAnalytics', JSON.stringify(analytics));
        } catch (e) {
            console.warn('Could not save analytics:', e);
        }
    });
}

/**
 * אפקטי scroll מתקדמים
 */
function initAdvancedScrollEffects() {
    let ticking = false;
    
    function updateScrollEffects() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        // Parallax effect לheader
        const header = $('.header');
        if (header) {
            header.style.transform = `translate3d(0, ${rate}px, 0)`;
        }
        
        // אפקט fade לכרטיסים
        $('.feature-card, .store-card').forEach((card, index) => {
            const cardTop = card.offsetTop;
            const cardHeight = card.offsetHeight;
            const windowHeight = window.innerHeight;
            const scrollTop = window.pageYOffset;
            
            if (scrollTop + windowHeight > cardTop && scrollTop < cardTop + cardHeight) {
                const progress = Math.min(1, Math.max(0, 
                    (scrollTop + windowHeight - cardTop) / (windowHeight + cardHeight)
                ));
                
                card.style.opacity = progress;
                card.style.transform = `translateY(${(1 - progress) * 50}px)`;
            }
        });
        
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateScrollEffects);
            ticking = true;
        }
    });
}

// ===================================
// Performance Optimization
// ===================================

/**
 * טעינה lazy לתמונות
 */
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const lazyImages = $('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

/**
 * אופטימיזציה של אנימציות
 */
function optimizeAnimations() {
    // בדיקה אם המשתמש מעדיף אנימציות מופחתות
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
        // הפחתת אנימציות למשתמשים שמעדיפים זאת
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// ===================================
// Service Worker for Offline Support
// ===================================

/**
 * רישום service worker לתמיכה offline
 */
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        });
    }
}

// ===================================
// Main Initialization
// ===================================

/**
 * אתחול ראשי של האפליקציה
 */
function initApp() {
    console.log('🛒 Price Tracker - Initializing...');
    
    // בדיקת תמיכה בדפדפן
    if (!window.fetch) {
        showToast('הדפדפן שלך לא נתמך. אנא עדכן לגרסה חדשה יותר.', 'error', 10000);
        return;
    }
    
    // אתחול מערכות בסיסיות
    initSearchSystem();
    initScrollAnimations();
    initCardEffects();
    initHapticFeedback();
    initLazyLoading();
    optimizeAnimations();
    
    // אתחול תכונות מתקדמות
    setTimeout(() => {
        initDynamicNotifications();
        initUserAnalytics();
        initAdvancedScrollEffects();
        initServiceWorker();
    }, 1000);
    
    // אנימציות ראשוניות
    setTimeout(() => {
        animateNumbers();
        
        // הודעת ברוכים הבאים
        setTimeout(() => {
            showToast('ברוכים הבאים למעקב מחירים! 🎉', 'success', 4000);
        }, 2000);
    }, 500);
    
    console.log('✅ Price Tracker - Ready!');
}

// ===================================
// Global Functions (called from HTML)
// ===================================

// חשיפת פונקציות חשובות לHTML
window.trackPrice = trackPrice;
window.closePriceModal = closePriceModal;
window.submitPriceTracking = submitPriceTracking;

// ===================================
// Event Listeners
// ===================================

// אתחול כשהדף נטען
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// טיפול בשגיאות גלובליות
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // לא להציג שגיאות למשתמש הסופי בproduction
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        showToast(`שגיאה: ${e.message}`, 'error');
    }
});

// טיפול בשגיאות Promise לא נתפסות
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

// עדכון אוטומטי כשהחיבור חוזר
window.addEventListener('online', () => {
    showToast('החיבור לאינטרנט חודש! 🌐', 'success');
});

window.addEventListener('offline', () => {
    showToast('החיבור לאינטרנט נפסק. חלק מהתכונות לא יעבדו.', 'warning', 5000);
});

// ===================================
// Easter Eggs & Fun Features
// ===================================

/**
 * Konami code לתכונות נסתרות
 */
let konamiSequence = [];
const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // Up, Up, Down, Down, Left, Right, Left, Right, B, A

document.addEventListener('keydown', (e) => {
    konamiSequence.push(e.keyCode);
    if (konamiSequence.length > konamiCode.length) {
        konamiSequence.shift();
    }
    
    if (konamiSequence.join(',') === konamiCode.join(',')) {
        showToast('🎮 קוד קונמי הופעל! מצב מפתח זמין.', 'info', 5000);
        
        // הפעלת מצב מפתח
        document.body.classList.add('developer-mode');
        
        // הוספת כפתור debug
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '🔧 Debug';
        debugBtn.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 10px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer;';
        debugBtn.onclick = () => {
            console.table({
                'Current Search': currentSearch,
                'Tracked Items': JSON.parse(localStorage.getItem('trackedPrices') || '[]').length,
                'Analytics': JSON.parse(localStorage.getItem('siteAnalytics') || '[]').length,
                'Viewport': `${window.innerWidth}x${window.innerHeight}`,
                'User Agent': navigator.userAgent
            });
        };
        document.body.appendChild(debugBtn);
        
        konamiSequence = [];
    }
});

// ===================================
// Module Export (for future use)
// ===================================

// יצוא פונקציות לשימוש חיצוני אם נדרש
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        formatPrice,
        showToast,
        performSearch,
        trackPrice
    };
}