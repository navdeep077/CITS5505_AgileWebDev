/*
 * profile.js
 * Handles avatar upload, post grid loading and reviews
 * for the logged-in user's own profile page (/profile)
 * Works with the new profile.html layout
 */

// ── Cafe Slug Helper ──────────────────────────────────────────────────────────
function cafeSlug(name) {
    const map = {
        'Blacklist Coffee Roasters': 'blacklist',
        'La Veen Coffee':            'laveen',
        'Venn Coffee':               'venn',
        'Harvest Espresso':          'harvest',
        'Telegram Cafe':             'telegram',
        'Satchmo':                   'satchmo',
        'Mary Street Bakery':        'marystreet'
    };
    return map[name] || '';
}

// ── Avatar Upload ─────────────────────────────────────────────────────────────
// Listens for file selection on the hidden avatar file input
// Uploads to /api/avatar and updates the avatar on screen
document.addEventListener('DOMContentLoaded', () => {

    const avatarInput = document.getElementById('avatar-file-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const response = await fetch('/api/avatar', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (!response.ok) {
                    showToast(data.error || 'Could not upload photo', 'error');
                    return;
                }

                // Update avatar image on the profile page
                const existingImg = document.getElementById('profile-avatar-img');
                const fallback    = document.getElementById('profile-avatar-fallback');

                if (existingImg) {
                    // Already showing an image — just update src
                    existingImg.src = data.avatar;
                } else if (fallback) {
                    // Replace the initials fallback with a real image
                    fallback.outerHTML = `<img
                        src="${data.avatar}"
                        alt="avatar"
                        class="profile-avatar"
                        id="profile-avatar-img"
                    >`;
                }

                // Also update the navbar avatar
                const navAvatar = document.querySelector('[data-navbar-avatar]');
                if (navAvatar) {
                    navAvatar.innerHTML = `<img src="${data.avatar}"
                        style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }

                showToast('Profile photo updated ✓', 'success');

            } catch (err) {
                console.error('Avatar upload error:', err);
                showToast('Upload failed', 'error');
            }

            // Reset input so same file can be re-selected if needed
            e.target.value = '';
        });
    }

    // ── Remove Avatar ─────────────────────────────────────────────────────────
    // removeAvatar() is called from onclick in profile.html
    window.removeAvatar = async function() {
        if (!confirm('Remove your profile photo?')) return;

        try {
            const response = await fetch('/api/avatar', { method: 'DELETE' });
            const data     = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Could not remove photo', 'error');
                return;
            }

            // Replace image with initials fallback
            const img = document.getElementById('profile-avatar-img');
            if (img) {
                img.outerHTML = `<div class="fallback-avatar" id="profile-avatar-fallback">
                    ${window.currentUser.charAt(0).toUpperCase()}
                </div>`;
            }

            // Reset navbar avatar to icon
            const navAvatar = document.querySelector('[data-navbar-avatar]');
            if (navAvatar) {
                navAvatar.innerHTML = '<i class="bi bi-person-circle"></i>';
            }

            showToast('Profile photo removed', 'info');

        } catch (err) {
            console.error('Avatar remove error:', err);
        }
    };

    // ── Load Profile Posts into Grid ──────────────────────────────────────────
    // Fetches all posts, filters to current user, renders into posts-grid
    loadProfilePosts();

    // ── Load Reviews ──────────────────────────────────────────────────────────
    loadMyReviews();

    // ── Wire Post Modal Close ─────────────────────────────────────────────────
    document.getElementById('close-modal')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
    document.querySelector('#post-modal .modal-overlay')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
    // Load XP and badges
fetch('/api/profile/xp')
    .then(res => res.json())
    .then(data => {
        const section = document.getElementById('xp-section');
        if (!section) return;
        section.style.display = 'block';
        document.getElementById('xp-level-title').textContent =
            `Level ${data.level} — ${data.title}`;
        document.getElementById('xp-amount').textContent = data.xp;

        const badgeContainer = document.getElementById('profile-badges');
        if (data.badges.length > 0) {
            badgeContainer.innerHTML = data.badges.map(b =>
                `<span class="badge-pill">${b}</span>`
            ).join('');
        }
    })
    .catch(err => console.error('XP load error:', err));

});

// ── Load Profile Posts ────────────────────────────────────────────────────────
// Fetches posts from API, filters to current user, renders as grid
function loadProfilePosts() {
    fetch('/api/posts')
        .then(res => res.json())
        .then(posts => {
            const grid = document.getElementById('profile-posts');
            if (!grid) return;

            // Filter to only this user's posts
            const myPosts = posts.filter(
                p => p.username === window.currentUser || p.owner === window.currentUser
            );

            // Update post count in stats
            const countEl = document.getElementById('posts-count');
            if (countEl) countEl.textContent = myPosts.length;

            if (myPosts.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);">
                        <i class="bi bi-camera" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                        No posts yet — create one with the + button
                    </div>`;
                return;
            }

            // Render each post using the profile grid mode from social.js
            grid.innerHTML = '';
            myPosts.forEach(post => renderPost(post, 'profile-posts', 'profile'));
        })
        .catch(err => console.error('Profile posts error:', err));
}

// ── Load My Reviews ───────────────────────────────────────────────────────────
// Fetches reviews by current user and renders into profile-reviews container
function loadMyReviews() {
    localStorage.removeItem('shopReviews');

    const container = document.getElementById('profile-reviews');
    if (!container) return;

    fetch(`/api/reviews/${window.currentUser}`)
        .then(res => res.json())
        .then(reviews => {
            if (reviews.length === 0) {
                container.innerHTML = `
                    <p style="color:var(--muted);font-size:0.85rem;">
                        No reviews yet
                    </p>`;
                return;
            }

            container.innerHTML = reviews.map(r => `
                <div style="
                    background:var(--surface, #fff);
                    border:1px solid rgba(196,122,43,0.15);
                    border-radius:10px;
                    padding:12px 14px;
                    margin-bottom:10px;
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <strong style="font-size:0.9rem;">${r.shop}</strong>
                        <span style="color:var(--caramel);font-size:0.8rem;">
                            ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                        </span>
                    </div>
                    <p style="font-size:0.82rem;color:var(--muted);margin:0 0 6px;">${r.text}</p>
                    <a href="/shop/${cafeSlug(r.shop)}"
                       style="font-size:0.78rem;color:var(--caramel);text-decoration:none;">
                        Visit ${r.shop} to delete →
                    </a>
                </div>
            `).join('');
        })
        .catch(err => console.error('Reviews error:', err));
}

// ── Reload on tab focus / bfcache restore ─────────────────────────────────────
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadMyReviews();
});
window.addEventListener('pageshow', e => {
    if (e.persisted) loadMyReviews();
});