/*!
 * Anti-Copy Protection System
 * מערכת הגנה מפני העתקה
 * Copyright (c) 2025 - All Rights Reserved
 */

(function() {
    'use strict';
    
    // הגדרות הגנה
    const PROTECTION_CONFIG = {
        SIGNATURE: 'PT_ORIGINAL_2025_' + Math.random().toString(36),
        DEPLOYMENT_ID: 'PriceTracker_' + Date.now(),
        CHECK_INTERVAL: 30000, // 30 שניות
        ALERT_SERVER: 'https://your-server.com/api/alert'
    };
    
    // יצירת חתימה ייחודית
    const createFingerprint = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('PriceTracker Original', 2, 2);
        return canvas.toDataURL();
    };
    
    // זיהוי ניסיונות העתקה
    const detectCopyAttempts = () => {
        // בדיקת Dev Tools
        let devtools = false;
        const threshold = 160;
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools) {
                    devtools = true;
                    logSuspiciousActivity('DEV_TOOLS_DETECTED');
                }
            } else {
                devtools = false;
            }
        }, 1000);
        
        // בדיקת copy & paste
        document.addEventListener('copy', (e) => {
            logSuspiciousActivity('COPY_ATTEMPT', {
                selection: window.getSelection().toString().substring(0, 100)
            });
        });
        
        // בדיקת view source
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey && e.key === 'u') || 
                (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                logSuspiciousActivity('VIEW_SOURCE_ATTEMPT');
            }
        });
        
        // בדיקת right click
        document.addEventListener('contextmenu', (e) => {
            logSuspiciousActivity('RIGHT_CLICK_ATTEMPT');
            // אל תמנע - רק תתעד
        });
    };
    
    // רישום פעילות חשודה
    const logSuspiciousActivity = (type, data = {}) => {
        const logEntry = {
            type,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ip: 'client-side', // יתמלא בשרת
            fingerprint: createFingerprint(),
            ...data
        };
        
        // שליחה לשרת (אם קיים)
        if (PROTECTION_CONFIG.ALERT_SERVER) {
            fetch(PROTECTION_CONFIG.ALERT_SERVER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logEntry)
            }).catch(() => {}); // שקט אם השרת לא זמין
        }
        
        // שמירה מקומית
        try {
            const logs = JSON.parse(localStorage.getItem('pt_security_logs') || '[]');
            logs.push(logEntry);
            localStorage.setItem('pt_security_logs', JSON.stringify(logs.slice(-50)));
        } catch(e) {}
        
        console.warn('🚨 Security Event Logged:', type);
    };
    
    // בדיקת מקוריות
    const verifyAuthenticity = () => {
        // בדיקת דומיין מורשה
        const allowedDomains = [
            'rlsite.github.io',
            'localhost',
            'your-domain.com'
        ];
        
        const currentDomain = window.location.hostname;
        if (!allowedDomains.includes(currentDomain)) {
            logSuspiciousActivity('UNAUTHORIZED_DOMAIN', {
                domain: currentDomain
            });
            
            // הצגת אזהרה
            showCopyrightWarning();
        }
        
        // בדיקת טביעת אצבע
        const expectedFingerprint = PROTECTION_CONFIG.SIGNATURE;
        if (!document.body.dataset.ptSignature) {
            document.body.dataset.ptSignature = expectedFingerprint;
        }
    };
    
    // הצגת אזהרה על זכויות יוצרים
    const showCopyrightWarning = () => {
        const warning = document.createElement('div');
        warning.innerHTML = `
            <div style="
                position: fixed; 
                top: 0; left: 0; 
                width: 100%; height: 100%; 
                background: rgba(231, 76, 60, 0.95); 
                color: white; 
                z-index: 999999;
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-family: Arial, sans-serif;
                text-align: center;
                backdrop-filter: blur(10px);
            ">
                <div>
                    <h1>⚠️ הפרת זכויות יוצרים</h1>
                    <p style="font-size: 1.2rem; margin: 20px 0;">
                        אתר זה מוגן בזכויות יוצרים.<br>
                        שימוש לא מורשה אסור בחוק.
                    </p>
                    <p style="font-size: 1rem;">
                        פעילותך נרשמה ותועבר לרשויות המוסמכות.
                    </p>
                    <p style="font-size: 0.9rem; margin-top: 30px;">
                        © 2025 PriceTracker - All Rights Reserved
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
    };
    
    // הוספת watermark נסתר
    const addHiddenWatermark = () => {
        const watermark = document.createElement('div');
        watermark.style.cssText = `
            position: absolute;
            top: -1000px;
            left: -1000px;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
        `;
        watermark.innerHTML = `
            <!-- 
            Original PriceTracker by ${PROTECTION_CONFIG.SIGNATURE}
            Deployment: ${PROTECTION_CONFIG.DEPLOYMENT_ID}
            Any unauthorized use is strictly prohibited.
            -->
        `;
        document.body.appendChild(watermark);
    };
    
    // אתחול מערכת הגנה
    const initProtection = () => {
        console.log('🛡️ Protection System Active');
        
        verifyAuthenticity();
        detectCopyAttempts();
        addHiddenWatermark();
        
        // בדיקה תקופתית
        setInterval(verifyAuthenticity, PROTECTION_CONFIG.CHECK_INTERVAL);
        
        // רישום התחלת הגנה
        logSuspiciousActivity('PROTECTION_INITIALIZED', {
            signature: PROTECTION_CONFIG.SIGNATURE,
            deployment: PROTECTION_CONFIG.DEPLOYMENT_ID
        });
    };
    
    // הפעלה כשהדף נטען
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProtection);
    } else {
        initProtection();
    }
    
})();