let currentDeleteId = null;

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        
        const view = this.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view${view.charAt(0).toUpperCase() + view.slice(1)}`).classList.add('active');
        
        if (view === 'posts') loadPosts();
        if (view === 'dashboard') loadDashboard();
    });
});

// Load Dashboard
async function loadDashboard() {
    try {
        const stats = await VideoTabuAPI.getStats();
        document.getElementById('totalPosts').textContent = stats.totalPosts;
        document.getElementById('totalImages').textContent = stats.publishedPosts;
        document.getElementById('totalVideos').textContent = stats.draftPosts;
        document.getElementById('totalViews').textContent = stats.totalViews;
    } catch (error) {
        showToast('Error loading stats: ' + error.message, 'error');
    }
}

// Load Posts
async function loadPosts() {
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchPosts').value;
    
    try {
        const posts = await VideoTabuAPI.getPosts(0, 50, status, search);
        renderPosts(posts);
    } catch (error) {
        showToast('Error loading posts: ' + error.message, 'error');
    }
}

function renderPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="loading">Tidak ada post</div>';
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
                        <span>${post.content ? JSON.parse(post.content).length : 0} media</span>
                        <span>${new Date(post.created_at).toLocaleDateString('id-ID')}</span>
                        <span class="post-status ${post.status}">${post.status}</span>
                        ${post.view_count ? `<span>👁️ ${post.view_count}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="post-actions">
                <button class="btn-edit" onclick="editPost('${post.id}')">✏️ Edit</button>
                <button class="btn-delete" onclick="confirmDelete('${post.id}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// Create/Edit Post
document.getElementById('createPostForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value;
    const genre = document.getElementById('postGenre').value;
    const status = document.getElementById('postStatus').value;
    const coverUrl = document.getElementById('postCover').value || null;
    
    // Collect media items
    const mediaItems = [];
    document.querySelectorAll('.media-item-form').forEach(item => {
        const type = item.querySelector('.media-type-select').value;
        const url = item.querySelector('.media-url').value;
        const caption = item.querySelector('.media-caption').value || '';
        
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
            // Extract YouTube thumbnail
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
        showToast('Post berhasil dibuat!', 'success');
        document.getElementById('formResult').innerHTML = `
            <div class="form-result success">
                ✅ Post berhasil dibuat!<br>
                <strong>ID:</strong> ${result.id}<br>
                <strong>Title:</strong> ${result.title}
            </div>
        `;
        document.getElementById('formResult').classList.remove('hidden');
        resetForm();
        loadPosts();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        document.getElementById('formResult').innerHTML = `
            <div class="form-result error">
                ❌ Error: ${error.message}
            </div>
        `;
        document.getElementById('formResult').classList.remove('hidden');
    }
});

// Media Management
function addMediaItem() {
    const container = document.getElementById('mediaContainer');
    const item = document.createElement('div');
    item.className = 'media-item-form';
    item.innerHTML = `
        <div class="media-row">
            <select class="media-type-select" onchange="toggleMediaInput(this)">
                <option value="img">Gambar</option>
                <option value="vid">Video</option>
            </select>
            <input type="url" class="media-url" placeholder="URL gambar/video" required>
            <input type="text" class="media-caption" placeholder="Caption (opsional)">
            <button type="button" class="btn-remove" onclick="removeMediaItem(this)">✕</button>
        </div>
    `;
    container.appendChild(item);
}

function removeMediaItem(btn) {
    const item = btn.closest('.media-item-form');
    if (document.querySelectorAll('.media-item-form').length > 1) {
        item.remove();
    } else {
        showToast('Minimal 1 media item', 'error');
    }
}

function toggleMediaInput(select) {
    // Just visual feedback, nothing else needed
}

// Extract YouTube ID
function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^?&]+)/);
    return match ? match[1] : null;
}

// Delete Confirmation
function confirmDelete(id) {
    currentDeleteId = id;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    currentDeleteId = null;
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
    if (!currentDeleteId) return;
    
    try {
        await VideoTabuAPI.deletePost(currentDeleteId);
        showToast('Post berhasil dihapus!', 'success');
        closeDeleteModal();
        loadPosts();
        loadDashboard();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
});

// Edit Post (placeholder)
function editPost(id) {
    showToast('Fitur edit akan segera hadir!', 'info');
}

// Show Create View
function showCreatePost() {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-view="create"]').classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('viewCreate').classList.add('active');
}

// Reset Form
function resetForm() {
    document.getElementById('createPostForm').reset();
    document.getElementById('mediaContainer').innerHTML = '';
    document.getElementById('formResult').innerHTML = '';
    document.getElementById('formResult').classList.add('hidden');
    addMediaItem(); // Add default media item
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    addMediaItem(); // Add default media item in create form
});