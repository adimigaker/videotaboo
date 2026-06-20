// ============================================
// STATE
// ============================================
let currentDeleteId = null;
let allPosts = [];

// ============================================
// DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin ready!');
    
    // Setup navigation
    setupNavigation();
    
    // Setup sidebar mobile
    setupSidebar();
    
    // Load dashboard
    loadDashboard();
    
    // Load recent posts
    loadRecentPosts();
    
    // Setup form
    setupForm();
    
    // Setup delete confirmation
    setupDeleteConfirm();
    
    // Add default media item
    addMediaItem();
});

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            // Show view
            const view = this.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view${view.charAt(0).toUpperCase() + view.slice(1)}`).classList.add('active');
            
            // Load data
            if (view === 'posts') loadPosts();
            if (view === 'dashboard') {
                loadDashboard();
                loadRecentPosts();
            }
            
            // Close sidebar on mobile
            closeSidebar();
        });
    });
}

// ============================================
// SIDEBAR MOBILE
// ============================================
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const closeBtn = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');
    
    // Create overlay if not exists
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }
    
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebarFn() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    menuToggle.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebarFn);
    overlay.addEventListener('click', closeSidebarFn);
    
    // Expose for global use
    window.closeSidebar = closeSidebarFn;
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        const stats = await VideoTabuAPI.getStats();
        document.getElementById('totalPosts').textContent = stats.totalPosts || 0;
        document.getElementById('publishedPosts').textContent = stats.publishedPosts || 0;
        document.getElementById('draftPosts').textContent = stats.draftPosts || 0;
        document.getElementById('totalViews').textContent = stats.totalViews || 0;
    } catch (error) {
        console.error('Stats error:', error);
        showToast('Error loading stats: ' + error.message, 'error');
    }
}

async function loadRecentPosts() {
    try {
        const posts = await VideoTabuAPI.getPosts(0, 5, 'all', '');
        const container = document.getElementById('recentPostsList');
        
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="loading">Belum ada post</div>';
            return;
        }
        
        container.innerHTML = posts.map(post => `
            <div class="post-item">
                <div class="post-info">
                    ${post.cover_url ? `<img src="${post.cover_url}" class="post-thumb" />` : '<div class="post-thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;">📝</div>'}
                    <div class="post-details">
                        <h3>${post.title}</h3>
                        <div class="post-meta">
                            <span>${post.genre || 'No genre'}</span>
                            <span class="post-status ${post.status}">${post.status}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Recent posts error:', error);
    }
}

// ============================================
// POSTS LIST
// ============================================
async function loadPosts() {
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchPosts').value;
    const container = document.getElementById('postsList');
    
    container.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        const posts = await VideoTabuAPI.getPosts(0, 50, status, search);
        allPosts = posts;
        renderPosts(posts);
    } catch (error) {
        console.error('Load posts error:', error);
        container.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
        showToast('Error loading posts: ' + error.message, 'error');
    }
}

function renderPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="loading">📭 Tidak ada post</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => {
        const contentCount = post.content ? JSON.parse(post.content).length : 0;
        return `
        <div class="post-item">
            <div class="post-info">
                ${post.cover_url ? `<img src="${post.cover_url}" class="post-thumb" />` : '<div class="post-thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;">📝</div>'}
                <div class="post-details">
                    <h3>${post.title}</h3>
                    <div class="post-meta">
                        <span>${post.genre || 'No genre'}</span>
                        <span>${contentCount} media</span>
                        <span>${new Date(post.created_at).toLocaleDateString('id-ID')}</span>
                        <span class="post-status ${post.status}">${post.status}</span>
                        ${post.view_count ? `<span>👁️ ${post.view_count}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="post-actions">
                <button class="btn-edit" onclick="editPost('${post.id}')">✏️</button>
                <button class="btn-delete" onclick="confirmDelete('${post.id}')">🗑️</button>
            </div>
        </div>
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
        showToast('Title harus diisi!', 'error');
        return;
    }
    
    // Collect media items
    const mediaItems = [];
    document.querySelectorAll('.media-item-form').forEach(item => {
        const type = item.querySelector('.media-type-select').value;
        const url = item.querySelector('.media-url').value.trim();
        const caption = item.querySelector('.media-caption').value.trim() || '';
        
        if (url) {
            const mediaObj = {};
            mediaObj[type] = url;
            if (caption) mediaObj.cap = caption;
            mediaItems.push(mediaObj);
        }
    });
    
    // Auto-generate cover if not provided
    let finalCoverUrl = coverUrl;
    if (!finalCoverUrl && mediaItems.length > 0) {
        const firstMedia = mediaItems[0];
        if (firstMedia.img) {
            finalCoverUrl = firstMedia.img;
        } else if (firstMedia.vid) {
            const videoId = extractYouTubeId(firstMedia.vid);
            if (videoId) {
                finalCoverUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }
        }
    }
    
    const postData = {
        title: title,
        genre: genre || null,
        content: mediaItems.length > 0 ? JSON.stringify(mediaItems) : null,
        cover_url: finalCoverUrl,
        status: status,
        view_count: 0
    };
    
    try {
        const result = await VideoTabuAPI.createPost(postData);
        showToast('✅ Post berhasil dibuat!', 'success');
        
        document.getElementById('formResult').innerHTML = `
            <div class="form-result success">
                ✅ Post berhasil dibuat!<br>
                <strong>ID:</strong> ${result.id}<br>
                <strong>Title:</strong> ${result.title}<br>
                <strong>Status:</strong> ${result.status}
            </div>
        `;
        document.getElementById('formResult').classList.remove('hidden');
        
        resetForm();
        loadPosts();
        loadDashboard();
        loadRecentPosts();
    } catch (error) {
        console.error('Create error:', error);
        showToast('❌ Error: ' + error.message, 'error');
        document.getElementById('formResult').innerHTML = `
            <div class="form-result error">
                ❌ Error: ${error.message}
            </div>
        `;
        document.getElementById('formResult').classList.remove('hidden');
    }
}

// ============================================
// MEDIA MANAGEMENT
// ============================================
function addMediaItem() {
    const container = document.getElementById('mediaContainer');
    const item = document.createElement('div');
    item.className = 'media-item-form';
    item.innerHTML = `
        <div class="media-row">
            <select class="media-type-select">
                <option value="img">🖼️ Gambar</option>
                <option value="vid">🎬 Video</option>
            </select>
            <input type="url" class="media-url" placeholder="URL media" required>
            <input type="text" class="media-caption" placeholder="Caption">
            <button type="button" class="btn-remove" onclick="removeMediaItem(this)">✕</button>
        </div>
    `;
    container.appendChild(item);
}

function removeMediaItem(btn) {
    const items = document.querySelectorAll('.media-item-form');
    if (items.length > 1) {
        btn.closest('.media-item-form').remove();
    } else {
        showToast('Minimal 1 media item', 'error');
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
            showToast('✅ Post berhasil dihapus!', 'success');
            closeDeleteModal();
            loadPosts();
            loadDashboard();
            loadRecentPosts();
        } catch (error) {
            showToast('❌ Error: ' + error.message, 'error');
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
    showToast('✏️ Fitur edit akan segera hadir!', 'info');
}

function resetForm() {
    document.getElementById('createPostForm').reset();
    document.getElementById('mediaContainer').innerHTML = '';
    document.getElementById('formResult').innerHTML = '';
    document.getElementById('formResult').classList.add('hidden');
    addMediaItem();
}

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^?&]+)/);
    return match ? match[1] : null;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}