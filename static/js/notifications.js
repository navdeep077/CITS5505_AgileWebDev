// notifications.js
// Loads and renders notifications for the current user

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function loadNotifications() {
    fetch('/api/notifications')
        .then(res => res.json())
        .then(notifs => {
            const list = document.getElementById('notif-list');

            if (notifs.length === 0) {
                list.innerHTML = `
                    <div class="notif-empty">
                        <i class="bi bi-bell-slash"></i>
                        <h4>No notifications yet</h4>
                        <p>When someone likes or comments on your posts you will see it here</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = notifs.map(n => {
                const initial = n.actor.charAt(0).toUpperCase();
                const avatarHtml = n.actor_avatar
                    ? `<img src="${n.actor_avatar}">`
                    : initial;

                let iconClass = '';
                let iconHtml = '';
                let message = '';

                if (n.type === 'like') {
                    iconClass = 'like';
                    iconHtml = '<i class="bi bi-heart-fill"></i>';
                    message = `<strong>${n.actor}</strong> liked your post`;
                } else if (n.type === 'comment') {
                    iconClass = 'comment';
                    iconHtml = '<i class="bi bi-chat-fill"></i>';
                    message = `<strong>${n.actor}</strong> commented on your post`;
                } else if (n.type === 'follow') {
                    iconClass = 'follow';
                    iconHtml = '<i class="bi bi-person-plus-fill"></i>';
                    message = `<strong>${n.actor}</strong> started following you`;
                }

                const linkHref = n.post_id ? `/home` : `/user/${n.actor}`;

                return `
                    <a href="${linkHref}" class="notif-card ${n.is_read ? '' : 'unread'}">
                        <div class="notif-avatar">${avatarHtml}</div>
                        <div class="notif-icon ${iconClass}">${iconHtml}</div>
                        <div class="notif-text">${message}</div>
                        <div class="notif-time">${timeAgo(n.created_at)}</div>
                    </a>
                `;
            }).join('');
        })
        .catch(err => console.error('Notifications error:', err));
}

document.addEventListener('DOMContentLoaded', loadNotifications);