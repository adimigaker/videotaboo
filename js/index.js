// =============================================
// INDEX.JS - VIDEOTABU PUBLIC
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    var posts = [];
    var currentTab = 'home';

    var postList = document.getElementById('postList');
    var searchInput = document.getElementById('searchInput');
    var navItems = document.querySelectorAll('.nav-item');

    var svg = {
        spinner: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        film: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>',
        bookmarkOutline: '<svg class="outline" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
        bookmarkFilled: '<svg class="filled" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    };

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

    // ========== BOOKMARK (localStorage) ==========
    function getBookmarks() {
        return JSON.parse(localStorage.getItem('vt_bookmarks') || '[]');
    }
    function isBookmarked(id) {
        return getBookmarks().indexOf(id) !== -1;
    }
    function toggleBookmark(id) {
        var list = getBookmarks();
        var idx = list.indexOf(id);
        if (idx === -1) list.push(id); else list.splice(idx, 1);
        localStorage.setItem('vt_bookmarks', JSON.stringify(list));
        return idx === -1; // true kalau baru ditambah
    }

    // ========== RIWAYAT (localStorage) ==========
    function getHistory() {
        return JSON.parse(localStorage.getItem('vt_history') || '[]');
    }

    // ========== LOAD ==========
    async function loadPosts() {
        postList.innerHTML = '<div class="empty-state">' + svg.spinner + '<p>Memuat...</p></div>';
        posts = await API.getPublishedPosts();
        render();
    }

    function getFilteredByTab() {
        if (currentTab === 'bookmark') {
            var bm = getBookmarks();
            return posts.filter(function(p) { return bm.indexOf(p.id) !== -1; });
        }
        if (currentTab === 'riwayat') {
            var hist = getHistory(); // array of id, urutan terakhir dilihat di akhir
            var seen = {};
            var ordered = [];
            for (var i = hist.length - 1; i >= 0; i--) {
                if (seen[hist[i]]) continue;
                seen[hist[i]] = true;
                var found = posts.find(function(p) { return p.id === hist[i]; });
                if (found) ordered.push(found);
            }
            return ordered;
        }
        return posts;
    }

    function render() {
        var q = searchInput.value.trim().toLowerCase();
        var list = getFilteredByTab().filter(function(p) {
            return !q || (p.title || '').toLowerCase().includes(q);
        });

        postList.innerHTML = '';

        if (!list.length) {
            var emptyMsg = currentTab === 'bookmark' ? 'Belum ada bookmark' :
                           currentTab === 'riwayat' ? 'Belum ada riwayat' : 'Belum ada postingan';
            postList.innerHTML = '<div class="empty-state">' + svg.film + '<h3>' + emptyMsg + '</h3></div>';
            return;
        }

        list.forEach(function(item) {
            var cover = item.cover_url || firstMediaFallback(item.content) || '';
            var bookmarked = isBookmarked(item.id);

            var card = document.createElement('a');
            card.className = 'post-card';
            card.href = 'post.html?s=' + encodeURIComponent(item.slug);
            card.innerHTML =
                (cover ? '<img class="cover" src="' + escapeHtml(cover) + '" onerror="this.style.visibility=\'hidden\'">'
                       : '<div class="cover" style="display:flex;align-items:center;justify-content:center;">' + svg.film + '</div>') +
                '<div class="info"><h3>' + escapeHtml(item.title) + '</h3></div>' +
                '<button class="bookmark-btn ' + (bookmarked ? 'active' : '') + '" data-id="' + item.id + '">' +
                    svg.bookmarkOutline + svg.bookmarkFilled +
                '</button>';

            var bmBtn = card.querySelector('.bookmark-btn');
            bmBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var nowActive = toggleBookmark(item.id);
                bmBtn.classList.toggle('active', nowActive);
                if (currentTab === 'bookmark') render();
            });

            postList.appendChild(card);
        });
    }

    searchInput.addEventListener('input', render);

    navItems.forEach(function(btn) {
        btn.addEventListener('click', function() {
            navItems.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            render();
        });
    });

    loadPosts();
    console.log('✅ Index VideoTabu siap!');
});
