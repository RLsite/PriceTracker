# 🛒 מעקב מחירים - PriceTracker

**השוואת מחירים חכמה עם מעקב מתמשך לשוק הישראלי**

---

## 🎯 מה זה עושה?

מערכת חכמה שמוצאת את המחירים הטובים ביותר עבורך ומדווחת כשיש הנחות!

- 🔍 **חיפוש מוצרים** בחנויות הגדולות (KSP, Bug, זאפ, Ivory)
- 📱 **התראות SMS/אימייל** על ירידות מחיר ומבצעים
- ⏰ **מעקב מתמשך** - המערכת ממשיכה לחפש גם בלילה
- 🇮🇱 **מותאם לישראל** - ממשק בעברית, שקלים, חנויות מקומיות

---

## 🚀 התחלה מהירה

### דרישות
- Python 3.9+
- Node.js 16+ (לממשק המשתמש)
- PostgreSQL או SQLite

### התקנה ב-3 צעדים:

```bash
# 1. שכפל הפרויקט
git clone https://github.com/USERNAME/price-tracker.git
cd price-tracker

# 2. הרץ התקנה אוטומטית
chmod +x setup.sh
./setup.sh

# 3. התחל לעבוד!
source venv/bin/activate
python app.py
```

🎉 **זהו! האתר רץ על http://localhost:5000**

---

## 💡 איך זה עובד?

### 1. חפש מוצר
```
הכנס: "אייפון 15 פרו"
         ↓
המערכת סורקת: KSP, Bug, זאפ, Ivory
         ↓  
מציגה: השוואת מחירים + המחיר הכי טוב
```

### 2. הפעל מעקב
```
רוצה התראות? הזן אימייל/טלפון
         ↓
בחר: כמה זמן לעקוב (יום/שבוע/חודש)
         ↓
המערכת: ממשיכה לחפש מבצעים ומודיעה לך!
```

---

## 🏪 חנויות נתמכות

| חנות | סטטוס | סוגי מוצרים |
|------|--------|------------|
| 🟢 KSP | פעיל | אלקטרוניקה, מחשבים |
| 🟢 Bug | פעיל | טכנולוגיה, פלאפונים |
| 🟢 זאפ | פעיל | השוואת מחירים |
| 🟢 Ivory | פעיל | אלקטרוניקה |
| 🔄 Plonter | בפיתוח | מחשבים |

---

## 📊 תכונות עיקריות

### 🔔 התראות חכמות
- ✅ ירידת מחיר (כל ירידה)
- ✅ מבצע חם (הנחה מעל 10%)
- ✅ מבצע בזק (זמן מוגבל)
- ✅ חזרה למלאי
- ✅ דוחות שבועיים

### ⏰ בקרת מעקב
- יום אחד / שבוע / חודש
- זמן מותאם אישית
- עצירה בכל רגע
- הארכה אוטומטית

### 🇮🇱 מותאם לישראל
- ממשק RTL בעברית
- מחירים בשקלים (₪)
- חנויות ישראליות
- SMS בעברית

---

## 🛠️ הגדרה מתקדמת

### הגדרת שירותי התראות

```bash
# ערוך קובץ .env
cp .env.example .env

# הוסף מפתחות:
SENDGRID_API_KEY=your-key-here          # לאימיילים
TWILIO_ACCOUNT_SID=your-sid-here        # ל-SMS
```

### הרצה עם Docker

```bash
# הרצה מלאה עם מסד נתונים
docker-compose up -d

# גישה לממשקים:
# API: http://localhost:5000
# Database: localhost:5432
# Monitoring: http://localhost:3000
```

---

## 📱 דוגמה לשימוש

### חיפוש פשוט
```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "אייפון 15", "max_price": 5000}'
```

### הפעלת מעקב
```bash
curl -X POST http://localhost:5000/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 123,
    "email": "your@email.com",
    "phone": "050-1234567",
    "tracking_duration": 7
  }'
```

---

## 🔧 פיתוח

### הוספת חנות חדשה

1. צור קובץ `backend/scrapers/newstore_scraper.py`
2. הרש בקובץ `scrapers/__init__.py`
3. הוסף לרשימה ב-`ACTIVE_STORES`

```python
class NewStoreScraper(BaseScraper):
    def search_product(self, query):
        # הקוד שלך כאן
        pass
```

### הרצת בדיקות

```bash
# בדיקות Backend
pytest backend/tests/ -v

# בדיקות Frontend
cd frontend && npm test

# בדיקות אינטגרציה
docker-compose -f docker-compose.test.yml up
```

---

## 📈 סטטיסטיקות

- 🏪 **5+ חנויות** נתמכות
- 📱 **SMS + Email** התראות
- ⚡ **עדכון כל דקה** במהלך מבצעים
- 🔒 **מאובטח** עם הצפנה מלאה

---

## 🤝 תרומה לפרויקט

רוצה לעזור? מצוין!

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

---

## 📞 יצירת קשר

- 💻 **Developer**: [השם שלך]
- 📧 **Email**: your.email@example.com
- 🌐 **Website**: https://rlsite.github.io/PriceTracker/

---

## 📄 רישיון

הפרויקט מורשה תחת [רישיון MIT](LICENSE) - ראה קובץ LICENSE לפרטים מלאים.

---

## ⭐ תמיכה

אם הפרויקט עזר לך:
- תן כוכב ⭐ לrepository
- שתף עם חברים
- דווח על בעיות ב-[Issues](https://rlsite.github.io/PriceTracker/issues)

---

**Made with ❤️ for Israeli shoppers 🇮🇱**

> "חסוך זמן וכסף - תן למערכת לעבוד בשבילך!"