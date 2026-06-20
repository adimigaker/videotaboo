// =============================================
// ADMIN.JS - VideoTabu Dashboard
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    var posts = [];
    var editTarget = null;
    var deleteTarget = null;

    var postsContainer = document.getElementById('postsContainer');
    var newPostBtn = document.getElementById('newPostBtn');
    var syncBtn = document.getElementById('syncBtn');

    var postModal = document.getElementById('postModal');
    var modalTitle = document.getElementById('modalTitle');
    var postForm = document.getElementById('postForm');
    var postTitle = document.getElementById('postTitle');
    var postGenre = document.getElementById('postGenre');
    var postStatus = document.getElementById('postStatus');
    var postCover = document.getElementById('postCover');
    var postContent = document.getElementById('postContent');
    var closeModalBtn = document.getElementById('closeModalBtn');
    var cancelModalBtn = document.getElementById('cancelModalBtn');
    var formResult = document.getElementById('formResult');

    var deleteModal = document.getElementById('deleteModal');
    var deletePostName = document.getElementById('deletePostName');
    var cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    var confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    var toast = document.getElementById('toast');
    var uploadCoverBtn = document.getElementById('uploadCoverBtn');
    var coverPreview = document.getElementById('coverPreview');
    var coverPreviewImg = document.getElementById('coverPreviewImg');
    var removeCoverBtn = document.getElementById('removeCoverBtn');

    // ========== TOAST ==========
    function showToast(msg, type) {
        toast.textContent = msg;
        toast.className = 'toast show';
        if (type) toast.classList.add(type);
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() {
            toast.classList.remove('show');
        }, 3000);
    }

    // ========== LOAD POSTS ==========
    async function loadPosts() {
        postsContainer.innerHTML = '<div class="empty-state"><h3>⏳ Loading...</h3></div>';
        try {
            posts = await API.getAllPosts(true);
            renderPosts();
        } catch (err) {
            console.error('Load error:', err);
            postsContainer.innerHTML = '<div class="empty-state"><h3>❌ Gagal memuat</h3><button onclick="loadPosts()" class="btn-primary">Coba Lagi</button></div>';
        }
    }

    function renderPosts() {
        postsContainer.innerHTML = '';
        if (!posts.length) {
            postsContainer.innerHTML = '<div class="empty-state"><h3>📭 Belum ada post</h3><p>Klik "Post Baru" untuk mulai</p></div>';
            return;
        }

        posts.forEach(function(post) {
            var card = document.createElement('div');
            card.className = 'post-card';

            var contentCount = post.content ? JSON.parse(post.content).length : 0;

            card.innerHTML = `
                ${post.cover_url 
                    ? `<img src="${post.cover_url}" class="post-cover" />` 
                    : `<div class="post-cover-placeholder">📝</div>`}
                <div class="post-info">
                    <h3>${escapeHtml(post.title)}</h3>
                    <div class="post-meta">
                        <span>${escapeHtml(post.genre || 'No genre')}</span>
                        <span>📎 ${contentCount} media</span>
                        <span>📅 ${new Date(post.created_at).toLocaleDateString('id-ID')}</span>
                        <span class="post-status ${post.status}">${post.status}</span>
                        ${post.view_count ? `<span>👁️ ${post.view_count}</span>` : ''}
                    </div>
                </div>
                <div class="post-actions">
                    <button class="btn-edit" data-id="${post.id}">✏️</button>
                    <button class="btn-delete" data-id="${post.id}">🗑️</button>
                </div>
            `;

            // Edit
            card.querySelector('.btn-edit').addEventListener('click', function(e) {
                e.stopPropagation();
                openEditPost(post.id);
            });

            // Delete
            card.querySelector('.btn-delete').addEventListener('click', function(e) {
                e.stopPropagation();
                openDeleteModal(post);
            });

            // Click card to view (bisa diarahkan ke halaman detail nanti)
            card.addEventListener('click', function() {
                // Bisa ke detail page nanti
                showToast('Detail: ' + post.title, 'info');
            });

            postsContainer.appendChild(card);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            return m;
        });
    }

    // ========== CREATE / EDIT POST ==========
    function openNewPost() {
        editTarget = null;
        modalTitle.textContent = '📝 Post Baru';
        postForm.reset();
        postContent.value = '';
        formResult.style.display = 'none';
        coverPreview.style.display = 'none';
        postModal.style.display = 'flex';
        setTimeout(function() { postTitle.focus(); }, 100);
    }

    async function openEditPost(id) {
        try {
            var post = await API.getPostById(id);
            if (!post) {
                showToast('Post tidak ditemukan', 'error');
                return;
            }

            editTarget = post;
            modalTitle.textContent = '✏️ Edit Post';
            postTitle.value = post.title || '';
            postGenre.value = post.genre || '';
            postStatus.value = post.status || 'draft';
            postCover.value = post.cover_url || '';
            postContent.value = post.content ? JSON.stringify(JSON.parse(post.content), null, 2) : '';

            // Update cover preview
            if (post.cover_url) {
                coverPreviewImg.src = post.cover_url;
                coverPreview.style.display = 'flex';
            } else {
                coverPreview.style.display = 'none';
            }

            formResult.style.display = 'none';
            postModal.style.display = 'flex';
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    function closeModal() {
        postModal.style.display = 'none';
        editTarget = null;
    }

    // ========== SAVE POST ==========
    postForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        var title = postTitle.value.trim();
        if (!title) {
            showToast('Judul wajib diisi!', 'error');
            return;
        }

        // Parse content JSON
        var content = null;
        var contentRaw = postContent.value.trim();
        if (contentRaw) {
            try {
                content = JSON.parse(contentRaw);
                if (!Array.isArray(content)) {
                    showToast('Content harus berupa array!', 'error');
                    return;
                }
            } catch (err) {
                showToast('Format JSON tidak valid: ' + err.message, 'error');
                return;
            }
        }

        var postData = {
            title: title,
            genre: postGenre.value.trim() || null,
            content: content ? JSON.stringify(content) : null,
            cover_url: postCover.value.trim() || null,
            status: postStatus.value,
            view_count: 0
        };

        try {
            var result;
            if (editTarget) {
                result = await API.updatePost(editTarget.id, postData);
            } else {
                result = await API.createPost(postData);
            }

            if (result.success) {
                showToast('✅ Post berhasil disimpan!', 'success');
                closeModal();
                loadPosts();
            } else {
                showToast('❌ Error: ' + result.error, 'error');
            }
        } catch (err) {
            showToast('❌ Error: ' + err.message, 'error');
        }
    });

    // ========== DELETE ==========
    function openDeleteModal(post) {
        deleteTarget = post;
        deletePostName.textContent = '"' + post.title + '" (' + post.id + ')';
        deleteModal.style.display = 'flex';
    }

    function closeDeleteModal() {
        deleteModal.style.display = 'none';
        deleteTarget = null;
    }

    confirmDeleteBtn.addEventListener('click', async function() {
        if (!deleteTarget) return;
        try {
            var result = await API.deletePost(deleteTarget.id);
            if (result.success) {
                showToast('✅ Post dihapus!', 'success');
                closeDeleteModal();
                loadPosts();
            } else {
                showToast('❌ Error: ' + result.error, 'error');
            }
        } catch (err) {
            showToast('❌ Error: ' + err.message, 'error');
        }
    });

    cancelDeleteBtn.addEventListener('click', closeDeleteModal);

    // ========== UPLOAD COVER ==========
    uploadCoverBtn.addEventListener('click', function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async function() {
            var file = input.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('Maks 5MB', 'error');
                return;
            }

            showToast('Upload cover...', 'info');
            var result = await API.uploadImage(file);

            if (result.success && result.url) {
                postCover.value = result.url;
                coverPreviewImg.src = result.url;
                coverPreview.style.display = 'flex';
                showToast('✅ Cover terupload!', 'success');
            } else {
                showToast('❌ Upload gagal: ' + (result.error || 'Unknown'), 'error');
            }
        };
        input.click();
    });

    removeCoverBtn.addEventListener('click', function() {
        postCover.value = '';
        coverPreview.style.display = 'none';
    });

    postCover.addEventListener('input', function() {
        var url = postCover.value.trim();
        if (url) {
            coverPreviewImg.src = url;
            coverPreview.style.display = 'flex';
        } else {
            coverPreview.style.display = 'none';
        }
    });

    // ========== EVENT LISTENERS ==========
    newPostBtn.addEventListener('click', openNewPost);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    syncBtn.addEventListener('click', function() {
        loadPosts();
        showToast('🔄 Syncing...', 'info');
    });

    // Close modal on overlay click
    postModal.addEventListener('click', function(e) {
        if (e.target === postModal) closeModal();
    });

    deleteModal.addEventListener('click', function(e) {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (postModal.style.display === 'flex') closeModal();
            if (deleteModal.style.display === 'flex') closeDeleteModal();
        }
    });

    // ========== START ==========
    loadPosts();
    console.log('✅ VideoTabu Dashboard ready');
});