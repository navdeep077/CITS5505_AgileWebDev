function cafeSlug(name) {
    const map = {
        'Blacklist Coffee Roasters': 'blacklist',
        'La Veen Coffee': 'laveen',
        'Venn Coffee': 'venn',
        'Harvest Espresso': 'harvest',
        'Telegram Cafe': 'telegram',
        'Satchmo': 'satchmo',
        'Mary Street Bakery': 'marystreet'
    };
    return map[name] || '';
}
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

    currentAvatar = '';
    renderProfileAvatar();
    loadProfilePosts();
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

    const formData = new FormData();
    formData.append('text', text);
    formData.append('shop', shop || '');
    if (imageInput.files.length > 0) formData.append('image', imageInput.files[0]);

    const response = await fetch('/api/posts', { method: 'POST', body: formData });
    if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Could not create post');
        return;
    }

    document.getElementById('profile-post-text').value = '';
    document.getElementById('profile-post-shop').value = '';
    imageInput.value = '';
    document.getElementById('profile-image-preview').style.display = "none";
    await loadProfilePosts();
}

function loadProfilePosts() {
    fetch("/api/posts")
        .then(res => res.json())
        .then(posts => {
            const feed = document.getElementById("profile-feed");
            if (!feed) return;
            feed.innerHTML = "";

            const myPosts = posts.filter(
                p => p.username === window.currentUser || p.owner === window.currentUser
            );

            if (myPosts.length === 0) {
                feed.innerHTML = "<p class='text-muted'>No posts yet. Share your first coffee moment!</p>";
                return;
            }

            myPosts.forEach(post => renderPost(post, "profile-feed"));
        })
        .catch(err => console.error("Profile load error:", err));
}

document.getElementById('profile-avatar-upload').addEventListener('change', handleAvatarUpload);
document.getElementById('profile-avatar-remove').addEventListener('click', removeProfileAvatar);

window.onload = async function () {
    currentAvatar = await fetchAvatar();
    renderProfileAvatar();
    loadProfilePosts();
    loadMyReviews();
};

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadMyReviews();
});

window.addEventListener('pageshow', (e) => {
    if (e.persisted) loadMyReviews();
});

function cafeSlug(name) {
    const map = {
        'Blacklist Coffee Roasters': 'blacklist',
        'La Veen Coffee': 'laveen',
        'Venn Coffee': 'venn',
        'Harvest Espresso': 'harvest',
        'Telegram Cafe': 'telegram',
        'Satchmo': 'satchmo',
        'Mary Street Bakery': 'marystreet'
    };
    return map[name] || '';
}

function loadMyReviews() {
    localStorage.removeItem('shopReviews');
    const container = document.getElementById('my-reviews-list');
    if (!container) return;

    fetch(`/api/reviews/${window.currentUser}`)
        .then(res => res.json())
        .then(reviews => {
            if (reviews.length === 0) {
                container.innerHTML = "<p class='text-muted small'>No reviews yet. Visit a cafe and share your experience!</p>";
                return;
            }

            container.innerHTML = reviews.map(r => `
    <div class="card p-3 mb-3">
        <div class="d-flex justify-content-between mb-1">
            <strong>${r.shop}</strong>
            <span style="color:var(--caramel);">
                ${'<i class="bi bi-star-fill"></i>'.repeat(r.rating)}
                ${'<i class="bi bi-star"></i>'.repeat(5 - r.rating)}
            </span>
        </div>
        <p class="small text-muted mb-0">${r.text}</p>
        <a href="/shop/${cafeSlug(r.shop)}" 
           class="small mt-1" 
           style="color:var(--caramel);display:block;">
            Visit ${r.shop} to delete this review →
        </a>
    </div>
`).join('');
        })
        .catch(err => console.error('Error loading reviews:', err));
}