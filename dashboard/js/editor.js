// =============================================
// EDITOR.JS - VIDEOTABU
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    var urlParams = new URLSearchParams(window.location.search);
    var editId = urlParams.get('id');
    var isNew = urlParams.get('new') === 'true';

    var fieldTitle = document.getElementById('fieldTitle');
    var fieldGenre = document.getElementById('fieldGenre');
    var fieldStatus = document.getElementById('fieldStatus');
    var statusLabel = document.getElementById('statusLabel');
    var fieldCover = document.getElementById('fieldCover');
    var coverPreview = document.getElementById('coverPreview');
    var uploadCoverBtn = document.getElementById('uploadCoverBtn');
    var blockList = document.getElementById('blockList');
    var addBlockBtn = document.getElementById('addBlockBtn');
    var saveBtn = document.getElementById('saveBtn');
    var cancelBtn = document.getElementById('cancelBtn');
    var toast = document.getElementById('toast');

    var currentId = editId || null;
    var blocks = []; // [{type:'img'|'vid', url:'', cap:''}]

    var svgX = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    var svgUp = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>';
    var svgDown = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
    var svgAlert = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    var svgCheck = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

    function showToast(icon, msg) {
        toast.innerHTML = '<span style="display:flex;align-items:center;gap:6px;">' + icon + ' ' + msg + '</span>';
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 2500);
    }

    function escapeAttr(str) {
        return String(str || '').replace(/"/g, '&quot;');
    }

    // ========== STATUS TOGGLE ==========
    fieldStatus.addEventListener('change', function() {
        statusLabel.textContent = fieldStatus.checked ? 'Published' : 'Draft';
    });

    // ========== COVER ==========
    fieldCover.addEventListener('input', updateCoverPreview);
    function updateCoverPreview() {
        var url = fieldCover.value.trim();
        if (url) {
            coverPreview.src = url;
            coverPreview.style.display = 'block';
        } else {
            coverPreview.style.display = 'none';
        }
    }
    coverPreview.addEventListener('error', function() { coverPreview.style.display = 'none'; });

    uploadCoverBtn.addEventListener('click', function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async function() {
            var file = input.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { showToast(svgAlert, 'Maks 5MB'); return; }
            showToast(svgAlert, 'Mengupload...');
            var result = await API.uploadImage(file);
            if (result.success && result.url) {
                fieldCover.value = result.url;
                updateCoverPreview();
                showToast(svgCheck, 'Cover terupload');
            } else {
                showToast(svgAlert, 'Gagal upload: ' + (result.error || 'unknown'));
            }
        };
        input.click();
    });

    // ========== CONTENT BLOCKS ==========
    function addBlock(type, url, cap) {
        blocks.push({ type: type || 'img', url: url || '', cap: cap || '' });
        renderBlocks();
    }

    function removeBlock(index) {
        blocks.splice(index, 1);
        renderBlocks();
    }

    function moveBlock(index, dir) {
        var target = index + dir;
        if (target < 0 || target >= blocks.length) return;
        var tmp = blocks[index];
        blocks[index] = blocks[target];
        blocks[target] = tmp;
        renderBlocks();
    }

    function setBlockType(index, type) {
        blocks[index].type = type;
        renderBlocks();
    }

    function renderBlocks() {
        blockList.innerHTML = '';
        blocks.forEach(function(block, i) {
            var card = document.createElement('div');
            card.className = 'block-card';

            var previewHtml = '';
            if (block.type === 'img' && block.url) {
                previewHtml = '<img class="preview-img" src="' + escapeAttr(block.url) + '" onerror="this.style.display=\'none\'">';
            } else if (block.type === 'vid' && block.url) {
                previewHtml = '<div class="vid-preview"><iframe src="' + escapeAttr(block.url) + '" frameborder="0" allowfullscreen></iframe></div>';
            }

            card.innerHTML =
                '<div class="block-head">' +
                    '<span class="block-num">Block ' + (i + 1) + '</span>' +
                    '<div class="block-controls">' +
                        '<button data-act="up" ' + (i === 0 ? 'disabled' : '') + '>' + svgUp + '</button>' +
                        '<button data-act="down" ' + (i === blocks.length - 1 ? 'disabled' : '') + '>' + svgDown + '</button>' +
                        '<button data-act="del" class="danger">' + svgX + '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="toggle-type">' +
                    '<button data-type="img" class="' + (block.type === 'img' ? 'active' : '') + '">img</button>' +
                    '<button data-type="vid" class="' + (block.type === 'vid' ? 'active' : '') + '">vid</button>' +
                '</div>' +
                '<div class="field">' +
                    '<label>' + (block.type === 'img' ? 'Image URL' : 'Video Embed URL') + '</label>' +
                    '<input type="text" class="input block-url" placeholder="' + (block.type === 'img' ? 'https://...jpg' : 'https://ps21.seeks.cloud/#xxxxx') + '" value="' + escapeAttr(block.url) + '">' +
                '</div>' +
                '<div class="field">' +
                    '<label>Caption (opsional)</label>' +
                    '<input type="text" class="input block-cap" placeholder="Caption..." value="' + escapeAttr(block.cap) + '">' +
                '</div>' +
                previewHtml;

            // controls
            card.querySelector('[data-act="up"]').addEventListener('click', function() { moveBlock(i, -1); });
            card.querySelector('[data-act="down"]').addEventListener('click', function() { moveBlock(i, 1); });
            card.querySelector('[data-act="del"]').addEventListener('click', function() { removeBlock(i); });

            card.querySelectorAll('[data-type]').forEach(function(btn) {
                btn.addEventListener('click', function() { setBlockType(i, btn.dataset.type); });
            });

            var urlInput = card.querySelector('.block-url');
            urlInput.addEventListener('blur', function() {
                blocks[i].url = urlInput.value.trim();
                renderBlocks();
            });

            var capInput = card.querySelector('.block-cap');
            capInput.addEventListener('input', function() {
                blocks[i].cap = capInput.value;
            });

            blockList.appendChild(card);
        });
    }

    addBlockBtn.addEventListener('click', function() { addBlock('img', '', ''); });

    // ========== LOAD ==========
    async function loadPost() {
        if (isNew) {
            var savedTitle = sessionStorage.getItem('newPostTitle') || '';
            fieldTitle.value = savedTitle;
            sessionStorage.removeItem('newPostTitle');
            blocks = [];
            renderBlocks();
            return;
        }
        if (!currentId) {
            showToast(svgAlert, 'ID postingan tidak ditemukan');
            return;
        }
        var post = await API.getPost(currentId);
        if (!post) {
            showToast(svgAlert, 'Gagal memuat postingan');
            return;
        }
        fieldTitle.value = post.title || '';
        fieldGenre.value = post.genre || '';
        fieldCover.value = post.cover_url || '';
        updateCoverPreview();
        fieldStatus.checked = post.status === 'published';
        statusLabel.textContent = fieldStatus.checked ? 'Published' : 'Draft';

        blocks = Array.isArray(post.content) ? post.content.map(function(b) {
            if (b.img !== undefined) return { type: 'img', url: b.img, cap: b.cap || '' };
            if (b.vid !== undefined) return { type: 'vid', url: b.vid, cap: b.cap || '' };
            return { type: 'img', url: '', cap: b.cap || '' };
        }) : [];
        renderBlocks();
    }

    // ========== SAVE ==========
    function blocksToContent() {
        return blocks
            .filter(function(b) { return b.url && b.url.trim(); })
            .map(function(b) {
                var obj = {};
                obj[b.type] = b.url.trim();
                if (b.cap && b.cap.trim()) obj.cap = b.cap.trim();
                return obj;
            });
    }

    async function savePost() {
        var title = fieldTitle.value.trim();
        if (!title) { showToast(svgAlert, 'Judul wajib diisi!'); return; }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Menyimpan...';

        var payload = {
            title: title,
            genre: fieldGenre.value.trim(),
            cover_url: fieldCover.value.trim(),
            status: fieldStatus.checked ? 'published' : 'draft',
            content: blocksToContent()
        };

        try {
            var result;
            if (currentId) {
                result = await API.updatePost(currentId, payload);
            } else {
                result = await API.createPost(payload);
            }

            if (result.success) {
                showToast(svgCheck, 'Postingan tersimpan');
                setTimeout(function() { window.location.href = 'index.html'; }, 1000);
            } else {
                throw new Error(result.error || 'Gagal menyimpan');
            }
        } catch (err) {
            console.error('Save error:', err);
            showToast(svgAlert, 'Gagal: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
        }
    }

    saveBtn.addEventListener('click', savePost);
    cancelBtn.addEventListener('click', function() { window.location.href = 'index.html'; });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            savePost();
        }
    });

    loadPost();
    console.log('✅ Editor VideoTabu siap!');
});
