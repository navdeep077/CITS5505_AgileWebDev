/*
 * social.js
 * Week 3 update — adds:
 * - Edit post caption
 * - Hashtag rendering and linking
 * - Animated heart on like
 * - Post view count
 * - Infinite scroll
 * - Mention @username linking
 */

const currentUser = window.currentUser || "guest";

// ── TIME AGO ──────────────────────────────────────────────────────────────────
function timeAgo(timestamp) {
    if (!timestamp) return "";
    const now  = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);
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
// Converts #hashtags and @mentions into clickable links
function parseText(text) {
    if (!text) return "";
    return text
        .replace(/#(\w+)/g, '<a href="/hashtag/$1" class="hashtag-link">#$1</a>')
        .replace(/@(\w+)/g,  '<a href="/user/$1"    class="mention-link">@$1</a>');
}

// ── INITIALIZE FEED ───────────────────────────────────────────────────────────
window.onload = function() {
    if (document.getElementById("feed")) {
        loadPosts();
        setupInfiniteScroll();
    }
};

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

        if (scrolledToBottom) {
            loadMorePosts();
        }
    });
}

function loadMorePosts() {
    if (loading) return;
    const feed = document.getElementById("feed");
    if (!feed) return;

    const start = currentPage * postsPerPage;
    const end   = start + postsPerPage;
    const nextPosts = allPosts.slice(start, end);

    if (nextPosts.length === 0) return;

    loading = true;

    // Show skeleton while loading
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
        </div>
    `;
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

    // Show skeleton first
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
        </div>
    `;

    fetch("/api/posts")
        .then(res => res.json())
        .then(posts => {
            allPosts = posts;
            feed.innerHTML = "";
            currentPage = 1;

            const firstBatch = posts.slice(0, postsPerPage);
            firstBatch.forEach(post => renderPost(post));
        })
        .catch(err => console.error("Error loading posts:", err));
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
            gridPost.innerHTML = `
                <div class="grid-no-image">
                    <p>${postData.text || ""}</p>
                </div>`;
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

    const username = postData.username || "Anonymous";
    const isLiked  = postData.liked_by?.includes(currentUser);
    const canDelete = postData.username === currentUser;
    const canEdit   = postData.username === currentUser;

    // Increment view count when post is rendered
    if (!isModal && postData.id) {
        fetch(`/api/posts/${postData.id}/view`, { method: "POST" }).catch(() => {});
    }

    const postImage = postData.image
        ? `<div class="post-image-wrapper">
               <img src="${postData.image}" alt="post image">
           </div>`
        : "";

    // Parse hashtags and mentions in text
    const parsedText = parseText(postData.text || "");

    // Hashtag pills
    const hashtagHtml = postData.hashtags && postData.hashtags.length > 0
        ? `<div class="post-hashtags">
               ${postData.hashtags.map(t => t
                   ? `<a href="/hashtag/${t}" class="hashtag-pill">#${t}</a>`
                   : ''
               ).join('')}
           </div>`
        : "";

    const post = document.createElement("div");
    post.classList.add("post");
    post.dataset.postId = postData.id;

    post.innerHTML = `
        <div class="post-header">
            ${avatarMarkup(username, postData.avatar || "")}
            <div class="user-info">
                <a href="/user/${username}" class="post-username">
                    <strong>${username}</strong>
                </a>
                <span class="location">
                    ${postData.shop
                        ? `<a href="/cafe/${encodeURIComponent(postData.shop)}"
                              class="cafe-link">
                              <i class="bi bi-geo-alt-fill"></i> ${postData.shop}
                           </a>`
                        : ""}
                </span>
            </div>
            <span class="post-time">${timeAgo(postData.created_at)}</span>
        </div>

        ${postImage}

        <div class="post-caption" id="caption-${postData.id}">
            ${parsedText}
        </div>

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
            <span class="view-count">
                <i class="bi bi-eye"></i> ${postData.view_count || 0}
            </span>
            ${canEdit
                ? `<button onclick="editPost(${postData.id})" class="action-btn edit-btn">
                       <i class="bi bi-pencil"></i>
                   </button>`
                : ""}
            ${canDelete
                ? `<button onclick="deletePost(${postData.id})" class="action-btn delete-btn">
                       <i class="bi bi-trash"></i>
                   </button>`
                : ""}
        </div>
        ` : `
        <div class="post-actions">
            <span>${postData.likes || 0} likes</span>
            <span><i class="bi bi-eye"></i> ${postData.view_count || 0} views</span>
        </div>
        `}

        <div class="post-caption-full">
            <strong>
                <a href="/user/${username}">${username}</a>
            </strong>
            ${parsedText}
        </div>

        <div class="comment-list">
            ${(postData.comments || []).map(c => {
                const canEditComment   = c.username === currentUser;
                const canDeleteComment = c.username === currentUser
                    || postData.username === currentUser;
                return `
                    <div class="comment" id="comment-${c.id}">
                        <div class="comment-top">
                            <strong>
                                <a href="/user/${c.username}">${c.username}</a>
                            </strong>
                            <span class="comment-time">${timeAgo(c.time)}</span>
                        </div>
                        <div class="comment-text">${parseText(c.text)}</div>
                        <div class="comment-actions">
                            ${canEditComment
                                ? `<span onclick="editComment(${c.id}, '${c.text.replace(/'/g, "\\'")}')">
                                       Edit
                                   </span>`
                                : ""}
                            ${canDeleteComment
                                ? `<span onclick="deleteComment(${c.id})">
                                       <i class="bi bi-trash"></i>
                                   </span>`
                                : ""}
                        </div>
                    </div>`;
            }).join("")}
        </div>

        ${!isModal ? `
        <input
            type="text"
            class="comment-input"
            placeholder="Add a comment..."
            onkeypress="addComment(event, ${postData.id}, this)"
        >` : ""}
    `;

    feed.appendChild(post);
}

// ── LIKE WITH ANIMATION ───────────────────────────────────────────────────────
function likePost(postId, btn) {
    const icon      = btn.querySelector('i');
    const countEl   = btn.querySelector('.like-count');
    const isLiked   = btn.dataset.liked === 'true';

    // Animate heart
    icon.style.transform = 'scale(1.4)';
    icon.style.transition = 'transform 0.15s ease';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 150);

    fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
    })
    .then(res => res.json())
    .then(data => {
        // Update heart colour and liked state
        if (data.liked) {
            icon.className = 'bi bi-heart-fill';
            icon.style.color = '#e53935';
            btn.dataset.liked = 'true';

            // Burst animation
            icon.style.transform = 'scale(1.6)';
            setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
        } else {
            icon.className = 'bi bi-heart';
            icon.style.color = '';
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

    const currentText = captionEl.dataset.raw || captionEl.innerText.trim();

    // Replace caption with an editable input
    captionEl.innerHTML = `
        <div class="edit-post-form">
            <textarea id="edit-input-${postId}" class="edit-caption-input"
                rows="3">${currentText}</textarea>
            <div class="edit-post-actions">
                <button onclick="savePostEdit(${postId})" class="btn-save-edit">Save</button>
                <button onclick="cancelPostEdit(${postId}, \`${currentText.replace(/`/g, '\\`')}\`)"
                    class="btn-cancel-edit">Cancel</button>
            </div>
        </div>
    `;
}

function savePostEdit(postId) {
    const input = document.getElementById(`edit-input-${postId}`);
    if (!input) return;

    const newText = input.value.trim();
    if (!newText) {
        showToast('Caption cannot be empty', 'error');
        return;
    }

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
    captionEl.innerHTML   = parseText(data.text) +
        '<span style="font-size:0.72rem;color:var(--muted);margin-left:6px;">(edited)</span>';
}
        // Update hashtag pills
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        if (post) {
            const hashtagEl = post.querySelector('.post-hashtags');
            if (hashtagEl && data.hashtags) {
                const tags = data.hashtags.split(',');
                hashtagEl.innerHTML = tags.map(t =>
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
        captionEl.innerHTML = parseText(originalText);
    }
}

// ── BOOKMARK ──────────────────────────────────────────────────────────────────
function toggleBookmark(postId, btn) {
    fetch(`/api/bookmarks/${postId}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            const icon = btn.querySelector('i');
            if (data.bookmarked) {
                icon.className        = 'bi bi-bookmark-fill';
                icon.style.color      = 'var(--caramel)';
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
    const modal = document.getElementById('create-post-modal')
               || document.getElementById('post-modal');
    if (modal) modal.classList.add('active');
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    const modal = document.getElementById('create-post-modal')
               || document.getElementById('post-modal');
    if (modal) modal.classList.remove('active');
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
    const text       = document.getElementById("modal-text").value.trim();
    const shop       = document.getElementById("modal-shop").value;
    const imageInput = document.getElementById("modal-image");

    if (!text) {
        showToast('Add a caption first', 'error');
        return;
    }

    const formData = new FormData();
    formData.append("text", text);
    formData.append("shop", shop || "");
    if (imageInput && imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
    }

    fetch("/api/posts", { method: "POST", body: formData })
        .then(res => res.json())
        .then(() => {
            resetModal();
            closeModal();
            loadPosts();
            showToast('Post created ✓', 'success');
        })
        .catch(err => console.error("Error creating post:", err));
}

// ── DELETE POST ───────────────────────────────────────────────────────────────
function deletePost(postId) {
    if (!confirm("Delete this post?")) return;
    fetch(`/api/posts/${postId}`, { method: "DELETE" })
        .then(() => {
            refreshUI();
            showToast('Post deleted', 'info');
        })
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

// ── LOGOUT ────────────────────────────────────────────────────────────────────
function logout() {
    window.location.href = window.routes?.landing || '/';
}