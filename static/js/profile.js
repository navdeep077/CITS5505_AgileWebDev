// ── PROFILE PAGE ─────────────────────────
let currentAvatar = "";

function getSavedAvatar() {
    return currentAvatar;
}

async function fetchAvatar() {
    const response = await fetch('/api/avatar');
    if (!response.ok) return '';
    const data = await response.json();
    return data.avatar || '';
}

function renderProfileAvatar() {
    const avatar = currentAvatar;
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

    if (typeof window.updateNavbarAvatar === 'function') {
        window.updateNavbarAvatar(avatar);
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('/api/avatar', {
        method: 'POST',
        body: formData
    });
    const data = await response.json();

    if (!response.ok) {
        alert(data.error || 'Could not upload profile picture.');
        return;
    }

    currentAvatar = data.avatar || '';
    syncUserPostAvatars(currentAvatar);
    renderProfileAvatar();
    loadProfilePosts();
    event.target.value = '';
}

async function removeProfileAvatar() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    if (!currentAvatar) return;

    const response = await fetch('/api/avatar', { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
        alert(data.error || 'Could not remove profile picture.');
        return;
    }

    currentAvatar = data.avatar || '';
    syncUserPostAvatars('');
    renderProfileAvatar();
    loadProfilePosts();
}

function syncUserPostAvatars(avatar) {
    return avatar;
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

async function submitProfilePost() {
    const text = document.getElementById('profile-post-text').value.trim();
    const shop = document.getElementById('profile-post-shop').value;
    const imageInput = document.getElementById('profile-post-image');

    if (!text) { alert('Please write something!'); return; }

    try {
        await createServerPost({
            text,
            shop,
            imageFile: imageInput.files.length > 0 ? imageInput.files[0] : null
        });

        document.getElementById('profile-post-text').value = '';
        document.getElementById('profile-post-shop').value = '';
        imageInput.value = '';
        document.getElementById('profile-image-preview').style.display = "none";
        await loadProfilePosts();
    } catch (error) {
        alert(error.message);
    }
}

async function loadProfilePosts() {
    const posts = await fetchServerPosts();
    const myPosts = posts.filter(p => p.owner === window.currentUser || p.username === window.currentUser);
    const feed = document.getElementById("profile-feed");
    if (!feed) return;
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
        `;
        feed.appendChild(div);
    });
}

async function deleteProfilePost(postTime) {
    await deletePost(postTime);
}

document.getElementById('profile-avatar-upload').addEventListener('change', handleAvatarUpload);
document.getElementById('profile-avatar-remove').addEventListener('click', removeProfileAvatar);

window.onload = async function () {
    currentAvatar = await fetchAvatar();
    renderProfileAvatar();
    loadProfilePosts();
    loadMyReviews();
};

// ── RELOAD ON TAB VISIBLE ─────────────────────────
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        loadMyReviews();
    }
});

// ── RELOAD ON BROWSER BACK/FORWARD (fixes bfcache) ─────────────────────────
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        loadMyReviews();
    }
});

function loadMyReviews() {
    const container = document.getElementById('my-reviews-list');
    if (!container) return;

    const reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];
    const myReviews = reviews.filter(r => r.username === window.currentUser);

    if (myReviews.length === 0) {
        container.innerHTML = "<p class='text-muted small'>No reviews yet. Visit a cafe and share your experience!</p>";
        return;
    }

container.innerHTML = myReviews.map(r => `
    <div class="card p-3 mb-3" data-review-id="${r.id}">
        <div class="d-flex justify-content-between mb-1">
            <strong>${r.shop}</strong>
            <span style="color:var(--caramel);">
                ${'<i class="bi bi-star-fill"></i>'.repeat(r.rating)}
                ${'<i class="bi bi-star"></i>'.repeat(5 - r.rating)}
            </span>
        </div>
        <p class="small text-muted mb-0">${r.text}</p>
        <p class="small mt-1" style="color:var(--caramel);">Visit the cafe page to delete this review.</p>
    </div>
`).join('');

}

function deleteMyReview(id) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    let reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];
    reviews = reviews.filter(r => r.id !== id);
    localStorage.setItem('shopReviews', JSON.stringify(reviews));

    loadMyReviews();
}
