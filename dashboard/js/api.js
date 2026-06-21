// =============================================
// API.JS - VIDEOTABU (Supabase)
// =============================================

var API_CONFIG = {
    SUPABASE_URL: 'https://hcsueapcpcjhnolvedcj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjc3VlYXBjcGNqaG5vbHZlZGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTM4NTMsImV4cCI6MjA4OTM4OTg1M30.UREkZtP2YbMJTgK-CybvXdvW6uowIFp0xGG5rgHZ85M',
    TABLE_NAME: 'videotabu',
};

var API = {
    _client: null,

    _getClient: function() {
        if (this._client) return this._client;
        if (typeof supabase === 'undefined') {
            console.error('Supabase library belum dimuat!');
            return null;
        }
        this._client = supabase.createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.SUPABASE_ANON_KEY);
        return this._client;
    },

    // ── GET semua post (untuk list dashboard) ──
    getAllPosts: async function() {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('id, title, slug, genre, cover_url, status, view_count, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('❌ getAllPosts error:', err);
            return [];
        }
    },

    // ── GET 1 post lengkap (untuk editor), by uuid id ──
    getPost: async function(id) {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('❌ getPost error:', err);
            return null;
        }
    },

    // ── INSERT post baru. Return row (termasuk id & slug auto-generate) ──
    createPost: async function(postData) {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var row = {
                title: postData.title,
                genre: postData.genre || '',
                content: postData.content || [],
                cover_url: postData.cover_url || '',
                status: postData.status || 'draft',
                view_count: 0
            };

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .insert(row)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data };
        } catch (err) {
            console.error('❌ createPost error:', err);
            return { success: false, error: err.message };
        }
    },

    // ── UPDATE post existing, by uuid id ──
    updatePost: async function(id, postData) {
        try {
            var client = this._getClient();
            if (!client) throw new Error('Supabase client error');

            var row = {
                title: postData.title,
                genre: postData.genre || '',
                content: postData.content || [],
                cover_url: postData.cover_url || '',
                status: postData.status || 'draft'
            };

            var { data, error } = await client
                .from(API_CONFIG.TABLE_NAME)
                .update(row)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data };
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
            return { success: true };
        } catch (err) {
            console.error('❌ deletePost error:', err);
            return { success: false, error: err.message };
        }
    },

    // ── Upload gambar via AppScript ke GDrive (sama instance dgn kisahtabu) ──
    _APPSCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwy_uZWnQVfOj_-UxjDUQsoduoc_rYzpKnc776J0nJZCgSaVqTnIY2WR0MzLjLW3DcW/exec',
    _APPSCRIPT_KEY: 'kisahtabu2026',

    uploadImage: async function(file) {
        return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = async function() {
                try {
                    var base64 = reader.result.split(',')[1];
                    var ext = (file.name || 'img').split('.').pop() || 'jpg';
                    var fileName = 'vt_' + Date.now() + '.' + ext;

                    var res = await fetch(API._APPSCRIPT_URL + '?action=uploadImage&key=' + API._APPSCRIPT_KEY, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify({
                            action: 'uploadImage',
                            image: base64,
                            fileName: fileName,
                            mimeType: file.type || 'image/jpeg'
                        })
                    });
                    resolve(await res.json());
                } catch (err) {
                    resolve({ success: false, error: err.message });
                }
            };
            reader.readAsDataURL(file);
        });
    },
};
