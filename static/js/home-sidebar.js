/*
 * home-sidebar.js
 * Loads suggested users, trending hashtags
 * and rated cafes into home page sidebar
 */

document.addEventListener('DOMContentLoaded', () => {
    loadSuggestions();
    loadTrendingTags();
    loadRatedCafes();
    loadWeather();
});

function loadWeather() {
    const el = document.getElementById('sidebar-weather');
    if (!el) return;

    fetch('https://api.open-meteo.com/v1/forecast?latitude=-31.9505&longitude=115.8605&current_weather=true&timezone=Australia%2FPerth')
        .then(r => r.json())
        .then(data => {
            const w    = data.current_weather;
            const temp = Math.round(w.temperature);
            const code = w.weathercode;

            const icon = code <= 3  ? '☀️'
                       : code <= 48 ? '🌤️'
                       : code <= 67 ? '🌧️'
                       : code <= 77 ? '❄️'
                       : '⛈️';

            const desc = code <= 3  ? 'Clear'
                       : code <= 48 ? 'Cloudy'
                       : code <= 67 ? 'Rainy'
                       : code <= 77 ? 'Snow'
                       : 'Stormy';

            el.innerHTML = `
                <div class="sidebar-card" style="margin-bottom:1rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <div style="font-size:0.75rem;color:var(--muted);
                                font-weight:600;text-transform:uppercase;
                                letter-spacing:0.5px;margin-bottom:4px;">
                                Perth Weather
                            </div>
                            <div style="font-size:1.4rem;font-weight:700;
                                color:var(--text);">
                                ${temp}°C
                            </div>
                            <div style="font-size:0.8rem;color:var(--muted);">
                                ${desc}
                            </div>
                        </div>
                        <div style="font-size:2.5rem;">${icon}</div>
                    </div>
                </div>
            `;
        })
        .catch(() => { el.innerHTML = ''; });
}

// ── Suggested Users ───────────────────────────────────────────────────────────
function loadSuggestions() {
    fetch('/api/suggested-users/sidebar')
        .then(res => res.json())
        .then(users => {
            const list = document.getElementById('suggestions-list');
            if (!list) return;

            if (users.length === 0) {
                list.innerHTML = `
                    <p style="color:var(--muted);font-size:0.82rem;
                        text-align:center;padding:1rem 0;">
                        No suggestions right now
                    </p>`;
                return;
            }

            list.innerHTML = users.map(u => `
                <div class="suggestion-row" id="sug-${u.username}">
                    <a href="/user/${u.username}" class="suggestion-avatar">
                        ${u.avatar
                            ? `<img src="${u.avatar}" alt="${u.username}">`
                            : `<div class="sug-fallback">
                                   ${u.username.charAt(0).toUpperCase()}
                               </div>`
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
                btn.textContent          = 'Following';
                btn.style.background     = 'rgba(196,122,43,0.1)';
                btn.style.color          = 'var(--caramel)';
                showToast(`Following ${username} ✓`, 'success');
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
                    <p style="color:var(--muted);font-size:0.82rem;
                        text-align:center;padding:0.5rem 0;">
                        No hashtags yet — add #tags to your posts
                    </p>`;
                return;
            }

            list.innerHTML = tags.map(t => `
                <a href="/hashtag/${t.tag}" class="trending-tag-row">
                    <span class="trending-tag-name">#${t.tag}</span>
                    <span class="trending-tag-count">
                        ${t.count} post${t.count > 1 ? 's' : ''}
                    </span>
                </a>
            `).join('');
        })
        .catch(err => console.error('Trending tags error:', err));
}

// ── Rated Cafes Sidebar ───────────────────────────────────────────────────────
// Only shows cafes that have at least one real user review
// Sorted by average rating descending
function loadRatedCafes() {
    fetch('/api/cafes/rated')
        .then(res => res.json())
        .then(cafes => {
            const list = document.getElementById('rated-cafes-list');
            if (!list) return;

            if (cafes.length === 0) {
                list.innerHTML = `
                    <p style="font-size:0.8rem;color:var(--muted);
                        text-align:center;padding:0.5rem 0;">
                        No reviews yet — visit a cafe and be first!
                    </p>`;
                return;
            }

            list.innerHTML = cafes.map(c => `
                <a href="/shop/${c.route.replace('shop_', '')}"
                   class="sidebar-cafe-link">
                    <span style="
                        white-space:nowrap;
                        overflow:hidden;
                        text-overflow:ellipsis;
                        max-width:140px;">
                        ${c.name}
                    </span>
                    <span class="sidebar-cafe-rating">
                        <i class="bi bi-star-fill"></i>
                        ${c.rating}
                        <span style="font-size:0.68rem;color:var(--muted);">
                            (${c.count})
                        </span>
                    </span>
                </a>
            `).join('');
        })
        .catch(() => {});
}
// ── Weather widget ────────────────────────────────────────────
function loadWeather() {
    const el = document.getElementById('sidebar-weather');
    if (!el) return;

    // Perth coordinates
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-31.9505&longitude=115.8605&current_weather=true&timezone=Australia%2FPerth')
        .then(r => r.json())
        .then(data => {
            const w    = data.current_weather;
            const temp = Math.round(w.temperature);
            const code = w.weathercode;

            const icon = code <= 3  ? '☀️'
                       : code <= 48 ? '🌤️'
                       : code <= 67 ? '🌧️'
                       : code <= 77 ? '❄️'
                       : '⛈️';

            const desc = code <= 3  ? 'Clear'
                       : code <= 48 ? 'Cloudy'
                       : code <= 67 ? 'Rainy'
                       : code <= 77 ? 'Snow'
                       : 'Stormy';

            el.innerHTML = `
                <div class="sidebar-card" style="margin-bottom:1rem;">
                    <div style="display:flex;align-items:center;
                        justify-content:space-between;">
                        <div>
                            <div style="font-size:0.75rem;color:var(--muted);
                                font-weight:600;text-transform:uppercase;
                                letter-spacing:0.5px;margin-bottom:4px;">
                                Perth Weather
                            </div>
                            <div style="font-size:1.4rem;font-weight:700;
                                color:var(--text);">
                                ${temp}°C
                            </div>
                            <div style="font-size:0.8rem;color:var(--muted);">
                                ${desc}
                            </div>
                        </div>
                        <div style="font-size:2.5rem;">${icon}</div>
                    </div>
                </div>
            `;
        })
        .catch(() => { el.innerHTML = ''; });
}

// ── Weather widget ────────────────────────────────────────────
function loadWeather() {
    const el = document.getElementById('sidebar-weather');
    if (!el) return;

    fetch('https://api.open-meteo.com/v1/forecast?latitude=-31.9505&longitude=115.8605&current_weather=true&timezone=Australia%2FPerth')
        .then(r => r.json())
        .then(data => {
            const w    = data.current_weather;
            const temp = Math.round(w.temperature);
            const code = w.weathercode;

            const icon = code <= 3  ? '☀️'
                       : code <= 48 ? '🌤️'
                       : code <= 67 ? '🌧️'
                       : code <= 77 ? '❄️'
                       : '⛈️';

            const desc = code <= 3  ? 'Clear'
                       : code <= 48 ? 'Cloudy'
                       : code <= 67 ? 'Rainy'
                       : code <= 77 ? 'Snow'
                       : 'Stormy';

            el.innerHTML = `
                <div class="sidebar-card" style="margin-bottom:1rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <div style="font-size:0.75rem;color:var(--muted);
                                font-weight:600;text-transform:uppercase;
                                letter-spacing:0.5px;margin-bottom:4px;">
                                Perth Weather
                            </div>
                            <div style="font-size:1.4rem;font-weight:700;color:var(--text);">
                                ${temp}°C
                            </div>
                            <div style="font-size:0.8rem;color:var(--muted);">${desc}</div>
                        </div>
                        <div style="font-size:2.5rem;">${icon}</div>
                    </div>
                </div>
            `;
        })
        .catch(() => { el.innerHTML = ''; });
}