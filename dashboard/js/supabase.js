const SUPABASE_URL = 'https://hcsueapcpcjhnolvedcj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjc3VlYXBjcGNqaG5vbHZlZGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTM4NTMsImV4cCI6MjA4OTM4OTg1M30.UREkZtP2YbMJTgK-CybvXdvW6uowIFp0xGG5rgHZ85M';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

class VideoTabuAPI {
    // Get all posts with pagination
    static async getPosts(page = 0, limit = 50, status = 'all', search = '') {
        try {
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
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error;
        }
    }

    // Get single post by ID
    static async getPostById(id) {
        try {
            const { data, error } = await supabase
                .from('videotabu')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching post:', error);
            throw error;
        }
    }

    // Create new post
    static async createPost(postData) {
        try {
            const { data, error } = await supabase
                .from('videotabu')
                .insert([postData])
                .select();
                
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    }

    // Update post
    static async updatePost(id, postData) {
        try {
            const { data, error } = await supabase
                .from('videotabu')
                .update(postData)
                .eq('id', id)
                .select();
                
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error updating post:', error);
            throw error;
        }
    }

    // Delete post
    static async deletePost(id) {
        try {
            const { error } = await supabase
                .from('videotabu')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }

    // Get statistics
    static async getStats() {
        try {
            // Total posts
            const { count: totalPosts, error: error1 } = await supabase
                .from('videotabu')
                .select('*', { count: 'exact', head: true });
            
            if (error1) throw error1;
            
            // Published posts
            const { count: publishedPosts, error: error2 } = await supabase
                .from('videotabu')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published');
                
            if (error2) throw error2;
            
            // Draft posts
            const { count: draftPosts, error: error3 } = await supabase
                .from('videotabu')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'draft');
                
            if (error3) throw error3;
            
            // Total views
            const { data: viewsData, error: error4 } = await supabase
                .from('videotabu')
                .select('view_count');
                
            if (error4) throw error4;
            
            const totalViews = viewsData.reduce((sum, item) => sum + (item.view_count || 0), 0);
            
            return {
                totalPosts: totalPosts || 0,
                publishedPosts: publishedPosts || 0,
                draftPosts: draftPosts || 0,
                totalViews: totalViews || 0
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }
}