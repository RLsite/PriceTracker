#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KSP Scraper - חילוץ מחירים מאתר KSP
"""

import time
import re
import logging
from typing import List, Dict, Optional
from urllib.parse import urljoin, quote
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from .base_scraper import BaseScraper
from ..utils.hebrew_utils import normalize_hebrew_text, extract_price_from_text

logger = logging.getLogger(__name__)

class KSPScraper(BaseScraper):
    """
    Scraper עבור אתר KSP - ksp.co.il
    """
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://ksp.co.il"
        self.search_url = "https://ksp.co.il/web/cat/573..2"
        self.store_name = "KSP"
        self.store_logo = "K"
        
        # Chrome options לScraping
        self.chrome_options = Options()
        self.chrome_options.add_argument('--headless')
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')
        self.chrome_options.add_argument('--disable-gpu')
        self.chrome_options.add_argument('--window-size=1920,1080')
        self.chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
    def search_product(self, query: str, max_results: int = 20) -> List[Dict]:
        """
        חיפוש מוצר באתר KSP
        
        Args:
            query: מחרוזת חיפוש
            max_results: מספר תוצאות מקסימלי
            
        Returns:
            רשימת מוצרים שנמצאו
        """
        try:
            logger.info(f"Searching KSP for: {query}")
            
            # נרמול הטקסט העברי
            normalized_query = normalize_hebrew_text(query)
            
            # בניית URL חיפוש
            search_params = {
                'keyword': query,
                'sort': 'price',
                'order': 'asc'
            }
            
            # ביצוע החיפוש
            results = self._perform_search_with_selenium(query, max_results)
            
            logger.info(f"Found {len(results)} products in KSP")
            return results
            
        except Exception as e:
            logger.error(f"KSP search failed for '{query}': {str(e)}")
            return []
    
    def _perform_search_with_selenium(self, query: str, max_results: int) -> List[Dict]:
        """
        ביצוע חיפוש עם Selenium
        """
        driver = None
        try:
            driver = webdriver.Chrome(options=self.chrome_options)
            driver.get(self.base_url)
            
            # המתנה לטעינת העמוד
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # חיפוש תיבת החיפוש
            search_box = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='חיפוש'], input[name='keyword'], #search-input"))
            )
            
            # הכנסת טקסט החיפוש
            search_box.clear()
            search_box.send_keys(query)
            
            # לחיצה על כפתור חיפוש
            search_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], .search-btn, #search-btn")
            search_button.click()
            
            # המתנה לתוצאות
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".product-item, .item, .product"))
            )
            
            time.sleep(2)  # המתנה נוספת לטעינה מלאה
            
            # חילוץ תוצאות
            products = []
            product_elements = driver.find_elements(By.CSS_SELECTOR, ".product-item, .item, .product")[:max_results]
            
            for element in product_elements:
                try:
                    product_data = self._extract_product_from_element(element, driver)
                    if product_data:
                        products.append(product_data)
                except Exception as e:
                    logger.warning(f"Failed to extract product from element: {e}")
                    continue
            
            return products
            
        except TimeoutException:
            logger.error("KSP search timeout")
            return []
        except Exception as e:
            logger.error(f"KSP Selenium search failed: {e}")
            return []
        finally:
            if driver:
                driver.quit()
    
    def _extract_product_from_element(self, element, driver) -> Optional[Dict]:
        """
        חילוץ נתוני מוצר מאלמנט בדף
        """
        try:
            # שם המוצר
            name_element = element.find_element(By.CSS_SELECTOR, 
                ".product-title, .item-name, h3, h4, .name, .title")
            product_name = name_element.text.strip()
            
            if not product_name:
                return None
            
            # מחיר
            price_element = element.find_element(By.CSS_SELECTOR, 
                ".price, .current-price, .item-price, .cost")
            price_text = price_element.text.strip()
            price = extract_price_from_text(price_text)
            
            if not price:
                logger.warning(f"No price found for product: {product_name}")
                return None
            
            # קישור למוצר
            try:
                link_element = element.find_element(By.CSS_SELECTOR, "a")
                product_url = link_element.get_attribute('href')
                if product_url and not product_url.startswith('http'):
                    product_url = urljoin(self.base_url, product_url)
            except NoSuchElementException:
                product_url = None
            
            # תמונה
            try:
                img_element = element.find_element(By.CSS_SELECTOR, "img")
                image_url = img_element.get_attribute('src') or img_element.get_attribute('data-src')
                if image_url and not image_url.startswith('http'):
                    image_url = urljoin(self.base_url, image_url)
            except NoSuchElementException:
                image_url = None
            
            # זמינות
            availability = "במלאי"  # ברירת מחדל
            try:
                availability_element = element.find_element(By.CSS_SELECTOR, 
                    ".availability, .stock-status, .in-stock, .out-of-stock")
                availability_text = availability_element.text.strip()
                
                if any(word in availability_text for word in ['אזל', 'לא זמין', 'out of stock']):
                    availability = "אזל מהמלאי"
                elif any(word in availability_text for word in ['הזמנה', 'order']):
                    availability = "הזמנה מראש"
            except NoSuchElementException:
                pass
            
            # מידע נוסף על המוצר
            try:
                description_element = element.find_element(By.CSS_SELECTOR, 
                    ".product-description, .description, .details")
                description = description_element.text.strip()[:200]
            except NoSuchElementException:
                description = ""
            
            return {
                'name': normalize_hebrew_text(product_name),
                'price': price,
                'store': self.store_name,
                'store_logo': self.store_logo,
                'url': product_url,
                'image_url': image_url,
                'availability': availability,
                'description': description,
                'currency': 'ILS',
                'last_updated': time.time()
            }
            
        except NoSuchElementException as e:
            logger.warning(f"Required element not found in product: {e}")
            return None
        except Exception as e:
            logger.error(f"Error extracting product data: {e}")
            return None
    
    def get_product_details(self, product_url: str) -> Optional[Dict]:
        """
        קבלת פרטים מפורטים על מוצר מעמוד המוצר
        """
        try:
            driver = webdriver.Chrome(options=self.chrome_options)
            driver.get(product_url)
            
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # חילוץ פרטים מפורטים
            details = {}
            
            # שם מוצר מפורט
            try:
                name_element = driver.find_element(By.CSS_SELECTOR, 
                    "h1, .product-title, .main-title")
                details['full_name'] = name_element.text.strip()
            except NoSuchElementException:
                pass
            
            # מחיר מעודכן
            try:
                price_element = driver.find_element(By.CSS_SELECTOR, 
                    ".current-price, .price, .cost")
                details['current_price'] = extract_price_from_text(price_element.text)
            except NoSuchElementException:
                pass
            
            # מחיר מקורי (אם יש הנחה)
            try:
                original_price_element = driver.find_element(By.CSS_SELECTOR, 
                    ".original-price, .old-price, .was-price")
                details['original_price'] = extract_price_from_text(original_price_element.text)
            except NoSuchElementException:
                pass
            
            # מפרט טכני
            try:
                specs_elements = driver.find_elements(By.CSS_SELECTOR, 
                    ".specifications li, .specs li, .features li")
                details['specifications'] = [elem.text.strip() for elem in specs_elements]
            except NoSuchElementException:
                details['specifications'] = []
            
            # דירוג
            try:
                rating_element = driver.find_element(By.CSS_SELECTOR, 
                    ".rating, .stars, .score")
                rating_text = rating_element.get_attribute('title') or rating_element.text
                rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                if rating_match:
                    details['rating'] = float(rating_match.group(1))
            except (NoSuchElementException, ValueError):
                pass
            
            # מספר ביקורות
            try:
                reviews_element = driver.find_element(By.CSS_SELECTOR, 
                    ".reviews-count, .review-count")
                reviews_match = re.search(r'(\d+)', reviews_element.text)
                if reviews_match:
                    details['review_count'] = int(reviews_match.group(1))
            except (NoSuchElementException, ValueError):
                pass
            
            driver.quit()
            return details
            
        except Exception as e:
            logger.error(f"Failed to get product details from {product_url}: {e}")
            if driver:
                driver.quit()
            return None
    
    def check_price_update(self, product_url: str) -> Optional[float]:
        """
        בדיקת עדכון מחיר עבור מוצר ספציפי
        """
        try:
            details = self.get_product_details(product_url)
            return details.get('current_price') if details else None
        except Exception as e:
            logger.error(f"Failed to check price update for {product_url}: {e}")
            return None
    
    def is_available(self) -> bool:
        """
        בדיקה האם האתר זמין לScraping
        """
        try:
            response = requests.get(self.base_url, timeout=10, headers=self.headers)
            return response.status_code == 200
        except Exception:
            return False