const defaultPosts = [
    {
        username: "CoffeeLover",
        avatar: "https://i.pravatar.cc/40?img=1",
        text: "Best latte I’ve had in Perth ☕",
        shop: "La Veen Coffee",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
        likes: 5,
        comments: [],
        time: "seed1"
    },
    {
        username: "BrewMaster",
        avatar: "https://i.pravatar.cc/40?img=2",
        text: "Morning espresso hit 🔥",
        shop: "Single Origin Roasters",
        image: "https://images.unsplash.com/photo-1511920170033-f8396924c348",
        likes: 8,
        comments: [],
        time: "seed2"
    },
    {
        username: "BeanHunter",
        avatar: "https://i.pravatar.cc/40?img=3",
        text: "Chill vibes and cold brew ❄️",
        shop: "Venn Coffee",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
        likes: 3,
        comments: [],
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

// ── INIT ─────────────────────────
window.onload = function () {
    loadPosts();
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
            comments: [], // 🔥 remove old broken comments
            time: new Date().toISOString() + Math.random() // unique
        }));

        localStorage.setItem("posts", JSON.stringify(posts));
    }

    posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));

    document.getElementById("feed").innerHTML = "";
    posts.forEach(post => renderPost(post));
}

// ── RENDER POST ─────────────────────────
function renderPost(postData, prepend = false) {
    const feed = document.getElementById("feed");

    const post = document.createElement("div");
    post.classList.add("post");

    post.innerHTML = `
    <div class="post-header">
        <img class="avatar" src="${postData.avatar || ''}">
        <div class="user-info">
            <strong>${postData.username || "Anonymous"}</strong>
            <span class="location">${postData.shop || ""}</span>
        </div>
    </div>

    <div class="post-image-wrapper">
        <img src="${postData.image || ''}">
    </div>

    <div class="post-actions">
        <button onclick="likePost('${postData.time}', this)">
            ❤️ ${postData.likes || 0}
        </button>
    </div>

    <div class="post-caption">
        <strong>${postData.username || "Anonymous"}</strong> ${postData.text || ""}
    </div>

    <div class="comment-list">
    ${(postData.comments || [])
        .filter(c => typeof c === "object")
        .map((c, index) => `
            <div class="comment">
                <div class="comment-top">
                    <strong>${c.username}</strong>
                    <span class="comment-time">${timeAgo(c.time)}</span>
                </div>

                <div class="comment-text">${c.text}</div>

                <div class="comment-actions">
                    <span onclick="editComment('${postData.time}', ${index}, this)">Edit</span>
                    <span onclick="deleteComment('${postData.time}', ${index}, this)">Delete</span>
                </div>
            </div>
        `).join("")}
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
            p.likes = (p.likes || 0) + 1;
            btn.innerText = `❤️ ${p.likes}`;
        }
        return p;
    });

    updateStorage(posts);
}

// ── ADD COMMENT ─────────────────────────
function addComment(e, postTime, input) {
    if (e.key === "Enter" && input.value.trim() !== "") {

        const commentText = input.value.trim();
        let posts = JSON.parse(localStorage.getItem("posts")) || [];
        const user = getRandomUser();

        posts = posts.map(p => {
            if (p.time === postTime) {
                if (!p.comments) p.comments = [];

                p.comments.push({
                    username: user.name,
                    text: commentText,
                    time: new Date().toISOString()
                });
            }
            return p;
        });

        updateStorage(posts);
        loadPosts(); // 🔥 re-render cleanly
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
    loadPosts();
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
            loadPosts();
        }
    };
}

// ── MODAL ─────────────────────────
function openModal() {
    document.getElementById("post-modal").classList.add("active");
}

function closeModal() {
    document.getElementById("post-modal").classList.remove("active");
}

// ── CREATE POST ─────────────────────────
function submitModalPost() {
    const text = document.getElementById("modal-text").value.trim();
    const shop = document.getElementById("modal-shop").value;
    const imageInput = document.getElementById("modal-image");

    if (!text || imageInput.files.length === 0) {
        alert("Add caption + image");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const user = getRandomUser();

        const postData = {
            username: user.name,
            avatar: user.avatar,
            text,
            shop,
            image: e.target.result,
            likes: 0,
            comments: [],
            time: new Date().toISOString()
        };

        savePost(postData);
        loadPosts();
        closeModal();
    };

    reader.readAsDataURL(imageInput.files[0]);
}

function goToShop(id) {
    window.location.href = `shop.html?id=${id}`;
}

// ── LOGOUT ─────────────────────────
function logout() {
    localStorage.clear();
    window.location.href = "landing.html";
}