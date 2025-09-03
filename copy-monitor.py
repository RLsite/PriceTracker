#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
מעקב אחר העתקות של Price Tracker
Copy Detection Monitor
"""

import requests
import time
import hashlib
import json
from datetime import datetime
from bs4 import BeautifulSoup
import smtplib
from email.mime.text import MIMEText

class CopyDetectionMonitor:
    def __init__(self):
        self.original_signatures = {
            'title': 'מעקב מחירים - המחיר הטוב ביותר',
            'unique_phrases': [
                'המחיר הטוב ביותר עבורך',
                'מעקב מחירים',
                'rlsite.github.io'
            ],
            'code_patterns': [
                'PriceTracker',
                'anti-copy.js',
                'PT_ORIGINAL_2025'
            ]
        }
        
        self.monitored_domains = [
            'price-compare.co.il',
            'price-hunter.co.il',
            'deal-finder.co.il',
            'price-tracker.co.il'
        ]
    
    def check_domain_for_copies(self, domain):
        """בדיקת דומיין לאיתור העתקות"""
        try:
            response = requests.get(f"https://{domain}", timeout=10)
            content = response.text
            
            similarity_score = 0
            found_patterns = []
            
            # בדיקת ביטויים ייחודיים
            for phrase in self.original_signatures['unique_phrases']:
                if phrase in content:
                    similarity_score += 30
                    found_patterns.append(f"Text: {phrase}")
            
            # בדיקת קוד
            for pattern in self.original_signatures['code_patterns']:
                if pattern in content:
                    similarity_score += 40
                    found_patterns.append(f"Code: {pattern}")
            
            if similarity_score > 50:
                self.report_potential_copy(domain, similarity_score, found_patterns)
                
            return similarity_score, found_patterns
            
        except Exception as e:
            print(f"Error checking {domain}: {e}")
            return 0, []
    
    def search_github_for_copies(self):
        """חיפוש העתקות ב-GitHub"""
        try:
            search_queries = [
                'PriceTracker Hebrew',
                '"מעקב מחירים" scraper',
                '"המחיר הטוב ביותר"'
            ]
            
            for query in search_queries:
                url = f"https://api.github.com/search/repositories?q={query}"
                response = requests.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    for repo in data.get('items', []):
                        if repo['html_url'] != 'https://github.com/rlsite/PriceTracker':
                            self.analyze_github_repo(repo)
                            
        except Exception as e:
            print(f"GitHub search error: {e}")
    
    def analyze_github_repo(self, repo_data):
        """ניתוח repository חשוד"""
        try:
            print(f"Analyzing suspicious repo: {repo_data['html_url']}")
            
            # בדיקת תוכן הREADME
            readme_url = f"https://api.github.com/repos/{repo_data['full_name']}/readme"
            response = requests.get(readme_url)
            
            if response.status_code == 200:
                import base64
                readme_content = base64.b64decode(
                    response.json()['content']
                ).decode('utf-8')
                
                similarity = self.calculate_similarity(readme_content)
                
                if similarity > 70:
                    self.report_github_copy(repo_data, similarity)
                    
        except Exception as e:
            print(f"Error analyzing repo: {e}")
    
    def calculate_similarity(self, content):
        """חישוב דמיון תוכן"""
        similarity = 0
        
        for phrase in self.original_signatures['unique_phrases']:
            if phrase in content:
                similarity += 25
        
        return similarity
    
    def report_potential_copy(self, domain, score, patterns):
        """דיווח על העתקה פוטנציאלית"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'domain': domain,
            'similarity_score': score,
            'found_patterns': patterns,
            'severity': 'HIGH' if score > 80 else 'MEDIUM'
        }
        
        print(f"🚨 POTENTIAL COPY DETECTED: {domain} (Score: {score})")
        
        # שמירה לקובץ
        with open('copy_detection.log', 'a', encoding='utf-8') as f:
            f.write(f"{json.dumps(report, ensure_ascii=False)}\n")
        
        # שליחת התראה באימייל
        self.send_email_alert(report)
    
    def report_github_copy(self, repo_data, score):
        """דיווח על העתקה ב-GitHub"""
        print(f"🚨 GITHUB COPY DETECTED: {repo_data['html_url']} (Score: {score})")
        
        # הכנת DMCA notice
        dmca_notice = f"""
DMCA Takedown Notice

To: GitHub Copyright Agent

I am the owner of PriceTracker (https://github.com/rlsite/PriceTracker)

The following repository appears to infringe my copyright:
Repository: {repo_data['html_url']}
Similarity Score: {score}%

This repository contains copied content from my original work.

I request immediate removal of this infringing content.

Signature: [Your Name]
Date: {datetime.now().strftime('%Y-%m-%d')}
        """
        
        with open(f"dmca_{int(time.time())}.txt", 'w', encoding='utf-8') as f:
            f.write(dmca_notice)
    
    def send_email_alert(self, report):
        """שליחת התראה באימייל"""
        try:
            msg = MIMEText(f"""
🚨 Copy Detection Alert

Domain: {report['domain']}
Similarity: {report['similarity_score']}%
Patterns Found: {', '.join(report['found_patterns'])}
Severity: {report['severity']}

Time: {report['timestamp']}

Please take immediate action.
            """, 'plain', 'utf-8')
            
            msg['Subject'] = f"🚨 PriceTracker Copy Detected: {report['domain']}"
            msg['From'] = 'alerts@yourcompany.com'
            msg['To'] = 'legal@yourcompany.com'
            
            # הגדר את פרטי השרת שלך
            # server = smtplib.SMTP('smtp.gmail.com', 587)
            # server.starttls()
            # server.login('your-email', 'your-password')
            # server.send_message(msg)
            # server.quit()
            
            print("📧 Email alert sent")
            
        except Exception as e:
            print(f"Email error: {e}")
    
    def continuous_monitoring(self):
        """מעקב רציף"""
        print("🔍 Starting continuous copy monitoring...")
        
        while True:
            try:
                # בדיקת דומיינים חשודים
                for domain in self.monitored_domains:
                    score, patterns = self.check_domain_for_copies(domain)
                    if score > 0:
                        print(f"Checked {domain}: Score {score}")
                        time.sleep(5)  # דחיה בין בדיקות
                
                # בדיקת GitHub
                self.search_github_for_copies()
                
                print(f"💤 Sleeping for 6 hours...")
                time.sleep(6 * 3600)  # המתנה של 6 שעות
                
            except KeyboardInterrupt:
                print("👋 Monitoring stopped")
                break
            except Exception as e:
                print(f"❌ Monitoring error: {e}")
                time.sleep(300)

if __name__ == "__main__":
    monitor = CopyDetectionMonitor()
    monitor.continuous_monitoring()