# 📚 Bibliotheca Mundi Liberi - Visitor Tracking System

## نظرة عامة
هذا المشروع يستخدم **Supabase Edge Functions** لتتبع الزوار بشكل متقدم مع الحصول على البيانات الجغرافية.

## المكونات الرئيسية

### 1. `tracker.js`
يحتوي على كلاس `VisitorTracker` الذي:
- يحصل على IP والموقع الجغرافي عبر Edge Function
- يضيف الزائر لقاعدة البيانات
- يرسل heartbeat كل 3 ثواني
- ينظف الزوار غير النشطين (inactive > 10 ثواني)
- يعرض العداد مضروباً في 3

### 2. Edge Function: `get-visitor-info`
موجودة في: `supabase/functions/get-visitor-info/index.ts`

**الوظيفة:**
- تستقبل طلب من المتصفح
- تحصل على IP من headers
- تحصل على بيانات جغرافية من:
  - Cloudflare headers (الأساسي - مجاني)
  - ipapi.co API (احتياطي)
- ترجع جميع البيانات بصيغة JSON

**البيانات المُرجعة:**
```json
{
  "ip": "192.168.1.1",
  "country": "Egypt",
  "country_code": "EG",
  "city": "Cairo",
  "region": "Cairo Governorate",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "isp": "Telecom Egypt",
  "timezone": "Africa/Cairo",
  "user_agent": "Mozilla/5.0..."
}
```

### 3. قاعدة البيانات Supabase
جدول `visitors` يحتوي على:
- session_id (معرف فريد للجلسة)
- ip
- country, country_code, city, region
- latitude, longitude
- isp, timezone
- user_agent
- page_url
- joined_at, last_seen

## خطوات التشغيل

### خيار 1: نشر Edge Function (موصى به)

1. **تثبيت Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **تسجيل الدخول**
   ```bash
   supabase login
   ```

3. **ربط المشروع**
   ```bash
   cd c:\Users\iswar\OneDrive\Desktop\liberte
   supabase link --project-ref rbznukwicdzahokvafri
   ```

4. **نشر Edge Function**
   ```bash
   supabase functions deploy get-visitor-info
   ```

5. **اختبار**
   افتح `index.html` في المتصفح وتحقق من console

### خيار 2: استخدام API مباشر (بدون Edge Function)

إذا لم ترغب في نشر Edge Function، يمكنك تعديل `tracker.js`:

```javascript
async getGeoData() {
    try {
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        
        this.visitorData = {
            ip: data.ip,
            country: data.country_name,
            country_code: data.country_code,
            city: data.city,
            region: data.region,
            latitude: data.latitude,
            longitude: data.longitude,
            isp: data.org,
            timezone: data.timezone,
            user_agent: navigator.userAgent
        }
    } catch (e) {
        console.warn('Could not fetch geo data:', e)
        this.visitorData = { 
            ip: 'Unknown',
            country: 'Unknown',
            user_agent: navigator.userAgent
        }
    }
}
```

**ملاحظة:** ipapi.co له حد 1000 طلب/يوم مجاناً.

## مزايا استخدام Edge Function

✅ **مجانية تماماً** - Cloudflare headers مجانية بلا حدود  
✅ **سرعة عالية** - تعمل على شبكة Cloudflare العالمية  
✅ **دقة أفضل** - Cloudflare لديها قاعدة بيانات IP محدثة  
✅ **لا حدود للطلبات** - على عكس APIs المجانية  
✅ **خصوصية أفضل** - البيانات لا تمر عبر طرف ثالث  

## مقارنة الطرق

| الميزة | Edge Function | ipapi.co | ipify |
|-------|--------------|----------|-------|
| الحد اليومي | ∞ | 1,000 | ∞ |
| بيانات جغرافية | ✅ كاملة | ✅ كاملة | ❌ IP فقط |
| السرعة | ⚡ سريع جداً | 🐢 بطيء | ⚡ سريع |
| التكلفة | 🆓 مجاني | 🆓 محدود | 🆓 مجاني |
| التعقيد | 🔧 متوسط | ✅ سهل | ✅ سهل |

## استكشاف الأخطاء

### 1. Edge Function لا تعمل
```bash
# تحقق من نشر الوظيفة
supabase functions list

# عرض logs
supabase functions logs get-visitor-info
```

### 2. عداد الزوار لا يتحدث
- تحقق من console للأخطاء
- تحقق من أن قاعدة البيانات متصلة
- تحقق من أن الجدول `visitors` موجود

### 3. البيانات الجغرافية "Unknown"
- تحقق من أن Edge Function منشورة
- تحقق من اتصال الإنترنت
- جرب الخيار 2 (API مباشر) للاختبار

## الملفات

```
liberte/
├── index.html          # الصفحة الرئيسية
├── script.js          # منطق عرض الكتب
├── tracker.js         # نظام تتبع الزوار
├── global.css         # التنسيقات
└── supabase/
    ├── config.toml    # إعدادات Supabase
    ├── DEPLOYMENT.md  # دليل النشر المفصل
    └── functions/
        └── get-visitor-info/
            └── index.ts   # Edge Function
```

## روابط مفيدة
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/)
- [ipapi.co API](https://ipapi.co/)

## المساهمة
لأي استفسارات أو مشاكل، راجع `supabase/DEPLOYMENT.md` للتفاصيل الكاملة.
