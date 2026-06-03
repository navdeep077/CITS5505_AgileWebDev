/*
 * social.js
 */

const currentUser = window.currentUser || "guest";

// ── TIME AGO ──────────────────────────────────────────────────────────────────
function parseUtcTimestamp(timestamp) {
    if (!timestamp) return null;
    const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(timestamp);
    return new Date(hasTimezone ? timestamp : `${timestamp}Z`);
}

function timeAgo(timestamp) {
    if (!timestamp) return "";
    const now  = new Date();
    const past = parseUtcTimestamp(timestamp);
    let seconds = Math.floor((now - past) / 1000);
    if (Number.isNaN(seconds)) return "";
    seconds = Math.max(seconds, 0);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// ── AVATAR MARKUP ─────────────────────────────────────────────────────────────
function avatarMarkup(username, avatar) {
    if (avatar) {
        return `<img class="avatar" src="${avatar}" alt="${username}">`;
    }
    return `<div class="avatar avatar-placeholder">
        ${(username || "U").charAt(0).toUpperCase()}
    </div>`;
}

// ── PARSE TEXT ────────────────────────────────────────────────────────────────
function parseText(text) {
    if (!text) return '';
    text = text.replace(/#(\w+)/g, '<a href="/hashtag/$1" class="hashtag-link">#$1</a>');
    text = text.replace(/@(\w+)/g, '<a href="/user/$1" class="mention-link">@$1</a>');
    return text;
}

// ── READING TIME ──────────────────────────────────────────────────────────────
function getReadingTime(text) {
    if (!text) return '';
    const words = text.trim().split(/\s+/).length;
    if (words < 100) return '';
    const mins = Math.ceil(words / 200);
    return `${mins} min read`;
}

// ── COLLAPSIBLE POST TEXT ─────────────────────────────────────────────────────
function buildCollapsibleText(text, postId) {
    if (!text) return '';
    const words    = text.trim().split(/\s+/);
    const limit    = 30;
    const readTime = getReadingTime(text);
    const uid      = `${postId}-${Date.now()}`;

    if (words.length <= limit) {
        return parseText(text);
    }

    const short = words.slice(0, limit).join(' ');

    return `<span class="caption-short" id="short-${uid}">${parseText(short)}<span style="color:var(--muted);">...</span>
        <button onclick="expandCaption('${uid}')"
            style="background:none;border:none;color:var(--caramel);font-weight:700;
                cursor:pointer;font-size:0.85rem;padding:0;margin-left:4px;font-family:inherit;">
            more
        </button>
    </span>
    <span class="caption-full" id="full-${uid}" style="display:none;">${parseText(text)}
        <button onclick="collapseCaption('${uid}')"
            style="background:none;border:none;color:var(--caramel);font-weight:700;
                cursor:pointer;font-size:0.85rem;padding:0;margin-left:4px;font-family:inherit;">
            less
        </button>
        ${readTime ? `<span class="post-reading-time" style="margin-left:8px;">
            <i class="bi bi-clock"></i> ${readTime}
        </span>` : ''}
    </span>`;
}

function expandCaption(uid) {
    const s = document.getElementById(`short-${uid}`);
    const f = document.getElementById(`full-${uid}`);
    if (s) s.style.display = 'none';
    if (f) f.style.display = 'inline';
}

function collapseCaption(uid) {
    const s = document.getElementById(`short-${uid}`);
    const f = document.getElementById(`full-${uid}`);
    if (s) s.style.display = 'inline';
    if (f) f.style.display = 'none';
}

// ── INITIALIZE FEED ───────────────────────────────────────────────────────────
window.onload = function() {
    if (document.getElementById("feed")) {
        loadPosts();
        setupInfiniteScroll();
    }
};

// ── DRAG TO SCROLL FILTER BAR ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const bar = document.getElementById('filter-bar');
    if (!bar) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    bar.addEventListener('mousedown', e => {
        isDown     = true;
        bar.style.cursor = 'grabbing';
        startX     = e.pageX - bar.offsetLeft;
        scrollLeft = bar.scrollLeft;
    });

    document.addEventListener('mouseup', () => {
        isDown = false;
        bar.style.cursor = 'grab';
    });

    bar.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        const x    = e.pageX - bar.offsetLeft;
        const walk = (x - startX) * 1.5;
        bar.scrollLeft = scrollLeft - walk;
    });

    bar.style.cursor = 'grab';

    // Touch scroll for mobile
    let touchStartX  = 0;
    let touchScrollL = 0;

    bar.addEventListener('touchstart', e => {
        touchStartX  = e.touches[0].pageX;
        touchScrollL = bar.scrollLeft;
    }, { passive: true });

    bar.addEventListener('touchmove', e => {
        const diff = touchStartX - e.touches[0].pageX;
        bar.scrollLeft = touchScrollL + diff;
    }, { passive: true });
});

// ── INFINITE SCROLL ───────────────────────────────────────────────────────────
let currentPage   = 1;
const postsPerPage = 10;
let allPosts      = [];
let loading       = false;

function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if (loading) return;
        const scrolledToBottom =
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
        if (scrolledToBottom) loadMorePosts();
    });
}

function loadMorePosts() {
    if (loading) return;
    const feed = document.getElementById("feed");
    if (!feed) return;

    const start     = currentPage * postsPerPage;
    const nextPosts = allPosts.slice(start, start + postsPerPage);
    if (nextPosts.length === 0) return;

    loading = true;
    const skeleton = document.createElement('div');
    skeleton.id = 'scroll-skeleton';
    skeleton.innerHTML = `
        <div class="skeleton-post">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-line" style="width:40%;"></div>
                    <div class="skeleton skeleton-line" style="width:25%;"></div>
                </div>
            </div>
            <div class="skeleton skeleton-image"></div>
        </div>`;
    feed.appendChild(skeleton);

    setTimeout(() => {
        skeleton.remove();
        nextPosts.forEach(post => renderPost(post));
        currentPage++;
        loading = false;
    }, 600);
}

// ── LOAD POSTS ────────────────────────────────────────────────────────────────
function loadPosts() {
    const feed = document.getElementById("feed");
    if (!feed) return;

    feed.innerHTML = `
        <div class="skeleton-post">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-line" style="width:40%;"></div>
                    <div class="skeleton skeleton-line" style="width:25%;"></div>
                </div>
            </div>
            <div class="skeleton skeleton-image"></div>
        </div>
        <div class="skeleton-post">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-line" style="width:35%;"></div>
                    <div class="skeleton skeleton-line" style="width:20%;"></div>
                </div>
            </div>
            <div class="skeleton skeleton-image"></div>
        </div>`;

    fetch("/api/posts")
        .then(res => res.json())
        .then(posts => {
            if (!Array.isArray(posts)) posts = [];
            allPosts    = posts;
            feed.innerHTML = "";
            currentPage = 1;

            if (posts.length === 0) {
                feed.innerHTML = `
                    <div class="empty-feed-card">
                        <i class="bi bi-camera-fill"></i>
                        <h5>No posts yet</h5>
                        <p>Be the first to share a coffee moment.</p>
                    </div>`;
                return;
            }
            posts.slice(0, postsPerPage).forEach(post => renderPost(post));
        })
        .catch(err => {
            console.error("Error loading posts:", err);
            feed.innerHTML = `
                <div class="empty-feed-card">
                    <i class="bi bi-wifi-off"></i>
                    <h5>Could not load posts</h5>
                    <p>Please refresh and try again.</p>
                </div>`;
        });
}

// ── RENDER POST ───────────────────────────────────────────────────────────────
function renderPost(postData, targetId = "feed", mode = "feed") {
    const isModal = targetId === "modal-post-container";
    const feed    = document.getElementById(targetId);
    if (!feed) return;

    // Profile grid mode
    if (mode === "profile") {
        const gridPost = document.createElement("div");
        gridPost.classList.add("grid-post");
        if (postData.image) {
            gridPost.innerHTML = `<img src="${postData.image}" class="grid-image">`;
        } else {
            gridPost.innerHTML = `<div class="grid-no-image"><p>${postData.text || ""}</p></div>`;
        }
        gridPost.addEventListener("click", () => {
            const modal     = document.getElementById("post-modal");
            const container = document.getElementById("modal-post-container");
            container.innerHTML = "";
            renderPost(postData, "modal-post-container");
            modal.classList.remove("hidden");
        });
        feed.appendChild(gridPost);
        return;
    }

    const username  = postData.username || "Anonymous";
    const isLiked   = postData.liked_by?.includes(currentUser);
    const canDelete = postData.username === currentUser;
    const canEdit   = postData.username === currentUser;

    if (!isModal && postData.id && currentUser !== "guest") {
        fetch(`/api/posts/${postData.id}/view`, { method: "POST" })
            .then(res => res.json())
            .then(data => {
                if (typeof data.view_count !== "undefined") {
                    document.querySelectorAll(`[data-view-count="${postData.id}"]`)
                        .forEach(el => el.textContent = data.view_count);
                }
            })
            .catch(() => {});
    }

    const postImage = postData.image
        ? `<div class="post-image-wrapper">
               <img src="${postData.image}" alt="post image" style="width:100%;height:auto;display:block;">
           </div>`
        : "";

    const hashtagHtml = postData.hashtags && postData.hashtags.length > 0
        ? `<div class="post-hashtags">
               ${postData.hashtags.map(t => t
                   ? `<a href="/hashtag/${t}" class="hashtag-pill">#${t}</a>`
                   : '').join('')}
           </div>`
        : "";

    const post = document.createElement("div");
    post.classList.add("post");
    post.dataset.postId = postData.id;

    post.innerHTML = `
    <div class="post-header">
        ${avatarMarkup(username, postData.avatar || "")}
        <div class="user-info">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:nowrap;">
                <a href="/user/${username}" class="post-username" style="font-weight:700;text-decoration:none;color:var(--text,#1a0e00);">
                    ${username}
                </a>
                <span style="color:var(--muted);font-size:0.78rem;white-space:nowrap;">${timeAgo(postData.created_at)}</span>
            </div>
            ${postData.shop
                ? `<a href="/cafe/${encodeURIComponent(postData.shop)}" class="cafe-link">
                       <i class="bi bi-geo-alt-fill"></i> ${postData.shop}
                   </a>`
                : ""}
        </div>
    </div>

    ${postImage}
    ${hashtagHtml}

    ${!isModal ? `
    <div class="post-actions">
        <button onclick="likePost(${postData.id}, this)" class="action-btn like-btn" data-liked="${isLiked}">
            <i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"
               style="color:${isLiked ? '#e53935' : 'inherit'}"></i>
            <span class="like-count">${postData.likes || 0}</span>
        </button>
        <button onclick="toggleBookmark(${postData.id}, this)" class="action-btn bookmark-btn">
            <i class="bi bi-bookmark"></i>
        </button>
        <button onclick="sharePost(${postData.id})" class="action-btn share-btn" title="Share post">
            <i class="bi bi-share"></i>
        </button>
        ${!canDelete ? `
        <button onclick="reportPost(${postData.id})" class="action-btn report-btn" title="Report post">
            <i class="bi bi-flag"></i>
        </button>` : ""}
        <span class="view-count">
            <i class="bi bi-eye"></i>
            <span data-view-count="${postData.id}">${postData.view_count || 0}</span>
        </span>
        ${canEdit ? `
        <button onclick="editPost(${postData.id})" class="action-btn edit-btn">
            <i class="bi bi-pencil"></i>
        </button>` : ""}
        ${canDelete ? `
        <button onclick="deletePost(${postData.id})" class="action-btn delete-btn">
            <i class="bi bi-trash"></i>
        </button>` : ""}
    </div>` : `
    <div class="post-actions">
        <span>${postData.likes || 0} likes</span>
        <span><i class="bi bi-eye"></i>
            <span data-view-count="${postData.id}">${postData.view_count || 0}</span> views
        </span>
    </div>`}

    <div class="post-caption-full"
         id="caption-${postData.id}"
         data-raw="${(postData.text || '').replace(/"/g, '&quot;')}"
         data-username="${username}">
        <strong>
            <a href="/user/${username}" style="color:var(--text,#1a0e00);text-decoration:none;">
                ${username}
            </a>
        </strong>
        &nbsp;${buildCollapsibleText(postData.text, postData.id)}
    </div>

    <div class="comment-list">
        ${(postData.comments || []).map(c => {
            const canEditComment   = c.username === currentUser;
            const canDeleteComment = c.username === currentUser || postData.username === currentUser;
            return `
            <div class="comment" id="comment-${c.id}">
                <div class="comment-top">
                    <strong><a href="/user/${c.username}">${c.username}</a></strong>
                    <span class="comment-time">${timeAgo(c.time)}</span>
                </div>
                <div class="comment-text">${parseText(c.text)}</div>
                <div class="comment-actions">
                    ${canEditComment
                        ? `<span onclick="editComment(${c.id}, '${c.text.replace(/'/g, "\\'")}')">Edit</span>`
                        : ""}
                    ${canDeleteComment
                        ? `<span onclick="deleteComment(${c.id})"><i class="bi bi-trash"></i></span>`
                        : ""}
                </div>
            </div>`;
        }).join("")}
    </div>

    ${!isModal ? `
    <input type="text" class="comment-input"
           placeholder="Add a comment..."
           onkeypress="addComment(event, ${postData.id}, this)">` : ""}
    `;

    feed.appendChild(post);

    if (typeof window.initLightbox === 'function') {
        setTimeout(window.initLightbox, 100);
    }
}

// ── LIKE ──────────────────────────────────────────────────────────────────────
function likePost(postId, btn) {
    const icon    = btn.querySelector('i');
    const countEl = btn.querySelector('.like-count');

    icon.style.transform  = 'scale(1.4)';
    icon.style.transition = 'transform 0.15s ease';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 150);

    fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
    })
    .then(res => res.json())
    .then(data => {
        if (data.liked) {
            icon.className    = 'bi bi-heart-fill';
            icon.style.color  = '#e53935';
            btn.dataset.liked = 'true';
            icon.style.transform = 'scale(1.6)';
            setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
        } else {
            icon.className    = 'bi bi-heart';
            icon.style.color  = '';
            btn.dataset.liked = 'false';
        }
        if (countEl) countEl.textContent = data.likes;
    })
    .catch(err => console.error("Like error:", err));
}

// ── EDIT POST ─────────────────────────────────────────────────────────────────
function editPost(postId) {
    const captionEl = document.getElementById(`caption-${postId}`);
    if (!captionEl) return;

    let currentText = captionEl.dataset.raw || '';
    if (!currentText) {
        const clone = captionEl.cloneNode(true);
        clone.querySelectorAll('button, .post-reading-time').forEach(el => el.remove());
        currentText = clone.innerText.trim();
    }

    captionEl.innerHTML = `
        <div class="edit-post-form" style="position:relative;">
            <textarea id="edit-input-${postId}" class="edit-caption-input"
                rows="3">${currentText}</textarea>
            <div class="edit-post-actions">
                <button onclick="savePostEdit(${postId})" class="btn-save-edit">Save</button>
                <button onclick="cancelPostEdit(${postId}, \`${currentText.replace(/`/g, '\\`')}\`)"
                    class="btn-cancel-edit">Cancel</button>
            </div>
        </div>`;

    setTimeout(() => {
        if (typeof initHashtagAutocomplete === 'function') {
            initHashtagAutocomplete(`edit-input-${postId}`);
        }
        const editTextarea = document.getElementById(`edit-input-${postId}`);
        if (editTextarea && typeof initMentionAutocompleteOnInput === 'function') {
            initMentionAutocompleteOnInput(editTextarea);
        }
    }, 100);
}

function savePostEdit(postId) {
    const input = document.getElementById(`edit-input-${postId}`);
    if (!input) return;
    const newText = input.value.trim();
    if (!newText) { showToast('Caption cannot be empty', 'error'); return; }

    fetch(`/api/posts/${postId}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
    })
    .then(res => res.json())
    .then(data => {
        const captionEl = document.getElementById(`caption-${postId}`);
        if (captionEl) {
            captionEl.dataset.raw = data.text;
            const uname = captionEl.dataset.username || '';
            captionEl.innerHTML = `
                <strong>
                    <a href="/user/${uname}" style="color:var(--text,#1a0e00);text-decoration:none;">
                        ${uname}
                    </a>
                </strong>
                &nbsp;${buildCollapsibleText(data.text, postId)}
                <span style="font-size:0.72rem;color:var(--muted);margin-left:6px;">(edited)</span>`;
        }
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        if (post) {
            const hashtagEl = post.querySelector('.post-hashtags');
            if (hashtagEl && data.hashtags) {
                hashtagEl.innerHTML = data.hashtags.split(',').map(t =>
                    t ? `<a href="/hashtag/${t}" class="hashtag-pill">#${t}</a>` : ''
                ).join('');
            }
        }
        showToast('Post updated ✓', 'success');
    })
    .catch(err => console.error('Edit post error:', err));
}

function cancelPostEdit(postId, originalText) {
    const captionEl = document.getElementById(`caption-${postId}`);
    if (captionEl) {
        const uname = captionEl.dataset.username || '';
        captionEl.innerHTML = `
            <strong>
                <a href="/user/${uname}" style="color:var(--text,#1a0e00);text-decoration:none;">
                    ${uname}
                </a>
            </strong>
            &nbsp;${buildCollapsibleText(originalText, postId)}`;
    }
}

// ── BOOKMARK ──────────────────────────────────────────────────────────────────
function toggleBookmark(postId, btn) {
    fetch(`/api/bookmarks/${postId}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            const icon = btn.querySelector('i');
            if (data.bookmarked) {
                icon.className   = 'bi bi-bookmark-fill';
                icon.style.color = 'var(--caramel)';
                showToast('Post saved ✓', 'success');
            } else {
                icon.className   = 'bi bi-bookmark';
                icon.style.color = '';
                showToast('Removed from saved', 'info');
            }
        })
        .catch(err => console.error('Bookmark error:', err));
}

// ── COMMENTS ──────────────────────────────────────────────────────────────────
function addComment(e, postId, input) {
    if (e.key !== "Enter" || input.value.trim() === "") return;
    const text = input.value.trim();
    fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, text })
    })
    .then(() => { input.value = ""; refreshUI(); })
    .catch(err => console.error("Comment error:", err));
}

function editComment(commentId, currentText) {
    const newText = prompt("Edit comment:", currentText);
    if (!newText) return;
    fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText })
    })
    .then(() => refreshUI())
    .catch(err => console.error("Edit error:", err));
}

function deleteComment(commentId) {
    if (!confirm("Delete comment?")) return;
    fetch(`/api/comments/${commentId}`, { method: "DELETE" })
        .then(() => refreshUI())
        .catch(err => console.error("Delete error:", err));
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal() {
    const modal = document.getElementById('create-post-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    const modal = document.getElementById('create-post-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = '';
    }
    document.body.style.overflow = '';
    resetModal();
}

function resetModal() {
    const text = document.getElementById("modal-text");
    const shop = document.getElementById("modal-shop");
    const file = document.getElementById("modal-image");
    const prev = document.getElementById("image-preview");
    const cont = document.querySelector(".preview-container");
    if (text) text.value = "";
    if (shop) shop.selectedIndex = 0;
    if (file) file.value = "";
    if (prev) prev.src = "";
     if (cont) cont.style.display = "none";
    const sched = document.getElementById("modal-schedule");
    if (sched) sched.value = "";
}

function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview   = document.getElementById("image-preview");
        const container = document.querySelector(".preview-container");
        preview.src = e.target.result;
        container.style.display = "block";
    };
    reader.readAsDataURL(file);
}

function submitModalPost() {
    const text          = document.getElementById("modal-text").value.trim();
    const shop          = document.getElementById("modal-shop").value;
    const imageInput    = document.getElementById("modal-image");
    const scheduleInput = document.getElementById("modal-schedule");
    const scheduledAt   = scheduleInput ? scheduleInput.value : '';

    if (!text) { showToast('Add a caption first', 'error'); return; }

    if (scheduledAt) {
        showToast('Post scheduled ✓', 'success');
    }

    const formData = new FormData();
    formData.append("text", text);
    formData.append("shop", shop || "");
    if (scheduledAt) {
        formData.append("scheduled_at", scheduledAt);
    }
    if (imageInput && imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
    }

    const endpoint = scheduledAt ? '/api/posts/schedule' : '/api/posts';

    fetch(endpoint, { method: "POST", body: formData })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not create post');
            return data;
        })
        .then(() => {
            resetModal();
            closeModal();
            if (scheduledAt) {
                const d = new Date(scheduledAt);
                showToast(`Post scheduled for ${d.toLocaleString()} ✓`, 'success');
            } else {
                loadPosts();
                showToast('Post created ✓', 'success');
            }
        })
        .catch(err => {
            console.error("Error creating post:", err);
            showToast(err.message || 'Could not create post', 'error');
        });
}

// ── DELETE POST ───────────────────────────────────────────────────────────────
function deletePost(postId) {
    if (!confirm("Delete this post?")) return;
    fetch(`/api/posts/${postId}`, { method: "DELETE" })
        .then(() => { refreshUI(); showToast('Post deleted', 'info'); })
        .catch(err => console.error("Delete error:", err));
}

// ── REFRESH UI ────────────────────────────────────────────────────────────────
function refreshUI() {
    if (typeof loadProfilePosts === "function") {
        loadProfilePosts();
    } else if (document.getElementById("feed")) {
        loadPosts();
    }
}

// ── REPORT POST ───────────────────────────────────────────────────────────────
function reportPost(postId) {
    const reason = prompt('Why are you reporting this post?\n\n1. Spam\n2. Inappropriate\n3. Harassment\n4. Other\n\nType your reason:');
    if (!reason) return;
    fetch(`/api/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) showToast(data.error, 'error');
        else showToast('Post reported. Thank you.', 'success');
    })
    .catch(err => console.error('Report error:', err));
}

// ── SHARE POST ────────────────────────────────────────────────────────────────
function sharePost(postId) {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => showToast('Link copied ✓', 'success'));
    } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Link copied ✓', 'success');
    }
}

// ── FILTER FEED BY CAFE ───────────────────────────────────────────────────────
function filterFeed(cafeName, btn) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const feed = document.getElementById('feed');
    if (!feed) return;

    if (!cafeName) { loadPosts(); return; }

    feed.innerHTML = `
        <div class="skeleton-post">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-line" style="width:40%;"></div>
                </div>
            </div>
            <div class="skeleton skeleton-image"></div>
        </div>`;

    fetch(`/api/posts/cafe/${encodeURIComponent(cafeName)}`)
        .then(res => res.json())
        .then(posts => {
            feed.innerHTML = '';
            if (posts.length === 0) {
                feed.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:var(--muted);">
                        <i class="bi bi-cup-hot" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                        <h5>No posts for ${cafeName} yet</h5>
                        <p>Be the first to post from this cafe!</p>
                    </div>`;
                return;
            }
            posts.forEach(post => renderPost(post));
        })
        .catch(err => console.error('Filter error:', err));
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
function logout() {
    window.location.href = window.routes?.landing || '/';
}