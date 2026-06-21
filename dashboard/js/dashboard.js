// =============================================
// DASHBOARD.JS - VIDEOTABU
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    var posts = [];
    var filtered = [];
    var deleteTarget = null;

    var postList = document.getElementById('postList');
    var searchInput = document.getElementById('searchInput');
    var genreFilter = document.getElementById('genreFilter');
    var statusFilter = document.getElementById('statusFilter');
    var syncBtn = document.getElementById('syncBtn');
    var newPostBtn = document.getElementById('newPostBtn');
    var newPostModal = document.getElementById('newPostModal');
    var newPostForm = document.getElementById('newPostForm');
    var popupTitle = document.getElementById('popupTitle');
    var closeModalBtn = document.getElementById('closeModalBtn');
    var confirmOverlay = document.getElementById('confirmDeleteOverlay');
    var deletePostName = document.getElementById('deletePostName');
    var cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    var confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    var toast = document.getElementById('toast');
    var statTotal = document.getElementById('statTotal');
    var statPublished = document.getElementById('statPublished');
    var statDraft = document.getElementById('statDraft');

    var svg = {
        spinner: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        film: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>',
        eye: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    };

    function showToast(icon, msg) {
        if (!toast) return;
        toast.innerHTML = '<span style="display:flex;align-items:center;gap:6px;">' + icon + ' ' + msg + '</span>';
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 2500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function firstMediaFallback(content) {
        if (!Array.isArray(content)) return '';
        var imgBlock = content.find(function(b) { return b.img; });
        return imgBlock ? imgBlock.img : '';
    }

    // ========== LOAD DATA ==========
    async function loadPosts() {
        postList.innerHTML = '<div class="empty-state">' + svg.spinner + '<p>Memuat...</p></div>';
        try {
            posts = await API.getAllPosts();
            populateGenreFilter();
            applyFilters();
        } catch (err) {
            console.error('Load error:', err);
            postList.innerHTML = '<div class="empty-state"><p>Gagal memuat data</p></div>';
        }
    }

    function populateGenreFilter() {
        var genreSet = {};
        posts.forEach(function(p) {
            (p.genre || '').split(',').forEach(function(g) {
                g = g.trim();
                if (g) genreSet[g] = true;
            });
        });
        var current = genreFilter.value;
        genreFilter.innerHTML = '<option value="">Semua Genre</option>';
        Object.keys(genreSet).sort().forEach(function(g) {
            var opt = document.createElement('option');
            opt.value = g; opt.textContent = g;
            genreFilter.appendChild(opt);
        });
        genreFilter.value = current;
    }

    function applyFilters() {
        var q = searchInput.value.trim().toLowerCase();
        var g = genreFilter.value;
        var s = statusFilter.value;

        filtered = posts.filter(function(p) {
            if (q && !(p.title || '').toLowerCase().includes(q)) return false;
            if (g) {
                var genres = (p.genre || '').split(',').map(function(x) { return x.trim(); });
                if (genres.indexOf(g) === -1) return false;
            }
            if (s && p.status !== s) return false;
            return true;
        });

        renderStats();
        renderList();
    }

    function renderStats() {
        statTotal.textContent = posts.length;
        statPublished.textContent = posts.filter(function(p) { return p.status === 'published'; }).length;
        statDraft.textContent = posts.filter(function(p) { return p.status === 'draft'; }).length;
    }

    function renderList() {
        postList.innerHTML = '';
        if (!filtered.length) {
            postList.innerHTML = '<div class="empty-state">' + svg.film + '<h3>Belum ada postingan</h3><p>Klik Tambah Postingan untuk mulai</p></div>';
            return;
        }
        filtered.forEach(function(item) {
            var cover = item.cover_url || firstMediaFallback(item.content) || '';
            var genres = (item.genre || '').split(',').map(function(g) { return g.trim(); }).filter(Boolean);
            var genreTags = genres.slice(0, 3).map(function(g) {
                return '<span class="tag">' + escapeHtml(g) + '</span>';
            }).join('');

            var wrapper = document.createElement('div');
            wrapper.className = 'post-card-wrapper';
            wrapper.innerHTML =
                '<div class="delete-bg">' + svg.trash + '<span>Hapus</span></div>' +
                '<div class="post-card" data-id="' + item.id + '">' +
                    (cover ? '<img class="cover" src="' + escapeHtml(cover) + '" onerror="this.style.visibility=\'hidden\'">' : '<div class="cover" style="display:flex;align-items:center;justify-content:center;">' + svg.film + '</div>') +
                    '<div class="info">' +
                        '<h3>' + escapeHtml(item.title) + '</h3>' +
                        '<div class="tags">' + genreTags + '<span class="status-pill ' + item.status + '">' + (item.status === 'published' ? 'Published' : 'Draft') + '</span></div>' +
                        '<div class="meta-row">' + svg.eye + ' ' + (item.view_count || 0) + '</div>' +
                    '</div>' +
                '</div>';

            var card = wrapper.querySelector('.post-card');
            setupSwipe(card, item);
            card.addEventListener('click', function(e) {
                if (this.classList.contains('swiped')) { resetCard(this); return; }
                window.location.href = 'editor.html?id=' + encodeURIComponent(item.id);
            });
            postList.appendChild(wrapper);
        });
    }

    function setupSwipe(card, item) {
        var startX = 0, moveX = 0, isDragging = false, threshold = -70;
        function onStart(x) { startX = x; moveX = x; isDragging = true; card.style.transition = 'none'; }
        function onMove(x) {
            if (!isDragging) return;
            moveX = x;
            var diff = moveX - startX;
            if (diff < 0) {
                card.style.transform = 'translateX(' + Math.max(diff, -90) + 'px)';
                card.classList.toggle('swiped', diff <= threshold);
            }
        }
        function onEnd() {
            if (!isDragging) return;
            isDragging = false;
            card.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1.2)';
            if ((moveX - startX) <= threshold) {
                card.classList.add('swiped');
                card.style.transform = 'translateX(-90px)';
                setTimeout(function() { showConfirm(item); }, 350);
            } else resetCard(card);
        }
        card.addEventListener('touchstart', function(e) { onStart(e.touches[0].clientX); }, { passive: true });
        card.addEventListener('touchmove', function(e) { onMove(e.touches[0].clientX); }, { passive: true });
        card.addEventListener('touchend', onEnd);
    }

    function resetCard(card) { card.classList.remove('swiped'); card.style.transform = 'translateX(0)'; }
    function resetAllCards() { document.querySelectorAll('.post-card.swiped').forEach(resetCard); }

    function showConfirm(item) {
        deleteTarget = item;
        deletePostName.textContent = '"' + item.title + '"';
        confirmOverlay.style.display = 'flex';
    }
    function hideConfirm() { confirmOverlay.style.display = 'none'; deleteTarget = null; resetAllCards(); }

    cancelDeleteBtn.addEventListener('click', hideConfirm);
    confirmOverlay.addEventListener('click', function(e) { if (e.target === confirmOverlay) hideConfirm(); });

    confirmDeleteBtn.addEventListener('click', async function() {
        if (!deleteTarget) return;
        var title = deleteTarget.title;
        var res = await API.deletePost(deleteTarget.id);
        hideConfirm();
        if (res.success) {
            showToast(svg.trash.replace('stroke="white"', 'stroke="currentColor"'), '"' + title + '" dihapus');
            loadPosts();
        } else {
            showToast(svg.alert, 'Gagal hapus: ' + res.error);
        }
    });

    function openNewModal() {
        popupTitle.value = '';
        newPostModal.style.display = 'flex';
        setTimeout(function() { popupTitle.focus(); }, 150);
    }
    function closeNewModal() { newPostModal.style.display = 'none'; }

    newPostBtn.addEventListener('click', openNewModal);
    closeModalBtn.addEventListener('click', closeNewModal);
    newPostModal.addEventListener('click', function(e) { if (e.target === newPostModal) closeNewModal(); });

    newPostForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var title = popupTitle.value.trim();
        if (!title) { showToast(svg.alert, 'Judul wajib diisi!'); return; }
        sessionStorage.setItem('newPostTitle', title);
        window.location.href = 'editor.html?new=true';
    });

    syncBtn.addEventListener('click', async function() {
        syncBtn.disabled = true;
        await loadPosts();
        syncBtn.disabled = false;
        showToast(svg.check, 'Data disinkronisasi');
    });

    searchInput.addEventListener('input', applyFilters);
    genreFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (confirmOverlay.style.display === 'flex') hideConfirm();
            if (newPostModal.style.display === 'flex') closeNewModal();
        }
    });

    loadPosts();
    console.log('✅ Dashboard VideoTabu siap!');
});
