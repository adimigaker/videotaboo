// ============================================
// DEBUG - Cek koneksi
// ============================================
console.log('📦 Admin JS loaded');
console.log('🔍 Checking Supabase...', typeof supabase);
console.log('🔍 Checking VideoTabuAPI...', typeof VideoTabuAPI);

// ============================================
// STATE
// ============================================
let currentDeleteId = null;
let allPosts = [];

// ============================================
// DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM Ready');
    
    setupNavigation();
    setupSidebar();
    setupForm();
    setupDeleteConfirm();
    addMedia();
    
    // Load data
    loadDashboard();
    loadRecentPosts();
});

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view${view.charAt(0).toUpperCase() + view.slice(1)}`).classList.add('active');
            
            if (view === 'posts') loadPosts();
            if (view === 'dashboard') {
                loadDashboard();
                loadRecentPosts();
            }
            
            closeSidebar();
        });
    });
}

// ============================================
// SIDEBAR
// ============================================
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:98;';
        document.body.appendChild(overlay);
    }
    
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebarFn() {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    menuToggle.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebarFn);
    window.closeSidebar = closeSidebarFn;
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        console.log('📊 Loading dashboard...');
        const stats = await VideoTabuAPI.getStats();
        console.log('📊 Stats:', stats);
        
        document.getElementById('totalPosts').textContent = stats.totalPosts || 0;
        document.getElementById('publishedPosts').textContent = stats.publishedPosts || 0;
        document.getElementById('draftPosts').textContent = stats.draftPosts || 0;
        document.getElementById('totalViews').textContent = stats.totalViews || 0;
    } catch (error) {
        console.error('❌ Stats error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function loadRecentPosts() {
    try {
        const posts = await VideoTabuAPI.getPosts(0, 5, 'all', '');
        renderTableRows('recentPostsTable', posts);
    } catch (error) {
        console.error('❌ Recent posts error:', error);
        document.getElementById('recentPostsTable').innerHTML = 
            `<tr><td colspan="4" class="text-center">Error: ${error.message}</td></tr>`;
    }
}

// ============================================
// POSTS LIST
// ============================================
async function loadPosts() {
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchPosts').value;
    const tbody = document.getElementById('postsTable');
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
    try {
        const posts = await VideoTabuAPI.getPosts(0, 50, status, search);
        allPosts = posts;
        renderTableRows('postsTable', posts);
    } catch (error) {
        console.error('❌ Load posts error:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">Error: ${error.message}</td></tr>`;
        showToast('Error: ' + error.message, 'error');
    }
}

function renderTableRows(tbodyId, posts) {
    const tbody = document.getElementById(tbodyId);
    
    if (!posts || posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">📭 Tidak ada post</td></tr>';
        return;
    }
    
    tbody.innerHTML = posts.map((post, index) => {
        const contentCount = post.content ? JSON.parse(post.content).length : 0;
        const statusClass = post.status === 'published' ? 'tag-published' : 'tag-draft';
        
        return `
        <tr>
            <td>${index + 1}</td>
            <td>
                ${post.cover_url 
                    ? `<img src="${post.cover_url}" class="cover-thumb" />` 
                    : `<div class="cover-placeholder">📝</div>`}
            </td>
            <td>
                <div class="post-title">${post.title}</div>
                <div class="post-meta">
                    <span>${post.genre || '-'}</span>
                    <span>📎 ${contentCount} media</span>
                    <span>📅 ${new Date(post.created_at).toLocaleDateString('id-ID')}</span>
                    <span class="tag ${statusClass}">${post.status}</span>
                    ${post.view_count ? `<span>👁️ ${post.view_count}</span>` : ''}
                </div>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editPost('${post.id}')">✏️</button>
                    <button class="btn-delete" onclick="confirmDelete('${post.id}')">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// ============================================
// CREATE POST
// ============================================
function setupForm() {
    document.getElementById('createPostForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await createPost();
    });
}

async function createPost() {
    const title = document.getElementById('postTitle').value.trim();
    const genre = document.getElementById('postGenre').value.trim();
    const status = document.getElementById('postStatus').value;
    const coverUrl = document.getElementById('postCover').value.trim() || null;
    
    if (!title) {
        showToast('Judul harus diisi!', 'error');
        return;
    }
    
    // Collect media
    const mediaItems = [];
    document.querySelectorAll('.media-row').forEach(row => {
        const type = row.querySelector('.media-type').value;
        const url = row.querySelector('.media-url').value.trim();
        const cap = row.querySelector('.media-cap').value.trim() || '';
        
        if (url) {
            const obj = {};
            obj[type] = url;
            if (cap) obj.cap = cap;
            mediaItems.push(obj);
        }
    });
    
    // Auto cover
    let finalCover = coverUrl;
    if (!finalCover && mediaItems.length > 0) {
        const first = mediaItems[0];
        if (first.img) finalCover = first.img;
        else if (first.vid) {
            const vidId = extractYouTubeId(first.vid);
            if (vidId) finalCover = `https://img.youtube.com/vi/${vidId}/0.jpg`;
        }
    }
    
    const postData = {
        title: title,
        genre: genre || null,
        content: mediaItems.length > 0 ? JSON.stringify(mediaItems) : null,
        cover_url: finalCover,
        status: status,
        view_count: 0
    };
    
    try {
        console.log('📤 Creating post:', postData);
        const result = await VideoTabuAPI.createPost(postData);
        console.log('✅ Post created:', result);
        
        showToast('✅ Post berhasil dibuat!', 'success');
        
        document.getElementById('formResult').innerHTML = `
            <div class="form-result success">
                ✅ Post berhasil dibuat!<br>
                <strong>ID:</strong> ${result.id}<br>
                <strong>Judul:</strong> ${result.title}<br>
                <strong>Status:</strong> ${result.status}
            </div>
        `;
        document.getElementById('formResult').classList.remove('hidden');
        
        resetForm();
        loadPosts();
        loadDashboard();
        loadRecentPosts();
        
    } catch (error) {
        console.error('❌ Create error:', error);
        showToast('Error: ' + error.message, 'error');
        document.getElementById('formResult').innerHTML = `
            <div class="form-result error">
                ❌ Error: ${error.message}
            </div>
        `;
        document.getElementById('formResult').classList.remove('hidden');
    }
}

// ============================================
// MEDIA
// ============================================
function addMedia() {
    const container = document.getElementById('mediaContainer');
    const row = document.createElement('div');
    row.className = 'media-row';
    row.innerHTML = `
        <select class="media-type">
            <option value="img">🖼️ Gambar</option>
            <option value="vid">🎬 Video</option>
        </select>
        <input type="url" class="media-url" placeholder="URL media">
        <input type="text" class="media-cap" placeholder="Caption">
        <button type="button" class="btn-remove" onclick="removeMedia(this)">✕</button>
    `;
    container.appendChild(row);
}

function removeMedia(btn) {
    const rows = document.querySelectorAll('.media-row');
    if (rows.length > 1) {
        btn.closest('.media-row').remove();
    } else {
        showToast('Minimal 1 media', 'error');
    }
}

// ============================================
// DELETE
// ============================================
function setupDeleteConfirm() {
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
        if (!currentDeleteId) return;
        
        try {
            await VideoTabuAPI.deletePost(currentDeleteId);
            showToast('✅ Post dihapus!', 'success');
            closeDeleteModal();
            loadPosts();
            loadDashboard();
            loadRecentPosts();
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    });
}

function confirmDelete(id) {
    currentDeleteId = id;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    currentDeleteId = null;
}

// ============================================
// HELPERS
// ============================================
function showCreatePost() {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-view="create"]').classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('viewCreate').classList.add('active');
    closeSidebar();
}

function editPost(id) {
    showToast('✏️ Fitur edit segera hadir', 'info');
}

function resetForm() {
    document.getElementById('createPostForm').reset();
    document.getElementById('mediaContainer').innerHTML = '';
    document.getElementById('formResult').innerHTML = '';
    document.getElementById('formResult').classList.add('hidden');
    addMedia();
}

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^?&]+)/);
    return match ? match[1] : null;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    
    msg.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), 4000);
}