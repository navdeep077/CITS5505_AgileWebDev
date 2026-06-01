/*
 * home-sidebar.js
 * Loads suggested users and trending hashtags into home page sidebar
 */

document.addEventListener('DOMContentLoaded', () => {
    loadSuggestions();
    loadTrendingTags();
});

// ── Suggested Users ───────────────────────────────────────────────────────────
function loadSuggestions() {
    fetch('/api/suggested-users/sidebar')
        .then(res => res.json())
        .then(users => {
            const list = document.getElementById('suggestions-list');
            if (!list) return;

            if (users.length === 0) {
                list.innerHTML = `
                    <p style="color:var(--muted);font-size:0.82rem;text-align:center;padding:1rem 0;">
                        No suggestions right now
                    </p>`;
                return;
            }

            list.innerHTML = users.map(u => `
                <div class="suggestion-row" id="sug-${u.username}">
                    <a href="/user/${u.username}" class="suggestion-avatar">
                        ${u.avatar
                            ? `<img src="${u.avatar}" alt="${u.username}">`
                            : `<div class="sug-fallback">${u.username.charAt(0).toUpperCase()}</div>`
                        }
                    </a>
                    <div class="suggestion-info">
                        <a href="/user/${u.username}" class="suggestion-name">
                            ${u.username}
                        </a>
                        <div class="suggestion-level">${u.level}</div>
                    </div>
                    <button
                        onclick="followFromSidebar('${u.username}', this)"
                        class="suggestion-follow-btn">
                        Follow
                    </button>
                </div>
            `).join('');
        })
        .catch(err => console.error('Suggestions error:', err));
}

function followFromSidebar(username, btn) {
    fetch(`/api/follow/${username}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.following) {
                btn.textContent = 'Following';
                btn.style.background = 'rgba(196,122,43,0.1)';
                btn.style.color = 'var(--caramel)';
                showToast(`Following ${username} ✓`, 'success');

                // Remove from suggestions after 1.5s
                setTimeout(() => {
                    const row = document.getElementById(`sug-${username}`);
                    if (row) row.remove();
                }, 1500);
            }
        })
        .catch(err => console.error('Follow error:', err));
}

// ── Trending Hashtags ─────────────────────────────────────────────────────────
function loadTrendingTags() {
    fetch('/api/hashtags/trending')
        .then(res => res.json())
        .then(tags => {
            const list = document.getElementById('trending-tags-list');
            if (!list) return;

            if (tags.length === 0) {
                list.innerHTML = `
                    <p style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.5rem 0;">
                        No hashtags yet — add #tags to your posts
                    </p>`;
                return;
            }

            list.innerHTML = tags.map(t => `
                <a href="/hashtag/${t.tag}" class="trending-tag-row">
                    <span class="trending-tag-name">#${t.tag}</span>
                    <span class="trending-tag-count">${t.count} post${t.count > 1 ? 's' : ''}</span>
                </a>
            `).join('');
        })
        .catch(err => console.error('Trending tags error:', err));
}