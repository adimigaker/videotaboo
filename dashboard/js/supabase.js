// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://hcsueapcpcjhnolvedcj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjc3VlYXBjcGNqaG5vbHZlZGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTM4NTMsImV4cCI6MjA4OTM4OTg1M30.UREkZtP2YbMJTgK-CybvXdvW6uowIFp0xGG5rgHZ85M';

// Inisialisasi Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ Supabase connected');

// ============================================
// FUNGSI GLOBAL - LANGSUNG PAKAI
// ============================================

// Get all posts
window.getPosts = async function(page = 0, limit = 50, status = 'all', search = '') {
    try {
        console.log('🔍 getPosts called:', { page, limit, status, search });
        
        let query = supabase
            .from('videotabu')
            .select('*')
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);
        
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        
        if (search) {
            query = query.ilike('title', `%${search}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }
        
        console.log('✅ Posts fetched:', data?.length || 0);
        return data || [];
        
    } catch (error) {
        console.error('❌ Error fetching posts:', error);
        throw error;
    }
};

// Get single post
window.getPostById = async function(id) {
    try {
        const { data, error } = await supabase
            .from('videotabu')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Error fetching post:', error);
        throw error;
    }
};

// Create post
window.createPost = async function(postData) {
    try {
        console.log('📤 createPost called:', postData);
        
        const { data, error } = await supabase
            .from('videotabu')
            .insert([postData])
            .select();
            
        if (error) {
            console.error('❌ Supabase insert error:', error);
            throw error;
        }
        
        console.log('✅ Post created:', data);
        return data[0];
        
    } catch (error) {
        console.error('❌ Error creating post:', error);
        throw error;
    }
};

// Update post
window.updatePost = async function(id, postData) {
    try {
        const { data, error } = await supabase
            .from('videotabu')
            .update(postData)
            .eq('id', id)
            .select();
            
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('❌ Error updating post:', error);
        throw error;
    }
};

// Delete post
window.deletePost = async function(id) {
    try {
        const { error } = await supabase
            .from('videotabu')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error deleting post:', error);
        throw error;
    }
};

// Get statistics
window.getStats = async function() {
    try {
        console.log('📊 getStats called');
        
        // Total posts
        const { count: totalPosts, error: error1 } = await supabase
            .from('videotabu')
            .select('*', { count: 'exact', head: true });
        
        if (error1) {
            console.error('❌ Total posts error:', error1);
            throw error1;
        }
        
        // Published posts
        const { count: publishedPosts, error: error2 } = await supabase
            .from('videotabu')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published');
            
        if (error2) {
            console.error('❌ Published posts error:', error2);
            throw error2;
        }
        
        // Draft posts
        const { count: draftPosts, error: error3 } = await supabase
            .from('videotabu')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'draft');
            
        if (error3) {
            console.error('❌ Draft posts error:', error3);
            throw error3;
        }
        
        // Total views
        const { data: viewsData, error: error4 } = await supabase
            .from('videotabu')
            .select('view_count');
            
        if (error4) {
            console.error('❌ Views error:', error4);
            throw error4;
        }
        
        const totalViews = viewsData.reduce((sum, item) => sum + (item.view_count || 0), 0);
        
        const stats = {
            totalPosts: totalPosts || 0,
            publishedPosts: publishedPosts || 0,
            draftPosts: draftPosts || 0,
            totalViews: totalViews || 0
        };
        
        console.log('✅ Stats:', stats);
        return stats;
        
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        throw error;
    }
};

console.log('✅ All functions ready:');
console.log('  - getPosts:', typeof window.getPosts);
console.log('  - getPostById:', typeof window.getPostById);
console.log('  - createPost:', typeof window.createPost);
console.log('  - updatePost:', typeof window.updatePost);
console.log('  - deletePost:', typeof window.deletePost);
console.log('  - getStats:', typeof window.getStats);