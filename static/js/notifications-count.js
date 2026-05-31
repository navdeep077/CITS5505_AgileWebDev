// notifications-count.js
// Fetches unread notification count and shows badge in navbar

function updateNotifCount() {
    if (!window.currentUser) return;

    fetch('/api/notifications/count')
        .then(res => res.json())
        .then(data => {
            const count = data.count || 0;

            // Update all notification badges
            document.querySelectorAll('#notif-count, #notif-count-mobile').forEach(badge => {
                if (count > 0) {
                    badge.textContent = count > 9 ? '9+' : count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });
        })
        .catch(err => console.error('Notif count error:', err));
}

// Check on page load
updateNotifCount();

// Check every 30 seconds
setInterval(updateNotifCount, 30000);