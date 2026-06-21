// =============================================
// API.JS - VIDEOTABU PUBLIC (Supabase, read-only)
// =============================================

var API_CONFIG = {
    SUPABASE_URL: 'https://hcsueapcpcjhnolvedcj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjc3VlYXBjcGNqaG5vbHZlZGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTM4NTMsImV4cCI6MjA4OTM4OTg1M30.UREkZtP2YbMJTgK-CybvXdvW6uowIFp0xGG5rgHZ85M',
    TABLE_NAME: 'videotabu',
};

var API = {
    _client: null,
    _cache: null,
    _cacheTime: 0,
    _cacheDuration: 5 * 60 * 1000,

    _getClient: function() {
        if (this._client) return this._client;
        if (typeof supabase === 'undefined') {
            console.error('Supabase library belum dimuat!');
            return null;
        }
        this._client = supabase.createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.SUPABASE_ANON_KEY);
        return this._client;
    },

    getPublishedPosts: async function(forceRefresh) {
        if (!forceRefresh && this._cache && (Date.now() - this._cacheTime < this._cacheDuration)) {
            return this._cache;
        }

        if (!forceRefresh) {
            var localCache = localStorage.getItem('vt_posts_cache');
            var localTime = localStorage.getItem('vt_posts_cache_time');
            if (localCache && localTime && (Date.now() - parseInt(localTime) < this._cacheDuration)) {
                var data = JSON.parse(localCache);
                this._cache = data;
                this._cacheTime = parseInt(localTime);
                return data;
            }
        }

        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('id, title, slug, genre, cover_url, content, view_count, created_at')
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (error) throw error;

            var posts = data || [];
            this._cache = posts;
            this._cacheTime = Date.now();
            localStorage.setItem('vt_posts_cache', JSON.stringify(posts));
            localStorage.setItem('vt_posts_cache_time', Date.now());
            return posts;
        } catch (err) {
            console.error('❌ getPublishedPosts error:', err);
            var fallback = localStorage.getItem('vt_posts_cache');
            return fallback ? JSON.parse(fallback) : [];
        }
    },

    getPostBySlug: async function(slug) {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('*')
                .eq('slug', slug)
                .eq('status', 'published')
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('❌ getPostBySlug error:', err);
            return null;
        }
    },

    incrementView: async function(id, currentCount) {
        try {
            var client = this._getClient();
            if (!client) return;
            await client.from(API_CONFIG.TABLE_NAME)
                .update({ view_count: (currentCount || 0) + 1 })
                .eq('id', id);
        } catch (err) {
            console.error('❌ incrementView error:', err);
        }
    },
};
