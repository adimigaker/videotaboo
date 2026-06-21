// =============================================
// POST.JS - VIDEOTABU PUBLIC
// =============================================

document.addEventListener('DOMContentLoaded', async function() {
    var BATCH_SIZE = 10;

    var urlParams = new URLSearchParams(window.location.search);
    var slug = urlParams.get('s');
    var postBody = document.getElementById('postBody');

    var svgFolder = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

    if (!slug) {
        postBody.innerHTML = '<div class="post-empty">Postingan tidak ditemukan.</div>';
        return;
    }

    var post = await API.getPostBySlug(slug);

    if (!post) {
        postBody.innerHTML = '<div class="post-empty">Postingan tidak ditemukan atau belum dipublikasikan.</div>';
        return;
    }

    document.title = post.title + ' — VideoTabu';

    var content = Array.isArray(post.content) ? post.content : [];
    var renderedCount = 0;

    function escapeAttr(str) {
        return String(str || '').replace(/"/g, '&quot;');
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

    function buildHeader() {
        postBody.innerHTML =
            '<div class="post-title-row">' + svgFolder + '<h1>' + escapeHtml(post.title) + '</h1></div>' +
            '<div id="blockContainer"></div>' +
            '<div class="sentinel" id="sentinel"></div>';
    }

    function buildBlockHtml(block) {
        if (block.img) {
            return (
                '<div class="media-block">' +
                    '<div class="media-frame">' +
                        '<img src="' + escapeAttr(block.img) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
                    '</div>' +
                    (block.cap ? '<div class="media-cap">' + escapeHtml(block.cap) + '</div>' : '') +
                '</div>'
            );
        }
        if (block.vid) {
            return (
                '<div class="media-block">' +
                    '<div class="media-frame vid-frame">' +
                        '<iframe src="' + escapeAttr(block.vid) + '" frameborder="0" allowfullscreen loading="lazy"></iframe>' +
                    '</div>' +
                    (block.cap ? '<div class="media-cap">' + escapeHtml(block.cap) + '</div>' : '') +
                '</div>'
            );
        }
        return '';
    }

    function renderNextBatch() {
        var container = document.getElementById('blockContainer');
        var sentinel = document.getElementById('sentinel');
        var end = Math.min(renderedCount + BATCH_SIZE, content.length);

        var html = '';
        for (var i = renderedCount; i < end; i++) {
            html += buildBlockHtml(content[i]);
        }
        // sisip sebelum sentinel
        var temp = document.createElement('div');
        temp.innerHTML = html;
        container.appendChild(temp);

        renderedCount = end;

        if (renderedCount >= content.length) {
            sentinel.remove();
            observer.disconnect();
        }
    }

    var observer;

    function setupLazyLoad() {
        var sentinel = document.getElementById('sentinel');
        if (!sentinel || !content.length) return;

        if (!('IntersectionObserver' in window)) {
            // Fallback: render semua sekaligus kalau browser gak support
            renderedCount = 0;
            while (renderedCount < content.length) renderNextBatch();
            return;
        }

        observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) renderNextBatch();
            });
        }, { rootMargin: '400px' });

        observer.observe(sentinel);
    }

    // ========== RIWAYAT & VIEW COUNT (sekali per kunjungan) ==========
    function recordHistory() {
        var hist = JSON.parse(localStorage.getItem('vt_history') || '[]');
        var idx = hist.indexOf(post.id);
        if (idx !== -1) hist.splice(idx, 1);
        hist.push(post.id);
        if (hist.length > 100) hist = hist.slice(hist.length - 100);
        localStorage.setItem('vt_history', JSON.stringify(hist));
    }

    function recordView() {
        var seenKey = 'vt_viewed_' + post.id;
        if (sessionStorage.getItem(seenKey)) return; // jangan double count dalam 1 sesi
        sessionStorage.setItem(seenKey, '1');
        API.incrementView(post.id, post.view_count);
    }

    // ========== INIT ==========
    if (!content.length) {
        postBody.innerHTML =
            '<div class="post-title-row">' + svgFolder + '<h1>' + escapeHtml(post.title) + '</h1></div>' +
            '<div class="post-empty">Belum ada konten.</div>';
    } else {
        buildHeader();
        renderNextBatch(); // render batch pertama langsung, sisanya lazy
        setupLazyLoad();
    }

    recordHistory();
    recordView();

    console.log('✅ Post VideoTabu siap (lazy-load aktif, ' + content.length + ' blok)!');
});
