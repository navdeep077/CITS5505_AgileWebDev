// ── PROFILE PAGE ─────────────────────────
const avatarStorageKey = `profileAvatar:${window.currentUser}`;

function getSavedAvatar() {
    return localStorage.getItem(avatarStorageKey) || '';
}

function renderProfileAvatar() {
    const avatar = getSavedAvatar();
    const image = document.getElementById('profile-avatar-image');
    const placeholder = document.getElementById('profile-avatar-placeholder');
    const removeButton = document.getElementById('profile-avatar-remove');

    if (avatar) {
        image.src = avatar;
        image.style.display = 'block';
        placeholder.style.display = 'none';
        removeButton.style.display = 'inline-block';
    } else {
        image.removeAttribute('src');
        image.style.display = 'none';
        placeholder.style.display = 'flex';
        removeButton.style.display = 'none';
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        localStorage.setItem(avatarStorageKey, e.target.result);
        syncUserPostAvatars(e.target.result);
        renderProfileAvatar();
        loadProfilePosts();
        event.target.value = '';
    };
    reader.readAsDataURL(file);
}

function removeProfileAvatar() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    if (!getSavedAvatar()) return;
    localStorage.removeItem(avatarStorageKey);
    syncUserPostAvatars('');
    renderProfileAvatar();
    loadProfilePosts();
}

function syncUserPostAvatars(avatar) {
    const posts = JSON.parse(localStorage.getItem('posts')) || [];
    const updated = posts.map(post => {
        if (post.username === window.currentUser) return { ...post, avatar };
        return post;
    });
    localStorage.setItem('posts', JSON.stringify(updated));
}

function previewProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = document.getElementById("profile-image-preview");
        const ratio = document.getElementById("aspect-ratio").value;
        img.src = e.target.result;
        img.style.display = "block";
        if (ratio === "square")         img.style.aspectRatio = "1 / 1";
        else if (ratio === "portrait")  img.style.aspectRatio = "4 / 5";
        else if (ratio === "landscape") img.style.aspectRatio = "16 / 9";
        else                            img.style.aspectRatio = "auto";
    };
    reader.readAsDataURL(file);
}

function submitProfilePost() {
    const text = document.getElementById('profile-post-text').value.trim();
    const shop = document.getElementById('profile-post-shop').value;
    const imageInput = document.getElementById('profile-post-image');

    if (!text) { alert('Please write something!'); return; }

    function createPost(imageData) {
        const postData = {
            username: window.currentUser,
            owner: window.currentUser,
            avatar: getSavedAvatar(),
            text,
            shop,
            image: imageData || '',
            likes: 0,
            likedBy: [],
            comments: [],
            time: new Date().toISOString()
        };
        savePost(postData);
        loadProfilePosts();
        document.getElementById('profile-post-text').value = '';
        document.getElementById('profile-post-shop').value = '';
        document.getElementById('profile-post-image').value = '';
        document.getElementById('profile-image-preview').style.display = "none";
    }

    if (imageInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = e => createPost(e.target.result);
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        createPost('');
    }
}

function loadProfilePosts() {
    let posts = JSON.parse(localStorage.getItem("posts")) || [];
    const myPosts = posts.filter(p => p.owner === window.currentUser || p.username === window.currentUser);
    const feed = document.getElementById("profile-feed");
    feed.innerHTML = "";

    if (myPosts.length === 0) {
        feed.innerHTML = "<p class='text-muted'>No posts yet. Share your first coffee moment!</p>";
        return;
    }

    myPosts.forEach(p => {
        const div = document.createElement('div');
        div.className = 'card mb-3 p-3';
        div.innerHTML = `
            <div class="d-flex align-items-center gap-2 mb-2">
                ${getSavedAvatar()
                    ? `<img src="${getSavedAvatar()}" class="avatar">`
                    : `<div class="avatar avatar-placeholder">${window.currentUser[0].toUpperCase()}</div>`}
                <div>
                    <strong>${p.username || window.currentUser}</strong>
                    <p class="small text-muted mb-0">${p.shop || ''}</p>
                </div>
            </div>
            ${p.image ? `<img src="${p.image}" class="img-fluid rounded mb-2" style="max-height:300px;object-fit:cover;">` : ''}
            <p class="mb-2">${p.text}</p>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteProfilePost('${p.time}')">
                <i class="bi bi-trash"></i> Delete Post
            </button>
            <div class="mt-2">
                ${(p.comments || []).map((c, ci) => `
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <p class="small mb-0"><strong>${c.username}</strong> ${c.text}</p>
                        <button class="btn btn-sm p-0 ms-2" style="color:var(--caramel);font-size:0.75rem;"
                            onclick="deleteProfileComment('${p.time}', ${ci})">Delete</button>
                    </div>
                `).join('')}
                <input type="text" class="form-control form-control-sm mt-2"
                    placeholder="Add a comment..."
                    onkeypress="addProfileComment(event, '${p.time}', this)">
            </div>
        `;
        feed.appendChild(div);
    });
}

function addProfileComment(e, postTime, input) {
    if (e.key === 'Enter' && input.value.trim()) {
        let posts = JSON.parse(localStorage.getItem('posts')) || [];
        posts = posts.map(p => {
            if (p.time === postTime) {
                if (!p.comments) p.comments = [];
                p.comments.push({
                    username: window.currentUser,
                    owner: window.currentUser,
                    text: input.value.trim(),
                    time: new Date().toISOString()
                });
            }
            return p;
        });
        localStorage.setItem('posts', JSON.stringify(posts));
        loadProfilePosts();
    }
}

// ── INIT ─────────────────────────
document.getElementById('profile-avatar-upload').addEventListener('change', handleAvatarUpload);
document.getElementById('profile-avatar-remove').addEventListener('click', removeProfileAvatar);

window.onload = function () {
    renderProfileAvatar();
    loadProfilePosts();
};