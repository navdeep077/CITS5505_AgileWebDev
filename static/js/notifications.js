/*
 * notifications.js
 * Loads and renders notifications
 * Week 7: follow back button toggles like Instagram
 */

document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
});

function loadNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    container.innerHTML = `
        <div class="skeleton-post">
            <div style="display:flex;gap:12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-line" style="width:60%;"></div>
                    <div class="skeleton skeleton-line" style="width:40%;"></div>
                </div>
            </div>
        </div>
    `;

    fetch('/api/notifications')
        .then(res => res.json())
        .then(notifs => {
            if (notifs.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:var(--muted);">
                        <i class="bi bi-bell-slash"
                           style="font-size:2.5rem;display:block;margin-bottom:1rem;"></i>
                        <h5>No notifications yet</h5>
                        <p>When someone likes or comments on your posts you will see it here</p>
                    </div>`;
                return;
            }

            container.innerHTML = notifs.map(n => {
                const icon = {
    'like':    '❤️',
    'comment': '💬',
    'follow':  '👤',
    'mention': '📢'
}[n.type] || '🔔';

                const message = {
    'like':    'liked your post',
    'comment': 'commented on your post',
    'follow':  'started following you',
    'mention': 'mentioned you in a post'
}[n.type] || 'interacted with you';

                const timeAgo = getTimeAgo(n.created_at);

                return `
                    <div class="notif-row ${n.is_read ? '' : 'notif-unread'}">
                        <div class="notif-icon-wrap">
                            <a href="/user/${n.actor}">
                                ${n.actor_avatar
                                    ? `<img src="${n.actor_avatar}"
                                           class="notif-avatar"
                                           alt="${n.actor}">`
                                    : `<div class="notif-avatar-fallback">
                                           ${n.actor.charAt(0).toUpperCase()}
                                       </div>`
                                }
                            </a>
                            <span class="notif-type-icon">${icon}</span>
                        </div>
                        <div class="notif-body">
                            <div class="notif-text">
                                <a href="/user/${n.actor}"
                                   style="font-weight:700;color:var(--text,#1a0e00);
                                          text-decoration:none;">
                                    ${n.actor}
                                </a>
                                ${message}
                            </div>
                            <div class="notif-time">${timeAgo}</div>
                        </div>
                        <div class="notif-action">
                            ${n.type === 'follow'
                                ? `<button
                                       id="follow-back-${n.actor}"
                                       onclick="followBack('${n.actor}', this)"
                                       class="notif-follow-btn">
                                       Follow Back
                                   </button>`
                                : n.post_id
                                    ? `<a href="/home" class="notif-post-link">
                                           View Post →
                                       </a>`
                                    : ''
                            }
                        </div>
                    </div>
                `;
            }).join('');

            // ── Check follow status for each follow notification ──────
            const followNotifs = notifs.filter(n => n.type === 'follow');
            if (followNotifs.length > 0) {
                fetch(`/api/following/${window.currentUser}`)
                    .then(r => r.json())
                    .then(following => {
                        const followingNames = following.map(f => f.username);
                        followNotifs.forEach(n => {
                            const btn = document.getElementById(`follow-back-${n.actor}`);
                            if (!btn) return;
                            if (followingNames.includes(n.actor)) {
                                setFollowingState(btn);
                            }
                        });
                    })
                    .catch(() => {});
            }
        })
        .catch(err => console.error('Notifications error:', err));
}

// ── Follow Back toggle ────────────────────────────────────────────────────────
function followBack(username, btn) {
    fetch(`/api/follow/${username}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.following) {
                setFollowingState(btn);
                if (typeof showToast === 'function') {
                    showToast(`Following ${username} ✓`, 'success');
                }
            } else {
                setFollowBackState(btn);
                if (typeof showToast === 'function') {
                    showToast(`Unfollowed ${username}`, 'info');
                }
            }
        })
        .catch(err => console.error('Follow error:', err));
}

function setFollowingState(btn) {
    btn.textContent      = 'Following';
    btn.style.background = 'rgba(196,122,43,0.1)';
    btn.style.color      = 'var(--caramel)';
    btn.style.border     = '1.5px solid var(--caramel)';
}

function setFollowBackState(btn) {
    btn.textContent      = 'Follow Back';
    btn.style.background = 'var(--caramel)';
    btn.style.color      = 'white';
    btn.style.border     = 'none';
}

// ── Time ago helper ───────────────────────────────────────────────────────────
function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const now     = new Date();
    const past    = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);
    if (seconds < 60)  return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)  return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)    return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}