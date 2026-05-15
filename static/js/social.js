/*
 Social feed functionality for the application.

 Handles:
 - Loading and rendering posts
 - Likes and comments
 - Post creation and deletion
 - Modal interactions
 - Profile/grid post rendering
 - UI refresh behaviour
*/

const currentUser = window.currentUser || "guest";

//converts a timestamp into a human-readable "time ago" format.
// ── TIME AGO ─────────────────────────
function timeAgo(timestamp) {
    if (!timestamp) return "";
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// Generates either a user avatar image or a placeholder avatar.
function avatarMarkup(username, avatar) {
    if (avatar) {
        return `<img class="avatar" src="${avatar}" alt="${username} profile photo">`;
    }
    return `<div class="avatar avatar-placeholder">${(username || "U").charAt(0).toUpperCase()}</div>`;
}

// Initialize social feed when the page finishes loading.
window.onload = function () {
    if (document.getElementById("feed")) loadPosts();
};

// Fetches all posts from the backend API and renders them into the feed
// ── LOAD POSTS ─────────────────────────
function loadPosts() {
    fetch("/api/posts")
        .then(res => res.json())
        .then(posts => {
            const feedEl = document.getElementById("feed");
            if (!feedEl) return;
            feedEl.innerHTML = "";
            posts.forEach(post => renderPost(post));
        })
        .catch(err => console.error("Error loading posts:", err));
}

// Renders a post either in the main feed, profile grid, or modal view
// ── RENDER POST ─────────────────────────
function renderPost(postData, targetId = "feed", mode = "feed") {
    const isModal = targetId === "modal-post-container";
    const feed = document.getElementById(targetId);
    if (!feed) return;

    if (mode === "profile") {

    const gridPost = document.createElement("div");
    gridPost.classList.add("grid-post");

    if (postData.image) {

        gridPost.innerHTML = `
            <img
                src="${postData.image}"
                class="grid-image"
            >
        `;

    } else {

        gridPost.innerHTML = `
            <div class="grid-no-image">
                <p>${postData.text || ""}</p>
            </div>
        `;
    }

    // Open selected profile post inside modal view
    gridPost.addEventListener("click", () => {

    const modal = document.getElementById("post-modal");

    const container = document.getElementById("modal-post-container");

    container.innerHTML = "";

    renderPost(postData, "modal-post-container");

    modal.classList.remove("hidden");

    });

    feed.appendChild(gridPost);

    return;
}

// Determine post interaction permissions and state for current user
    const username = postData.username || "Anonymous";
    const isLiked = postData.liked_by?.includes(currentUser);
    const canDelete = postData.username === currentUser;

    const postImage = postData.image
        ? `<div class="post-image-wrapper"><img src="${postData.image}" alt="Coffee post image"></div>`
        : "";

    const post = document.createElement("div");
    post.classList.add("post");

    // Build the main post HTML structure dynamically
    post.innerHTML = `
    <div class="post-header">
        ${avatarMarkup(username, postData.avatar || "")}
        <div class="user-info">
            <a href="/user/${username}">
                <strong>${username}</strong>
            </a>
            <span class="location">
    ${postData.shop 
        ? `<a href="/cafe/${encodeURIComponent(postData.shop)}" 
              style="color:var(--muted);text-decoration:none;"
              onmouseover="this.style.color='var(--caramel)'"
              onmouseout="this.style.color='var(--muted)'">
              <i class="bi bi-geo-alt-fill"></i> ${postData.shop}
           </a>` 
        : ""}
</span>
        </div>
    </div>
    ${postImage}
    ${!isModal ? `

<div class="post-actions">

    <button onclick="likePost(${postData.id})">

        <i class="bi ${isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>

        ${postData.likes || 0}

    </button>

    ${canDelete
        ? `<button onclick="deletePost(${postData.id})">
            <i class="bi bi-trash"></i>
           </button>`
        : ""
    }

</div>

` : `

<div class="post-actions">

    <span>${postData.likes || 0} likes</span>

</div>

`}
    <div class="post-caption">
        <strong>
            <a href="/user/${username}">
                ${username}
            </a>
        </strong>
        ${postData.text || ""}
    </div>

    <div class="comment-list">

        ${(postData.comments || []).map(c => {
            const canEdit = c.username === currentUser;
            const canDeleteComment = c.username === currentUser || postData.username === currentUser;
            return `
            <div class="comment">
                <div class="comment-top">
                    <strong>
                        <a href="/user/${c.username}">
                            ${c.username}
                        </a>
                    </strong>
                    <span class="comment-time">${timeAgo(c.time)}</span>
                </div>
                <div class="comment-text">${c.text}</div>
                <div class="comment-actions">
                    ${canEdit ? `<span onclick="editComment(${c.id}, '${c.text.replace(/'/g, "\\'")}')">Edit</span>` : ""}
                    ${canDeleteComment ? `<span onclick="deleteComment(${c.id})"><i class="bi bi-trash"></i></span>` : ""}
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
>
` : ""}
`;
    feed.appendChild(post);
}

// Sends a like request for a specific post and refreshes the UI
function likePost(postId) {
    fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
    })
    .then(() => refreshUI())
    .catch(err => console.error("Like error:", err));
}

// comment management functionality.
// Adds a new comment when the Enter key is pressed
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
// updates an existing comment using the API.
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

//deletes a selected comment after confirmation.
function deleteComment(commentId) {
    if (!confirm("Delete comment?")) return;
    fetch(`/api/comments/${commentId}`, { method: "DELETE" })
    .then(() => refreshUI())
    .catch(err => console.error("Delete error:", err));
}

// Modal handling functions for creating and viewing posts
function openModal() {
    document.getElementById("post-modal").classList.add("active");
}

function closeModal() {
    document.getElementById("post-modal").classList.remove("active");
    resetModal();
}

function resetModal() {
    document.getElementById("modal-text").value = "";
    document.getElementById("modal-shop").selectedIndex = 0;
    const fileInput = document.getElementById("modal-image");
    if (fileInput) fileInput.value = "";
    const preview = document.getElementById("image-preview");
    if (preview) preview.src = "";
    const container = document.querySelector(".preview-container");
    if (container) container.style.display = "none";
}

// Displays a live preview of the selected image before upload
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById("image-preview");
        const container = document.querySelector(".preview-container");
        preview.src = e.target.result;
        container.style.display = "block";
    };
    reader.readAsDataURL(file);
}

// Handles creation and submission of new social posts
function submitModalPost() {
    const text = document.getElementById("modal-text").value.trim();
    const shop = document.getElementById("modal-shop").value;
    const imageInput = document.getElementById("modal-image");

    if (!text || imageInput.files.length === 0) {
        alert("Add caption + image");
        return;
    }

    const formData = new FormData();
    formData.append("text", text);
    formData.append("shop", shop || "");
    formData.append("image", imageInput.files[0]);

    fetch("/api/posts", { method: "POST", body: formData })
    .then(res => res.json())
    .then(() => { resetModal(); closeModal(); loadPosts(); })
    .catch(err => console.error("Error creating post:", err));
}

// Deletes a post after user confirmation.
function deletePost(postId) {
    if (!confirm("Delete this post?")) return;
    fetch(`/api/posts/${postId}`, { method: "DELETE" })
    .then(() => refreshUI())
    .catch(err => console.error("Delete error:", err));
}

// Refreshes either the profile feed or global feed depending on page context
function refreshUI() {
    if (document.getElementById("profile-feed") && typeof loadProfilePosts === "function") {
        loadProfilePosts();
    } else if (document.getElementById("feed")) {
        loadPosts();
    }
}

// Redirects the user back to the landing page.
function logout() {
    window.location.href = routes.landing;
}