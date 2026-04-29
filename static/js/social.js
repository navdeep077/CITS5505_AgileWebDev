const currentUser = window.currentUser || "guest";

const defaultPosts = [
    {
        username: "CoffeeLover",
        owner: "CoffeeLover",   // ✅ ADD THIS
        avatar: "https://i.pravatar.cc/40?img=1",
        text: "Best latte I’ve had in Perth ☕",
        shop: "La Veen Coffee",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
        likes: 5,
        likedBy: [],
        comments: [
    {
        username: "brewmaster",
        owner: "brewmaster",
        text: "This place is amazing!",
        time: new Date().toISOString()
    },
]
,
        time: "seed1"
    },
    {
        username: "BrewMaster",
        owner: "BrewMaster",
        avatar: "https://i.pravatar.cc/40?img=2",
        text: "Morning espresso hit 🔥",
        shop: "Blacklist Coffee Roasters",
        image: "https://images.unsplash.com/photo-1511920170033-f8396924c348",
        likes: 8,
        likedBy: [],
        comments: [{
        username: "coffeelover",
        owner: "coffeelover",
        text: "This place is amazing!",
        time: new Date().toISOString()
    }
],

        time: "seed2"
    },
    {
        username: "BeanHunter",
        owner: "BeanHunter",
        avatar: "https://i.pravatar.cc/40?img=3",
        text: "Chill vibes and cold brew ❄️",
        shop: "Venn Coffee",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
        likes: 3,
        likedBy: [],
        comments: [{
        username: "coffeelover",
        owner: "coffeelover",
        text: "Awesome!",
        time: new Date().toISOString()
    }
],
        time: "seed3"
    }
];
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
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ── RANDOM USERS ─────────────────────────
const users = [
    { name: "CoffeeLover", avatar: "https://i.pravatar.cc/40?img=1" },
    { name: "LatteKing", avatar: "https://i.pravatar.cc/40?img=2" },
    { name: "BeanHunter", avatar: "https://i.pravatar.cc/40?img=3" },
    { name: "EspressoSoul", avatar: "https://i.pravatar.cc/40?img=4" },
    { name: "BrewMaster", avatar: "https://i.pravatar.cc/40?img=5" }
];

function getRandomUser() {
    return users[Math.floor(Math.random() * users.length)];
}

const activeUser = typeof currentUser === "string" && currentUser.trim()
    ? currentUser
    : "User";

function getSavedAvatar(username = activeUser) {
    return localStorage.getItem(`profileAvatar:${username}`) || "";
}

function getDisplayAvatar(postData) {
    if (postData.username === activeUser) return getSavedAvatar() || postData.avatar || "";
    if (postData.avatar) return postData.avatar;
    return "";
}

function avatarMarkup(username, avatar) {
    if (avatar) {
        return `<img class="avatar" src="${avatar}" alt="${username} profile photo">`;
    }

    return `<div class="avatar avatar-placeholder">${(username || "U").charAt(0).toUpperCase()}</div>`;
}

// ── INIT ─────────────────────────
window.onload = function () {
    if (document.getElementById("feed")) {
        loadPosts(); // only run on social page
    }
};

// ── STORAGE ─────────────────────────
function savePost(post) {
    let posts = JSON.parse(localStorage.getItem("posts")) || [];
    posts.unshift(post);
    localStorage.setItem("posts", JSON.stringify(posts));
}

function updateStorage(posts) {
    localStorage.setItem("posts", JSON.stringify(posts));
}

// ── LOAD POSTS ─────────────────────────
function loadPosts() {
    let posts = JSON.parse(localStorage.getItem("posts"));

    // ✅ restore default posts ONLY if empty
    if (!posts || posts.length === 0) {
        posts = defaultPosts.map(p => ({
            ...p,
            comments: p.comments || [], // 🔥 remove old broken comments
            time: new Date().toISOString() + Math.random() // unique
        }));

        localStorage.setItem("posts", JSON.stringify(posts));
    }

    posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));

    const feedEl = document.getElementById("feed");
    if (!feedEl) return;   // 🔥 STOP if not social page

    feedEl.innerHTML = "";
    posts.forEach(post => renderPost(post));
}

// ── RENDER POST ─────────────────────────
function renderPost(postData, prepend = false) {
    const feed = document.getElementById("feed");
    const username = postData.username || "Anonymous";
    const avatar = getDisplayAvatar(postData);
    const postImage = postData.image
        ? `<div class="post-image-wrapper">
        <img src="${postData.image}" alt="Coffee post image">
    </div>`
        : "";

    const post = document.createElement("div");
    post.classList.add("post");

    const isLiked = postData.likedBy?.includes(currentUser);
    const canDelete = postData.owner === currentUser;

    post.innerHTML = `
    <div class="post-header">
        ${avatarMarkup(username, avatar)}
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

        
        ${canDelete
            ? `<button onclick="deletePost('${postData.time}')">
                <i class="bi bi-trash"></i>
           </button>`
        : ""
    }
    </div>

    <div class="post-caption">
        <strong>${postData.username || "Anonymous"}</strong> ${postData.text || ""}
    </div>

<div class="comment-list">
${(postData.comments || [])
    .filter(c => typeof c === "object")
    .map((c, index) => {

        const canDelete =
            c.owner === currentUser || postData.owner === currentUser;

        const canEdit =
            c.owner === currentUser;
    <div class="post-caption d-flex justify-content-between align-items-start">
    <span><strong>${username}</strong> ${postData.text || ""}</span>
    <button onclick="deletePost('${postData.time}')" 
        style="border:none;background:none;color:var(--muted);font-size:0.8rem;cursor:pointer;">
        <i class="bi bi-trash"></i>
    </button>
</div>

        return `
        <div class="comment">
            <div class="comment-top">
                <strong>${c.username}</strong>
                <span class="comment-time">${timeAgo(c.time)}</span>
            </div>

            <div class="comment-text">${c.text}</div>

            <div class="comment-actions">
                ${
                    canEdit
                    ? `<span onclick="editComment('${postData.time}', ${index}, this)">Edit</span>`
                    : ""
                }

                ${
                    canDelete
                    ? `<span onclick="deleteComment('${postData.time}', ${index})">
                        <i class="bi bi-trash"></i>
                       </span>`
                    : ""
                }
            </div>
        </div>
        `;
    }).join("")}
</div>

    <input
        type="text"
        class="comment-input"
        placeholder="Add a comment..."
        onkeypress="addComment(event, '${postData.time}', this)"
    >
    `;

    if (prepend) feed.prepend(post);
    else feed.appendChild(post);
}

// ── LIKE ─────────────────────────
function likePost(postTime, btn) {
    let posts = JSON.parse(localStorage.getItem("posts")) || [];

    posts = posts.map(p => {
        if (p.time === postTime) {

            if (!p.likedBy) p.likedBy = [];

            const alreadyLiked = p.likedBy.includes(currentUser);

            if (alreadyLiked) {
                // ❌ UNLIKE
                p.likes = Math.max((p.likes || 1) - 1, 0);
                p.likedBy = p.likedBy.filter(u => u !== currentUser);
            } else {
                // ✅ LIKE
                p.likes = (p.likes || 0) + 1;
                p.likedBy.push(currentUser);
            }
        }
        return p;
    });

    localStorage.setItem("posts", JSON.stringify(posts));
    if (document.getElementById("profile-feed")) {
        loadProfilePosts();   // profile page
    } else {
        loadPosts();          // social page
    }
}

// ── ADD COMMENT ─────────────────────────
function addComment(e, postTime, input) {
    if (e.key === "Enter" && input.value.trim() !== "") {

        const commentText = input.value.trim();
        let posts = JSON.parse(localStorage.getItem("posts")) || [];
        const user = {
            name: currentUser || "Anonymous",
            avatar: "https://i.pravatar.cc/40"
        };

        posts = posts.map(p => {
            if (p.time === postTime) {
                if (!p.comments) p.comments = [];

                p.comments.push({
                    username: user.name,
                    owner: currentUser,   // ✅ IMPORTANT
                    username: activeUser,
                    text: commentText,
                    time: new Date().toISOString()
                });
            }
            return p;
        });

        updateStorage(posts);
        if (document.getElementById("profile-feed")) {
            loadProfilePosts();
        } else {
            loadPosts();
        }
    }
}

// ── DELETE COMMENT ─────────────────────────
function deleteComment(postTime, index) {
    let posts = JSON.parse(localStorage.getItem("posts")) || [];

    posts = posts.map(p => {
        if (p.time === postTime) {
            p.comments.splice(index, 1);
        }
        return p;
    });

    updateStorage(posts);
    if (document.getElementById("profile-feed")) {
        loadProfilePosts();
    } else {
        loadPosts();
    }
}

// ── EDIT COMMENT ─────────────────────────
function editComment(postTime, index, el) {
    const commentDiv = el.closest(".comment");
    const textDiv = commentDiv.querySelector(".comment-text");

    const input = document.createElement("input");
    input.value = textDiv.innerText;
    input.classList.add("edit-input");

    textDiv.replaceWith(input);
    input.focus();

    input.onkeypress = function(e) {
        if (e.key === "Enter") {
            let posts = JSON.parse(localStorage.getItem("posts")) || [];

            posts = posts.map(p => {
                if (p.time === postTime) {
                    p.comments[index].text = input.value;
                }
                return p;
            });

            updateStorage(posts);
            if (document.getElementById("profile-feed")) {
                loadProfilePosts();   // profile page
            } else {
                loadPosts();          // social page
            }
        }
    };
}

// ── MODAL ─────────────────────────
function openModal() {
    document.getElementById("post-modal").classList.add("active");
}

function closeModal() {
    document.getElementById("post-modal").classList.remove("active");
    resetModal();
}

function resetModal() {
    // clear text
    document.getElementById("modal-text").value = "";

    // reset dropdowns
    document.getElementById("modal-shop").selectedIndex = 0;
    document.getElementById("aspect-ratio").selectedIndex = 0;

    // clear file input
    const fileInput = document.getElementById("modal-image");
    fileInput.value = "";

    // clear preview
    const preview = document.getElementById("image-preview");
    preview.src = "";
    
    const container = document.querySelector(".preview-container");
    container.style.display = "none";
}

// ── CREATE POST ─────────────────────────
function submitModalPost() {
    const text = document.getElementById("modal-text").value.trim();
    const shop = document.getElementById("modal-shop").value;
    const imageInput = document.getElementById("modal-image");
    if (!imageInput) return; // 🔥 not social page

    if (!text || imageInput.files.length === 0) {
        alert("Add caption + image");
        return;
    }

    const aspect = document.getElementById("aspect-ratio")?.value || "original";

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = new Image();
        img.src = e.target.result;

        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            let width = img.width;
            let height = img.height;

            // 🎯 Apply aspect ratio logic
            if (aspect === "square") {
                const size = Math.min(width, height);
                width = height = size;
            } 
            else if (aspect === "portrait") {
                height = width * (5 / 4);
            } 
            else if (aspect === "landscape") {
                height = width * (9 / 16);
            }
        const postData = {
            username: activeUser,
            avatar: getSavedAvatar(),
            text,
            shop,
            image: e.target.result,
            likes: 0,
            comments: [],
            time: new Date().toISOString()
        };

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            const finalImage = canvas.toDataURL();

            document.getElementById("image-preview").src = finalImage;

            const user = {
                name: currentUser,
                avatar: "https://i.pravatar.cc/40?u=" + currentUser
            };

            const postData = {
                username: user.name,
                owner: currentUser,
                avatar: user.avatar,
                text,
                shop,
                image: finalImage, // ✅ processed image
                likes: 0,
                comments: [],
                time: new Date().toISOString()
            };

            savePost(postData);
            loadPosts();
            resetModal();
            closeModal();

            // 🔥 Reset modal (clean UX)
            document.getElementById("modal-text").value = "";
            imageInput.value = "";
        };
    };

    reader.readAsDataURL(imageInput.files[0]);
}

function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById("image-preview");
    const container = document.querySelector(".preview-container");

    if (!file) return;

    const aspect = document.getElementById("aspect-ratio")?.value || "original";

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = new Image();
        img.src = e.target.result;

        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            let width = img.width;
            let height = img.height;

            if (aspect === "square") {
                const size = Math.min(width, height);
                width = height = size;
            } 
            else if (aspect === "portrait") {
                height = width * (5 / 4);
            } 
            else if (aspect === "landscape") {
                height = width * (9 / 16);
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            preview.src = canvas.toDataURL(); // ✅ THIS is the fix
            container.style.display = "block";
        };
    };

    reader.readAsDataURL(file);
}

function goToShop(id) {
    if (id == 1) window.location.href = routes.blacklist;
    if (id == 2) window.location.href = routes.laveen;
    if (id == 3) window.location.href = routes.venn;
}

// ── LOGOUT ─────────────────────────
function logout() {
    localStorage.clear();
    window.location.href = routes.landing;
}
// ── DELETE POST ─────────────────────────
function deletePost(postTime) {
    if (!confirm('Delete this post?')) return;
    
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    posts = posts.filter(p => p.time !== postTime);
    localStorage.setItem('posts', JSON.stringify(posts));
    if (document.getElementById("profile-feed")) {
        loadProfilePosts();
    } else {
        loadPosts();
    }
}
document.addEventListener("DOMContentLoaded", function () {
    const aspectDropdown = document.getElementById("aspect-ratio");

    if (aspectDropdown) {
        aspectDropdown.addEventListener("change", function () {
            const fileInput = document.getElementById("modal-image");

            if (fileInput.files.length > 0) {
                previewImage({ target: fileInput });
            }
        });
    }
});
    loadPosts();
}
