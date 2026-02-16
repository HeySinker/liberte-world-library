import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabase = createClient(
    'https://rbznukwicdzahokvafri.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiem51a3dpY2R6YWhva3ZhZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzY0OTMsImV4cCI6MjA4NjgxMjQ5M30.tDwOZTMOOK_tJNqqlfieqs2SeNolV564D9JjlJyeFUE'
)

class VisitorTracker {
    constructor() {
        this.sessionId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        this.visitorData = {}
        this.init()
    }

    async init() {
        // الحصول على بيانات IP والموقع
        await this.getGeoData()

        // إضافة الزائر
        await this.addVisitor()

        // heartbeat: تحديث آخر ظهور كل 10 ثواني (بدلاً من 3)
        // هذا يقلل طلبات PATCH بشكل كبير
        setInterval(() => this.sendHeartbeat(), 10000)

        // تحديث العداد كل 5 ثواني (بدلاً من 1)
        // هذا يقلل طلبات HEAD
        setInterval(() => this.updateCount(), 5000)

        // تنظيف الزوار القدامى مرة واحدة كل دقيقة فقط
        // هذا يقلل طلبات DELETE بشكل كبير جداً
        setInterval(() => this.cleanupOldVisitors(), 60000)

        window.addEventListener('beforeunload', () => this.removeVisitor())
    }

    // الحصول على IP والبيانات الجغرافية من Supabase Edge Function
    async getGeoData() {
        try {
            // محاولة استخدام Edge Function
            const { data, error } = await supabase.functions.invoke('get-visitor-info')

            if (error) {
                // Edge Function not available yet or blocked
                throw error
            }

            if (data) {
                this.visitorData = {
                    ip: data.ip || 'Unknown',
                    country: data.country || 'Unknown',
                    country_code: data.country_code || 'Unknown',
                    city: data.city || 'Unknown',
                    region: data.region || 'Unknown',
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                    isp: data.isp || 'Unknown',
                    timezone: data.timezone || 'Unknown',
                    user_agent: data.user_agent || navigator.userAgent
                }
                return
            }
        } catch (e) {
            // Silently fail to basic tracking without console noise
        }

        // Fallback: بيانات أساسية فقط
        this.visitorData = {
            ip: 'Visitor-' + Date.now(),
            country: 'Unknown',
            country_code: 'XX',
            city: 'Unknown',
            region: 'Unknown',
            latitude: null,
            longitude: null,
            isp: 'Unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
            user_agent: navigator.userAgent
        }
    }

    async addVisitor() {
        await supabase.from('visitors').insert({
            session_id: this.sessionId,
            ip: this.visitorData.ip,
            country: this.visitorData.country,
            country_code: this.visitorData.country_code,
            city: this.visitorData.city,
            region: this.visitorData.region,
            latitude: this.visitorData.latitude,
            longitude: this.visitorData.longitude,
            isp: this.visitorData.isp,
            timezone: this.visitorData.timezone,
            user_agent: navigator.userAgent,
            page_url: window.location.pathname,
            joined_at: new Date().toISOString(),
            last_seen: new Date().toISOString()
        })

        // تحديث أولي سريع
        this.updateCount()
    }

    async sendHeartbeat() {
        // تحديث فقط (PATCH request)
        await supabase
            .from('visitors')
            .update({ last_seen: new Date().toISOString() })
            .eq('session_id', this.sessionId)
    }

    async cleanupOldVisitors() {
        // حذف من لم يحدث منذ 30 ثانية (DELETE request)
        // يتم تنفيذ هذا مرة واحدة فقط في الدقيقة
        const timeout = new Date(Date.now() - 30000).toISOString()
        await supabase
            .from('visitors')
            .delete()
            .lt('last_seen', timeout)
    }

    async updateCount() {
        // نعد فقط الزوار الذين كانوا نشطين في آخر 15 ثانية
        // هذا يقلل الحاجة للحذف المستمر للحصول على رقم دقيق
        const activeThreshold = new Date(Date.now() - 15000).toISOString()

        const { count } = await supabase
            .from('visitors')
            .select('*', { count: 'exact', head: true })
            .gt('last_seen', activeThreshold)

        if (count !== null) {
            const displayCount = count * 3
            this.displayCount(displayCount)
        }
    }

    displayCount(count) {
        const element = document.getElementById('visitorCount')
        if (element) {
            element.textContent = count.toLocaleString()
        }
    }

    async removeVisitor() {
        await supabase
            .from('visitors')
            .delete()
            .eq('session_id', this.sessionId)
    }
}

const tracker = new VisitorTracker()