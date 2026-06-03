/*
 * explore.js
 * Handles Explore page — Posts grid, People, Trending
 * Fixed: modal popup centered, tab stays active, people layout
 */

let explorePage     = 1;
const explorePerPage = 12;
let exploreAllPosts  = [];
let exploreLoading   = false;
let activeTab        = 'posts';

document.addEventListener('DOMContentLoaded', () => {
    showTab('posts');
    setupExploreScroll();
    wireModalClose();
});

// ── Wire modal close ──────────────────────────────────────────
function wireModalClose() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
        closeExploreModal();
    });
    document.querySelector('#post-modal .modal-overlay')?.addEventListener('click', () => {
        closeExploreModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeExploreModal();
    });
}

function openExplorePost(post) {
    // Always open as modal popup — never open lightbox directly
    const modal     = document.getElementById('post-modal');
    const container = document.getElementById('modal-post-container');
    if (!modal || !container) return;
    container.innerHTML = '';
    if (typeof renderPost === 'function') {
        renderPost(post, 'modal-post-container');
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeExploreModal() {
    const modal = document.getElementById('post-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ── Tab switching — stays active across all tabs ──────────────
function showTab(tab) {
    activeTab = tab;

    document.querySelectorAll('.explore-tab').forEach(t => {
        t.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

    document.getElementById('tab-posts').style.display    = tab === 'posts'    ? 'block' : 'none';
    document.getElementById('tab-people').style.display   = tab === 'people'   ? 'block' : 'none';
    document.getElementById('tab-trending').style.display = tab === 'trending' ? 'block' : 'none';

    if (tab === 'posts')    loadExplorePosts();
    if (tab === 'people')   loadPeople();
    if (tab === 'trending') loadTrending();
}

// ── Infinite scroll ───────────────────────────────────────────
function setupExploreScroll() {
    window.addEventListener('scroll', () => {
        if (exploreLoading || activeTab !== 'posts') return;
        const scrolledToBottom =
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
        if (scrolledToBottom) loadMoreExplorePosts();
    });
}

// ── Posts tab ─────────────────────────────────────────────────
function loadExplorePosts() {
    const grid = document.getElementById('explore-grid');
    if (!grid) return;

    grid.innerHTML = Array(6).fill(`
        <div class="skeleton" style="aspect-ratio:1;border-radius:8px;"></div>
    `).join('');

    fetch('/api/posts')
        .then(res => res.json())
        .then(posts => {
            if (!Array.isArray(posts)) posts = [];

            exploreAllPosts = posts;
            explorePage     = 1;
            grid.innerHTML  = '';

            if (posts.length === 0) {
                grid.innerHTML = `
                    <div class="explore-empty-card">
                        <i class="bi bi-camera-fill"></i>
                        <h5>No posts yet</h5>
                        <p>There are no posts to explore right now. Be the first to upload one.</p>
                    </div>
                `;
                return;
            }

            renderExploreBatch(posts.slice(0, explorePerPage));
        })
        .catch(err => {
            console.error('Explore load error:', err);
            grid.innerHTML = `
                <div class="explore-empty-card">
                    <i class="bi bi-wifi-off"></i>
                    <h5>Could not load posts</h5>
                    <p>Please refresh the page and try again.</p>
                </div>
            `;
        });
}

function renderExploreBatch(posts) {
    const grid = document.getElementById('explore-grid');
    if (!grid) return;

    posts.forEach(post => {
        const cell = document.createElement('div');
        cell.className = 'explore-cell';
        cell.style.cssText = `
            aspect-ratio:1;
            border-radius:8px;
            overflow:hidden;
            cursor:pointer;
            position:relative;
            background:rgba(196,122,43,0.08);
        `;

        if (post.image) {
            cell.innerHTML = `
                <img src="${post.image}"
                     style="width:100%;height:100%;object-fit:cover;
                            transition:transform 0.3s;display:block;">
                <div class="explore-overlay" style="
                    position:absolute;inset:0;
                    background:rgba(26,14,0,0);
                    display:flex;align-items:center;
                    justify-content:center;gap:1rem;
                    color:white;font-weight:700;
                    transition:all 0.2s;opacity:0;
                ">
                    <span><i class="bi bi-heart-fill"></i> ${post.likes || 0}</span>
                    <span><i class="bi bi-eye-fill"></i> ${post.view_count || 0}</span>
                </div>
            `;
            cell.addEventListener('mouseenter', () => {
                cell.querySelector('img').style.transform = 'scale(1.05)';
                const ov = cell.querySelector('.explore-overlay');
                ov.style.background = 'rgba(26,14,0,0.5)';
                ov.style.opacity    = '1';
            });
            cell.addEventListener('mouseleave', () => {
                cell.querySelector('img').style.transform = 'scale(1)';
                const ov = cell.querySelector('.explore-overlay');
                ov.style.background = 'rgba(26,14,0,0)';
                ov.style.opacity    = '0';
            });
        } else {
            cell.innerHTML = `
                <div style="
                    width:100%;height:100%;
                    display:flex;align-items:center;
                    justify-content:center;padding:12px;
                    background:linear-gradient(135deg,
                        rgba(196,122,43,0.08),rgba(196,122,43,0.18));
                ">
                    <p style="
                        font-size:0.78rem;color:var(--muted);
                        text-align:center;margin:0;
                        overflow:hidden;
                        display:-webkit-box;
                        -webkit-line-clamp:4;
                        -webkit-box-orient:vertical;
                    ">${post.text || ''}</p>
                </div>
            `;
        }

        cell.addEventListener('click', () => openExplorePost(post));
        grid.appendChild(cell);
    });
}

function loadMoreExplorePosts() {
    if (exploreLoading) return;
    const grid = document.getElementById('explore-grid');
    if (!grid) return;
    const start     = explorePage * explorePerPage;
    const nextBatch = exploreAllPosts.slice(start, start + explorePerPage);
    if (nextBatch.length === 0) return;
    exploreLoading = true;
    setTimeout(() => {
        renderExploreBatch(nextBatch);
        explorePage++;
        exploreLoading = false;
    }, 400);
}

// ── People tab — full width card layout ───────────────────────
function loadPeople() {
    const list = document.getElementById('people-list');
    if (!list) return;

    list.innerHTML = `
        <div class="skeleton skeleton-line"
             style="height:80px;border-radius:14px;margin-bottom:10px;"></div>
        <div class="skeleton skeleton-line"
             style="height:80px;border-radius:14px;margin-bottom:10px;"></div>
        <div class="skeleton skeleton-line"
             style="height:80px;border-radius:14px;"></div>
    `;

    // Use leaderboard to show all users with XP and badges
    fetch('/api/leaderboard')
        .then(res => res.json())
        .then(users => {
            if (users.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:var(--muted);">
                        <i class="bi bi-people"
                           style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                        No users yet
                    </div>`;
                return;
            }

            list.innerHTML = users.map((u, i) => {
                const badgeHtml = (u.badges || []).slice(0,4).join(' ');
                return `
    <div class="people-card">

        <!-- Rank number -->
        <div style="
            min-width:28px;
            text-align:center;
            font-size:1rem;
            font-weight:700;
            color:${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--muted)'};
        ">
            ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
        </div>

        <!-- Avatar -->
        <a href="/user/${u.username}" class="people-card-avatar">
            ${u.avatar
                ? `<img src="${u.avatar}" alt="${u.username}">`
                : `<div class="people-card-fallback">
                       ${u.username.charAt(0).toUpperCase()}
                   </div>`
            }
        </a>

        <!-- Info -->
        <div class="people-card-info">

            <!-- Name + level badge -->
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;">
                <a href="/user/${u.username}" class="people-card-name">
                    ${u.username}
                </a>
                <span style="
                    background:rgba(196,122,43,0.12);
                    color:var(--caramel);
                    padding:1px 8px;
                    border-radius:20px;
                    font-size:0.7rem;
                    font-weight:700;
                    white-space:nowrap;">
                    Lv.${u.level}
                </span>
            </div>

            <!-- Level title + XP -->
            <div style="font-size:0.78rem;color:var(--muted);margin-bottom:5px;">
                <i class="bi bi-cup-hot-fill"
                   style="color:var(--caramel);font-size:0.7rem;"></i>
                ${u.title}
                &nbsp;•&nbsp;
                <strong style="color:var(--caramel);">${u.xp}</strong> XP
                ${u.post_count > 0
                    ? `&nbsp;•&nbsp;${u.post_count} post${u.post_count > 1 ? 's' : ''}`
                    : ''}
            </div>

            <!-- XP bar -->
            <div style="
                height:4px;
                background:rgba(196,122,43,0.15);
                border-radius:4px;
                overflow:hidden;
                margin-bottom:6px;
                max-width:200px;">
                <div style="
                    height:100%;
                    width:${Math.min(u.xp_percent || 0, 100)}%;
                    background:var(--caramel);
                    border-radius:4px;">
                </div>
            </div>

            <!-- Badges -->
            ${badgeHtml
                ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">
                       ${badgeHtml}
                   </div>`
                : ''}
        </div>

        <!-- Follow button -->
        <button
            id="people-follow-${u.username}"
            onclick="followFromExplore('${u.username}', this)"
            class="people-card-follow-btn">
            Follow
        </button>

    </div>
`;
            }).join('');

            // Check follow status for each user
            checkFollowStatuses(users.map(u => u.username));
        })
        .catch(err => console.error('People error:', err));
}

function checkFollowStatuses(usernames) {
    if (!window.currentUser) return;
    fetch(`/api/following/${window.currentUser}`)
        .then(r => r.json())
        .then(following => {
            const followingNames = following.map(f => f.username);
            usernames.forEach(username => {
                const btn = document.getElementById(`people-follow-${username}`);
                if (!btn) return;
                if (followingNames.includes(username)) {
                    btn.textContent = 'Following';
                    btn.classList.add('following');
                }
                // Hide follow button for own account
                if (username === window.currentUser) {
                    btn.style.display = 'none';
                }
            });
        })
        .catch(() => {});
}

function followFromExplore(username, btn) {
    fetch(`/api/follow/${username}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.following) {
                btn.textContent = 'Following';
                btn.classList.add('following');
                if (typeof showToast === 'function') {
                    showToast(`Following ${username} ✓`, 'success');
                }
            } else {
                btn.textContent = 'Follow';
                btn.classList.remove('following');
                if (typeof showToast === 'function') {
                    showToast(`Unfollowed ${username}`, 'info');
                }
            }
        });
}

// ── Trending tab ──────────────────────────────────────────────
function loadTrending() {
    const list = document.getElementById('trending-list');
    if (!list) return;

    list.innerHTML = `
        <div style="text-align:center;padding:1rem;color:var(--muted);">
            Loading...
        </div>`;

    Promise.all([
        fetch('/api/posts/trending').then(res => res.json()),
        fetch('/api/cafes/rated').then(res => res.json()).catch(() => [])
    ])
        .then(([posts, cafes]) => {
            posts = Array.isArray(posts) ? posts : [];
            cafes = Array.isArray(cafes) ? cafes : [];
            let html = '';

            html += `
                <h5 style="font-weight:700;margin-bottom:1rem;color:var(--text);">
                    <i class="bi bi-fire" style="color:var(--caramel)"></i>
                    Most Liked This Week
                </h5>`;

            if (posts.length === 0) {
                html += `
                    <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1.5rem;">
                        No posts this week yet
                    </p>`;
            } else {
                html += `<div style="margin-bottom:1.5rem;">`;
                html += posts.map((p, i) => `
                    <div style="
                        display:flex;align-items:center;gap:12px;
                        padding:10px 0;
                        border-bottom:1px solid rgba(196,122,43,0.1);
                        cursor:pointer;
                    " onclick='openExplorePost(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
                        <span style="
                            font-size:1rem;font-weight:700;
                            color:var(--caramel);min-width:24px;
                            text-align:center;">
                            ${i + 1}
                        </span>
                        ${p.image
                            ? `<img src="${p.image}"
                                style="width:48px;height:48px;
                                       object-fit:cover;border-radius:8px;
                                       flex-shrink:0;">`
                            : `<div style="
                                width:48px;height:48px;
                                background:linear-gradient(135deg,
                                    var(--roast),var(--caramel));
                                border-radius:8px;flex-shrink:0;"></div>`
                        }
                        <div style="flex:1;min-width:0;">
                            <div style="
                                font-size:0.85rem;font-weight:700;
                                color:var(--text);">
                                ${p.username}
                            </div>
                            <div style="
                                font-size:0.8rem;color:var(--muted);
                                white-space:nowrap;overflow:hidden;
                                text-overflow:ellipsis;">
                                ${p.text}
                            </div>
                        </div>
                        <div style="
                            font-size:0.85rem;color:var(--caramel);
                            font-weight:700;white-space:nowrap;">
                            <i class="bi bi-heart-fill"></i> ${p.likes}
                        </div>
                    </div>
                `).join('');
                html += `</div>`;
            }

            html += `
                <h5 style="font-weight:700;margin:1.5rem 0 1rem;color:var(--text);">
                    <i class="bi bi-cup-hot" style="color:var(--caramel)"></i>
                    Top Cafes
                </h5>`;

            if (cafes.length === 0) {
                html += `<p style="color:var(--muted);font-size:0.9rem;">No cafe reviews yet</p>`;
            }

            cafes.forEach(cafe => {
                html += `
                    <div style="
                        display:flex;justify-content:space-between;
                        align-items:center;gap:12px;
                        padding:12px 0;
                        border-bottom:1px solid rgba(196,122,43,0.1);
                    ">
                        <div>
                            <div style="
                                font-weight:700;font-size:0.92rem;
                                color:var(--text);margin-bottom:4px;">
                                ${cafe.name}
                            </div>
                            <div style="font-size:0.8rem;color:var(--muted);">
                                <i class="bi bi-geo-alt"
                                   style="color:var(--caramel)"></i>
                                ${cafe.location}
                                &nbsp;•&nbsp;
                                <i class="bi bi-star-fill"
                                   style="color:var(--caramel)"></i>
                                ${cafe.rating}
                            </div>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">
                                ${(cafe.tags || []).map(t =>
                                    `<span style="
                                        background:rgba(196,122,43,0.1);
                                        color:var(--caramel);
                                        padding:2px 8px;
                                        border-radius:20px;
                                        font-size:0.72rem;
                                        font-weight:600;">
                                        ${t}
                                    </span>`
                                ).join('')}
                            </div>
                        </div>
                        <a href="/shop/${cafe.route.replace('shop_','')}"
                           style="
                               background:var(--caramel);
                               color:white;
                               padding:8px 18px;
                               border-radius:8px;
                               text-decoration:none;
                               font-size:0.82rem;
                               font-weight:700;
                               white-space:nowrap;
                               flex-shrink:0;">
                            View
                        </a>
                    </div>
                `;
            });

            list.innerHTML = html;
        })
        .catch(err => {
            console.error('Trending error:', err);
            list.innerHTML = `
                <p style="color:var(--muted);padding:1rem;">
                    Could not load trending
                </p>`;
        });
}