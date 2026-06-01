/*
 * notifications-count.js
 * Polls notification count every 10 seconds
 * Shows toast when new notifications arrive
 */

let lastCount = 0;

function updateNotifBadge(count) {
    // Desktop badge
    const badge        = document.getElementById('notif-count');
    const badgeMobile  = document.getElementById('notif-count-mobile');

    if (count > 0) {
        if (badge) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        }
        if (badgeMobile) {
            badgeMobile.textContent = count > 9 ? '9+' : count;
            badgeMobile.style.display = 'flex';
        }
    } else {
        if (badge)       badge.style.display = 'none';
        if (badgeMobile) badgeMobile.style.display = 'none';
    }
}

function pollNotifications() {
    fetch('/api/notifications/count')
        .then(res => res.json())
        .then(data => {
            const count = data.count || 0;
            updateNotifBadge(count);

            // Show toast when new notifications arrive
            if (count > lastCount && lastCount !== 0) {
                const diff = count - lastCount;
                if (typeof showToast === 'function') {
                    showToast(
                        `You have ${diff} new notification${diff > 1 ? 's' : ''} 🔔`,
                        'info'
                    );
                }
            }
            lastCount = count;
        })
        .catch(() => {});
}

// Poll immediately then every 10 seconds
pollNotifications();
setInterval(pollNotifications, 10000);