// =============================================
// API.JS - SUPABASE VERSION (VideoTabu)
// =============================================

var API_CONFIG = {
    SUPABASE_URL: 'https://hcsueapcpcjhnolvedcj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjc3VlYXBjcGNqaG5vbHZlZGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTM4NTMsImV4cCI6MjA4OTM4OTg1M30.UREkZtP2YbMJTgK-CybvXdvW6uowIFp0xGG5rgHZ85M',
    TABLE_NAME: 'videotabu',
};

var API = {
    _cache: null,
    _cacheTime: 0,
    _cacheDuration: 5 * 60 * 1000,

    // ── Helper: Supabase Client ─────────────────────
    _getClient: function() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase library not loaded!');
            return null;
        }
        return supabase.createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.SUPABASE_ANON_KEY);
    },

    // ── GET semua post (untuk home & dashboard) ──
    getAllPosts: async function(forceRefresh) {
        // Cek memory cache
        if (!forceRefresh && this._cache && (Date.now() - this._cacheTime < this._cacheDuration)) {
            console.log('📦 Pakai memory cache');
            return this._cache;
        }

        // Cek localStorage cache
        if (!forceRefresh) {
            var localCache = localStorage.getItem('videotabu_cache');
            var localTime = localStorage.getItem('videotabu_cache_time');

            if (localCache && localTime) {
                var age = Date.now() - parseInt(localTime);
                if (age < this._cacheDuration) {
                    console.log('💾 Pakai localStorage cache (' + Math.round(age/1000) + 's lalu)');
                    var data = JSON.parse(localCache);
                    this._cache = data;
                    this._cacheTime = parseInt(localTime);
                    return data;
                }
            }
        }

        try {
            console.log('🌐 Fetch dari Supabase...');
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            var posts = data || [];

            this._cache = posts;
            this._cacheTime = Date.now();
            localStorage.setItem('videotabu_cache', JSON.stringify(posts));
            localStorage.setItem('videotabu_cache_time', Date.now());

            console.log('✅ Data fetched: ' + posts.length + ' posts');
            return posts;
        } catch (err) {
            console.error('❌ Fetch error:', err);
            if (!forceRefresh && localCache) return JSON.parse(localCache);
            return [];
        }
    },

    // ── GET 1 post by ID ──
    getPostById: async function(id, forceRefresh) {
        var cacheKey = 'videotabu_post_' + id;
        var cacheTimeKey = 'videotabu_post_time_' + id;

        if (!forceRefresh) {
            var localContent = localStorage.getItem(cacheKey);
            var localTime = localStorage.getItem(cacheTimeKey);

            if (localContent && localTime) {
                var age = Date.now() - parseInt(localTime);
                if (age < this._cacheDuration) {
                    console.log('💾 Pakai cache post: ' + id);
                    return JSON.parse(localContent);
                }
            }
        }

        try {
            console.log('🌐 Fetch post dari Supabase: ' + id);
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(cacheTimeKey, Date.now());
            }

            return data;
        } catch (err) {
            console.error('❌ getPostById error:', err);
            if (!forceRefresh && localContent) return JSON.parse(localContent);
            return null;
        }
    },

    // ── CREATE post ──
    createPost: async function(postData) {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .insert([postData])
                .select();

            if (error) throw error;

            // Hapus cache
            this._cache = null;
            localStorage.removeItem('videotabu_cache');
            localStorage.removeItem('videotabu_cache_time');

            return { success: true, data: data[0] };
        } catch (err) {
            console.error('❌ createPost error:', err);
            return { success: false, error: err.message };
        }
    },

    // ── UPDATE post ──
    updatePost: async function(id, postData) {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .update(postData)
                .eq('id', id)
                .select();

            if (error) throw error;

            // Hapus cache
            this._cache = null;
            localStorage.removeItem('videotabu_cache');
            localStorage.removeItem('videotabu_cache_time');
            localStorage.removeItem('videotabu_post_' + id);
            localStorage.removeItem('videotabu_post_time_' + id);

            return { success: true, data: data[0] };
        } catch (err) {
            console.error('❌ updatePost error:', err);
            return { success: false, error: err.message };
        }
    },

    // ── DELETE post ──
    deletePost: async function(id) {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Hapus cache
            this._cache = null;
            localStorage.removeItem('videotabu_cache');
            localStorage.removeItem('videotabu_cache_time');
            localStorage.removeItem('videotabu_post_' + id);
            localStorage.removeItem('videotabu_post_time_' + id);

            return { success: true };
        } catch (err) {
            console.error('❌ deletePost error:', err);
            return { success: false, error: err.message };
        }
    },

    // ── GET STATS ──
    getStats: async function() {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            // Total posts
            var { count: total, error: e1 } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('*', { count: 'exact', head: true });

            if (e1) throw e1;

            // Published
            var { count: published, error: e2 } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published');

            if (e2) throw e2;

            // Draft
            var { count: draft, error: e3 } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('*', { count: 'exact', head: true })
                .eq('status', 'draft');

            if (e3) throw e3;

            // Views
            var { data: views, error: e4 } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('view_count');

            if (e4) throw e4;

            var totalViews = views.reduce(function(sum, item) {
                return sum + (item.view_count || 0);
            }, 0);

            return {
                totalPosts: total || 0,
                publishedPosts: published || 0,
                draftPosts: draft || 0,
                totalViews: totalViews || 0
            };
        } catch (err) {
            console.error('❌ getStats error:', err);
            return { totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 };
        }
    },

    // ── UPLOAD GAMBAR (Google AppsScript) ──
    _APPSCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwy_uZWnQVfOj_-UxjDUQsoduoc_rYzpKnc776J0nJZCgSaVqTnIY2WR0MzLjLW3DcW/exec',

    uploadImage: async function(file) {
        return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = async function() {
                try {
                    var base64 = reader.result.split(',')[1];
                    var ext = (file.name || 'img').split('.').pop() || 'jpg';
                    var fileName = 'videotabu_' + Date.now() + '.' + ext;

                    var res = await fetch(API._APPSCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileName: fileName,
                            fileData: base64,
                            mimeType: file.type || 'image/jpeg'
                        })
                    });

                    // Karena no-cors, response tidak bisa dibaca
                    // Tapi file sudah terupload ke Drive
                    resolve({
                        success: true,
                        url: 'https://drive.google.com/uc?export=view&id=' + fileName
                    });
                } catch (err) {
                    resolve({ success: false, error: err.message });
                }
            };
            reader.readAsDataURL(file);
        });
    }
};

console.log('✅ VideoTabu API loaded');