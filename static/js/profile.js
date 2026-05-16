/*
 * profile.js
 * Handles all functionality on the logged-in user's profile page including:
 * - Avatar upload, display and removal
 * - Post creation with image preview
 * - Loading and rendering the user's own posts
 * - Loading and displaying the user's cafe reviews
 */

// ── Cafe Slug Helper ──────────────────────────────────────────────────────────
// Maps a full cafe name to its URL-friendly slug used in shop page routes
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

// ── Avatar State ──────────────────────────────────────────────────────────────
// Tracks the current avatar URL in memory to avoid repeated API calls
let currentAvatar = "";

// Returns the currently stored avatar URL
function getSavedAvatar() {
    return currentAvatar;
}

// Fetches the current user's avatar URL from the backend API
async function fetchAvatar() {
    const response = await fetch('/api/avatar');
    if (!response.ok) return '';
    const data = await response.json();
    return data.avatar || '';
}

// ── Avatar Rendering ──────────────────────────────────────────────────────────
// Updates the profile page avatar UI based on whether a photo is set.
// Shows the image and remove button when an avatar exists;
// shows the initials placeholder when no avatar is set.
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

    // Sync the navbar avatar with the profile page avatar
    if (typeof window.updateNavbarAvatar === 'function') {
        window.updateNavbarAvatar(avatar);
    }
}

// ── Avatar Upload ─────────────────────────────────────────────────────────────
// Handles the file input change event when the user selects a new profile photo.
// Uploads the image to /api/avatar via POST and refreshes the avatar display.
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

    // Update the in-memory avatar and refresh the UI
    currentAvatar = data.avatar || '';
    renderProfileAvatar();
    loadProfilePosts();   // Reload posts so new avatar appears on post cards
    event.target.value = ''; // Reset the file input
}

// ── Avatar Removal ────────────────────────────────────────────────────────────
// Sends a DELETE request to /api/avatar to remove the current profile photo.
// Resets the avatar display to the initials placeholder.
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

// ── Image Preview ─────────────────────────────────────────────────────────────
// Displays a live preview of the selected image before the post is submitted.
// Applies the chosen aspect ratio to the preview element.
function previewProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = document.getElementById("profile-image-preview");
        const ratio = document.getElementById("aspect-ratio").value;
        img.src = e.target.result;
        img.style.display = "block";
        // Apply the selected aspect ratio to the preview
        if (ratio === "square")         img.style.aspectRatio = "1 / 1";
        else if (ratio === "portrait")  img.style.aspectRatio = "4 / 5";
        else if (ratio === "landscape") img.style.aspectRatio = "16 / 9";
        else                            img.style.aspectRatio = "auto";
    };
    reader.readAsDataURL(file);
}

// ── Post Submission ───────────────────────────────────────────────────────────
// Reads the post form fields, validates that text is present, and sends a
// multipart POST request to /api/posts. Resets the form and reloads posts on success.
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

    // Reset all form fields and hide the image preview
    document.getElementById('profile-post-text').value = '';
    document.getElementById('profile-post-shop').value = '';
    imageInput.value = '';
    document.getElementById('profile-image-preview').style.display = "none";
    await loadProfilePosts();
}

// ── Load Profile Posts ────────────────────────────────────────────────────────
// Fetches all posts from the API and filters to only the current user's posts.
// Renders each post into the profile feed container using renderPost() from social.js.
function loadProfilePosts() {
    fetch("/api/posts")
        .then(res => res.json())
        .then(posts => {
            const feed = document.getElementById("profile-feed");
            if (!feed) return;
            feed.innerHTML = "";

            // Filter to only posts authored by the current logged-in user
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

// ── Event Listeners ───────────────────────────────────────────────────────────
// Wire the file input and remove button to their respective handler functions
document.getElementById('profile-avatar-upload').addEventListener('change', handleAvatarUpload);
document.getElementById('profile-avatar-remove').addEventListener('click', removeProfileAvatar);

// ── Page Initialisation ───────────────────────────────────────────────────────
// On page load: fetch the avatar, render it, load posts and load reviews
window.onload = async function () {
    currentAvatar = await fetchAvatar();
    renderProfileAvatar();
    loadProfilePosts();
    loadMyReviews();
};

// Reload reviews when the user returns to this tab (e.g. after deleting on shop page)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadMyReviews();
});

// Reload reviews when navigating back via browser history (bfcache restore)
window.addEventListener('pageshow', (e) => {
    if (e.persisted) loadMyReviews();
});

// ── Load My Reviews ───────────────────────────────────────────────────────────
// Fetches all reviews submitted by the current user from the database API.
// Clears any legacy localStorage reviews on each load.
// Renders each review as a card with a link to the cafe page for deletion.
function loadMyReviews() {
    // Remove old localStorage reviews from before the database migration
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

            // Render each review as a Bootstrap card with star rating and cafe link
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
                    <!-- Link to the cafe shop page where the user can delete their review -->
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