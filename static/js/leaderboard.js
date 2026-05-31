/*
 * leaderboard.js
 * Loads and renders the Barista XP leaderboard
 */

const BADGE_ICONS = {
    "First Post":       "📝",
    "Regular Poster":   "✍️",
    "Prolific Poster":  "🔥",
    "First Review":     "⭐",
    "Cafe Explorer":    "🗺️",
    "Top Reviewer":     "🏆",
    "Popular Post":     "❤️",
    "Social Butterfly": "🦋",
    "Community Star":   "🌟",
    "Loyal Member":     "💎"
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/leaderboard')
        .then(res => res.json())
        .then(users => {
            const list = document.getElementById('leaderboard-list');

            if (users.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:var(--muted);">
                        <i class="bi bi-trophy" style="font-size:2.5rem;display:block;margin-bottom:1rem;"></i>
                        <h4>No rankings yet</h4>
                        <p>Start posting and reviewing to earn XP!</p>
                    </div>`;
                return;
            }

            list.innerHTML = users.map((u, i) => {
                const rankIcon  = RANK_ICONS[i] || `<span style="font-weight:700;color:var(--muted);">#${u.rank}</span>`;
                const badgeHtml = u.badges.slice(0, 3).map(b =>
                    `<span title="${b}">${BADGE_ICONS[b] || '🎖️'}</span>`
                ).join('');

                const xpNext = u.next_xp
                    ? `<div class="xp-bar-wrap">
                           <div class="xp-bar" style="width:${Math.min((u.xp / u.next_xp) * 100, 100)}%"></div>
                       </div>`
                    : `<span style="font-size:0.72rem;color:var(--caramel);">MAX LEVEL</span>`;

                const isCurrentUser = u.username === window.currentUser;

                return `
                    <div class="leaderboard-row ${isCurrentUser ? 'leaderboard-you' : ''}">
                        <div class="leaderboard-rank">${rankIcon}</div>
                        <div class="leaderboard-avatar">
                            ${u.avatar
                                ? `<img src="${u.avatar}" alt="${u.username}">`
                                : `<div class="avatar-fallback">${u.username.charAt(0).toUpperCase()}</div>`
                            }
                        </div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">
                                <a href="/user/${u.username}">${u.username}</a>
                                ${isCurrentUser ? '<span class="you-badge">You</span>' : ''}
                            </div>
                            <div class="leaderboard-title">${u.title}</div>
                            <div class="leaderboard-badges">${badgeHtml}</div>
                        </div>
                        <div class="leaderboard-xp">
                            <div class="xp-number">${u.xp} XP</div>
                            <div class="level-badge">Lv ${u.level}</div>
                        </div>
                    </div>
                `;
            }).join('');
        })
        .catch(err => console.error('Leaderboard error:', err));
});