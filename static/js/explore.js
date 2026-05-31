// explore.js
// Handles explore page: post grid, suggested people, trending cafes

function showTab(tab, btn) {
    document.getElementById('tab-posts').style.display = 'none';
    document.getElementById('tab-people').style.display = 'none';
    document.getElementById('tab-trending').style.display = 'none';

    document.querySelectorAll('.explore-tab').forEach(b => b.classList.remove('active'));

    document.getElementById(`tab-${tab}`).style.display = 'block';
    btn.classList.add('active');

    if (tab === 'people') loadPeople();
    if (tab === 'trending') loadTrending();
}

// Load all posts as Instagram-style grid
function loadExploreGrid() {
    fetch('/api/posts')
        .then(res => res.json())
        .then(posts => {
            const grid = document.getElementById('explore-grid');

            if (posts.length === 0) {
                grid.innerHTML = '<div class="explore-empty" style="grid-column:1/-1"><i class="bi bi-image" style="font-size:2.5rem;color:var(--border);display:block;margin-bottom:1rem;"></i><p>No posts yet</p></div>';
                return;
            }

            grid.innerHTML = posts.map(post => {
                const imgHtml = post.image
                    ? `<img src="${post.image}" alt="post">`
                    : `<div class="explore-no-image">${post.text.substring(0, 50)}</div>`;

                return `
                    <div class="explore-item" onclick="openExplorePost(${post.id})">
                        ${imgHtml}
                        <div class="explore-item-overlay">
                            <span><i class="bi bi-heart-fill"></i> ${post.likes}</span>
                            <span><i class="bi bi-chat-fill"></i> ${post.comments.length}</span>
                        </div>
                    </div>
                `;
            }).join('');
        })
        .catch(err => console.error('Explore grid error:', err));
}

// Open post in modal
function openExplorePost(postId) {
    fetch('/api/posts')
        .then(res => res.json())
        .then(posts => {
            const post = posts.find(p => p.id === postId);
            if (!post) return;
            const modal = document.getElementById('post-modal');
            const container = document.getElementById('modal-post-container');
            container.innerHTML = '';
            renderPost(post, 'modal-post-container');
            modal.classList.remove('hidden');
        });
}

// Load suggested people
function loadPeople() {
    const list = document.getElementById('people-list');

    fetch('/api/suggested-users')
        .then(res => res.json())
        .then(users => {
            if (users.length === 0) {
                list.innerHTML = '<div class="explore-empty"><i class="bi bi-people" style="font-size:2.5rem;color:var(--border);display:block;margin-bottom:1rem;"></i><p>No suggestions right now</p></div>';
                return;
            }

            list.innerHTML = users.map(u => {
                const initial = u.username.charAt(0).toUpperCase();
                const avatarHtml = u.avatar
                    ? `<img src="${u.avatar}">`
                    : initial;

                return `
                    <div class="suggested-user-card">
                        <div class="suggested-avatar">${avatarHtml}</div>
                        <div>
                            <a href="/user/${u.username}" class="suggested-name">${u.username}</a>
                            <div class="suggested-meta">${u.followers} followers</div>
                            ${u.bio ? `<div class="suggested-bio">${u.bio}</div>` : ''}
                        </div>
                        <button class="follow-btn" onclick="followUser('${u.username}', this)">Follow</button>
                    </div>
                `;
            }).join('');
        })
        .catch(err => console.error('People load error:', err));
}

// Follow/unfollow from explore
function followUser(username, btn) {
    fetch(`/api/follow/${username}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.following) {
                btn.textContent = 'Following';
                btn.classList.add('following');
                showToast(`Following ${username} ✓`, 'success');
            } else {
                btn.textContent = 'Follow';
                btn.classList.remove('following');
                showToast(`Unfollowed ${username}`, 'info');
            }
        })
        .catch(err => console.error('Follow error:', err));
}

// Load trending cafes
function loadTrending() {
    const list = document.getElementById('trending-list');
    const cafes = window.trendingCafes || [];

    // First show trending posts this week
    fetch('/api/posts/trending')
        .then(res => res.json())
        .then(posts => {
            let html = '';

            // Trending posts section
            if (posts.length > 0) {
                html += `
                    <div class="trending-section">
                        <h5><i class="bi bi-fire" style="color:var(--caramel)"></i> Most Liked This Week</h5>
                        ${posts.map(p => `
                            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(196,122,43,0.1);">
                                ${p.image
                                    ? `<img src="${p.image}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;">`
                                    : `<div style="width:44px;height:44px;background:linear-gradient(135deg,var(--roast),var(--caramel));border-radius:8px;"></div>`
                                }
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${p.username}</div>
                                    <div style="font-size:0.8rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.text}</div>
                                </div>
                                <div style="font-size:0.8rem;color:var(--caramel);font-weight:700;">
                                    <i class="bi bi-heart-fill"></i> ${p.likes}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // Trending cafes section
            html += `<h5 style="font-weight:700;margin-bottom:1rem;color:var(--text);">
                <i class="bi bi-cup-hot" style="color:var(--caramel)"></i> Top Cafes
            </h5>`;

            cafes.forEach(cafe => {
                html += `
                    <div class="trending-card">
                        <div>
                            <h5 style="font-weight:700;margin-bottom:4px;color:var(--text);">${cafe.name}</h5>
                            <div style="font-size:0.85rem;color:var(--muted);margin-bottom:6px;">
                                <i class="bi bi-geo-alt" style="color:var(--caramel)"></i> ${cafe.location}
                                &nbsp;•&nbsp;
                                <i class="bi bi-star-fill" style="color:var(--caramel)"></i> ${cafe.rating}
                            </div>
                            <div class="trending-tags">
                                ${cafe.tags.map(t => `<span>${t}</span>`).join('')}
                            </div>
                        </div>
                        <a href="/cafe/${encodeURIComponent(cafe.name)}"
                           class="btn-primary-custom"
                           style="font-size:0.8rem;padding:8px 14px;white-space:nowrap;">
                            View Posts
                        </a>
                    </div>
                `;
            });

            list.innerHTML = html;
        })
        .catch(() => {
            // Fallback to just cafes if trending API fails
            list.innerHTML = cafes.map(cafe => `
                <div class="trending-card">
                    <div>
                        <h5>${cafe.name}</h5>
                        <div style="font-size:0.85rem;color:var(--muted);">★ ${cafe.rating}</div>
                    </div>
                    <a href="/cafe/${encodeURIComponent(cafe.name)}" class="btn-primary-custom" style="font-size:0.8rem;padding:8px 14px;">
                        View Posts
                    </a>
                </div>
            `).join('');
        });
}

// Wire modal close
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('close-modal')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
    document.querySelector('.modal-overlay')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
    loadExploreGrid();
});