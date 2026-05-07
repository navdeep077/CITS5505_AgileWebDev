const currentUser = window.currentUser || "guest";

const defaultPosts = [
    {
        username: "CoffeeLover",
        owner: "CoffeeLover",
        avatar: "https://i.pravatar.cc/40?img=1",
        text: "Best latte I have had in Perth",
        shop: "La Veen Coffee",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
        likes: 5,
        likedBy: [],
        comments: [
            { username: "brewmaster", owner: "brewmaster", text: "This place is amazing!", time: new Date().toISOString() }
        ],
        time: "seed1",
        created_at: "2026-01-01T00:00:00"
    },
    {
        username: "BrewMaster",
        owner: "BrewMaster",
        avatar: "https://i.pravatar.cc/40?img=2",
        text: "Morning espresso hit",
        shop: "Blacklist Coffee Roasters",
        image: "https://images.unsplash.com/photo-1511920170033-f8396924c348",
        likes: 8,
        likedBy: [],
        comments: [
            { username: "coffeelover", owner: "coffeelover", text: "This place is amazing!", time: new Date().toISOString() }
        ],
        time: "seed2",
        created_at: "2026-01-02T00:00:00"
    },
    {
        username: "BeanHunter",
        owner: "BeanHunter",
        avatar: "https://i.pravatar.cc/40?img=3",
        text: "Chill vibes and cold brew",
        shop: "Venn Coffee",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
        likes: 3,
        likedBy: [],
        comments: [
            { username: "coffeelover", owner: "coffeelover", text: "Awesome!", time: new Date().toISOString() }
        ],
        time: "seed3",
        created_at: "2026-01-03T00:00:00"
    }
];

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

function getPostInteractions() {
    return JSON.parse(localStorage.getItem("postInteractions")) || {};
}

function savePostInteractions(interactions) {
    localStorage.setItem("postInteractions", JSON.stringify(interactions));
}

function withSavedInteractions(post) {
    const interactions = getPostInteractions()[post.time];
    if (!interactions) return post;

    return {
        ...post,
        likes: interactions.likes ?? post.likes,
        likedBy: interactions.likedBy || post.likedBy || [],
        comments: interactions.comments || post.comments || []
    };
}

async function fetchServerPosts() {
    const response = await fetch("/api/posts");
    if (!response.ok) return [];
    return response.json();
}

async function getAllPosts() {
    const serverPosts = await fetchServerPosts();
    return [...serverPosts, ...defaultPosts].map(withSavedInteractions);
}

function avatarMarkup(username, avatar) {
    if (avatar) {
        return `<img class="avatar" src="${avatar}" alt="${username} profile photo">`;
    }

    return `<div class="avatar avatar-placeholder">${(username || "U").charAt(0).toUpperCase()}</div>`;
}

async function loadPosts() {
    const feedEl = document.getElementById("feed");
    if (!feedEl) return;

    const posts = await getAllPosts();
    posts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    feedEl.innerHTML = "";
    posts.forEach(post => renderPost(post));
}

function renderPost(postData, prepend = false) {
    const feed = document.getElementById("feed");
    if (!feed) return;

    const username = postData.username || "Anonymous";
    const postImage = postData.image
        ? `<div class="post-image-wrapper"><img src="${postData.image}" alt="Coffee post image"></div>`
        : "";
    const isLiked = postData.likedBy?.includes(currentUser);
    const canDelete = postData.owner === currentUser;

    const post = document.createElement("div");
    post.classList.add("post");
    post.innerHTML = `
        <div class="post-header">
            ${avatarMarkup(username, postData.avatar || "")}
            <div class="user-info">
                <strong>${username}</strong>
                <span class="location">${postData.shop || ""}</span>
            </div>
        </div>

        ${postImage}

        <div class="post-actions">
            <button onclick="likePost('${postData.time}')">
                <i class="bi ${isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>
                ${postData.likes || 0}
            </button>
            ${canDelete ? `<button onclick="deletePost('${postData.time}')"><i class="bi bi-trash"></i></button>` : ""}
        </div>

        <div class="post-caption"><strong>${username}</strong> ${postData.text || ""}</div>

        <div class="comment-list">
            ${(postData.comments || []).filter(c => typeof c === "object").map((c, index) => {
                const canDeleteComment = c.owner === currentUser || postData.owner === currentUser;
                const canEdit = c.owner === currentUser;
                return `
                    <div class="comment">
                        <div class="comment-top">
                            <strong>${c.username}</strong>
                            <span class="comment-time">${timeAgo(c.time)}</span>
                        </div>
                        <div class="comment-text">${c.text}</div>
                        <div class="comment-actions">
                            ${canEdit ? `<span onclick="editComment('${postData.time}', ${index}, this)">Edit</span>` : ""}
                            ${canDeleteComment ? `<span onclick="deleteComment('${postData.time}', ${index})"><i class="bi bi-trash"></i></span>` : ""}
                        </div>
                    </div>
                `;
            }).join("")}
        </div>

        <input type="text" class="comment-input" placeholder="Add a comment..."
            onkeypress="addComment(event, '${postData.time}', this)">
    `;

    if (prepend) feed.prepend(post);
    else feed.appendChild(post);
}

async function createServerPost({ text, shop, imageFile }) {
    const formData = new FormData();
    formData.append("text", text);
    formData.append("shop", shop || "");
    if (imageFile) formData.append("image", imageFile);

    const response = await fetch("/api/posts", {
        method: "POST",
        body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save post");
    return data;
}

async function savePost(post) {
    return createServerPost(post);
}

async function deletePost(postTime) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    if (postTime.startsWith("post-")) {
        const postId = postTime.replace("post-", "");
        const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
        if (!response.ok) {
            const data = await response.json();
            alert(data.error || "Could not delete post");
            return;
        }
    }

    await refreshCurrentFeed();
}

function likePost(postTime) {
    getAllPosts().then(posts => {
        const post = posts.find(p => p.time === postTime);
        if (!post) return;

        const likedBy = post.likedBy || [];
        const liked = likedBy.includes(currentUser);
        const interactions = getPostInteractions();
        interactions[postTime] = {
            likes: liked ? Math.max((post.likes || 1) - 1, 0) : (post.likes || 0) + 1,
            likedBy: liked ? likedBy.filter(u => u !== currentUser) : [...likedBy, currentUser],
            comments: post.comments || []
        };
        savePostInteractions(interactions);
        refreshCurrentFeed();
    });
}

function addComment(e, postTime, input) {
    if (e.key !== "Enter" || input.value.trim() === "") return;

    getAllPosts().then(posts => {
        const post = posts.find(p => p.time === postTime);
        if (!post) return;

        const interactions = getPostInteractions();
        interactions[postTime] = {
            likes: post.likes || 0,
            likedBy: post.likedBy || [],
            comments: [
                ...(post.comments || []),
                { username: currentUser, owner: currentUser, text: input.value.trim(), time: new Date().toISOString() }
            ]
        };
        savePostInteractions(interactions);
        input.value = "";
        refreshCurrentFeed();
    });
}

function editComment(postTime, index, el) {
    const commentDiv = el.closest(".comment");
    const textDiv = commentDiv.querySelector(".comment-text");
    const input = document.createElement("input");
    input.value = textDiv.innerText;
    input.classList.add("edit-input");
    textDiv.replaceWith(input);
    input.focus();

    input.onkeypress = function(e) {
        if (e.key !== "Enter") return;

        getAllPosts().then(posts => {
            const post = posts.find(p => p.time === postTime);
            if (!post || !post.comments[index]) return;

            post.comments[index].text = input.value;
            const interactions = getPostInteractions();
            interactions[postTime] = {
                likes: post.likes || 0,
                likedBy: post.likedBy || [],
                comments: post.comments
            };
            savePostInteractions(interactions);
            refreshCurrentFeed();
        });
    };
}

function deleteComment(postTime, index) {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    getAllPosts().then(posts => {
        const post = posts.find(p => p.time === postTime);
        if (!post) return;

        post.comments.splice(index, 1);
        const interactions = getPostInteractions();
        interactions[postTime] = {
            likes: post.likes || 0,
            likedBy: post.likedBy || [],
            comments: post.comments
        };
        savePostInteractions(interactions);
        refreshCurrentFeed();
    });
}

function openModal() {
    document.getElementById("post-modal").classList.add("active");
}

function closeModal() {
    document.getElementById("post-modal").classList.remove("active");
    resetModal();
}

function resetModal() {
    const text = document.getElementById("modal-text");
    const shop = document.getElementById("modal-shop");
    const aspect = document.getElementById("aspect-ratio");
    const fileInput = document.getElementById("modal-image");
    const preview = document.getElementById("image-preview");
    const container = document.querySelector(".preview-container");

    if (text) text.value = "";
    if (shop) shop.selectedIndex = 0;
    if (aspect) aspect.selectedIndex = 0;
    if (fileInput) fileInput.value = "";
    if (preview) preview.src = "";
    if (container) container.style.display = "none";
}

function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById("image-preview");
        const container = document.querySelector(".preview-container");
        const ratio = document.getElementById("aspect-ratio")?.value || "original";

        preview.src = e.target.result;
        container.style.display = "block";
        if (ratio === "square") preview.style.aspectRatio = "1 / 1";
        else if (ratio === "portrait") preview.style.aspectRatio = "4 / 5";
        else if (ratio === "landscape") preview.style.aspectRatio = "16 / 9";
        else preview.style.aspectRatio = "auto";
    };
    reader.readAsDataURL(file);
}

async function submitModalPost() {
    const text = document.getElementById("modal-text").value.trim();
    const shop = document.getElementById("modal-shop").value;
    const imageInput = document.getElementById("modal-image");

    if (!text || imageInput.files.length === 0) {
        alert("Add caption + image");
        return;
    }

    try {
        await createServerPost({ text, shop, imageFile: imageInput.files[0] });
        resetModal();
        closeModal();
        await loadPosts();
    } catch (error) {
        alert(error.message);
    }
}

async function refreshCurrentFeed() {
    if (document.getElementById("profile-feed") && typeof loadProfilePosts === "function") {
        await loadProfilePosts();
    } else {
        await loadPosts();
    }
}

function logout() {
    localStorage.removeItem("postInteractions");
    window.location.href = routes.landing;
}

window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("feed")) loadPosts();
});
