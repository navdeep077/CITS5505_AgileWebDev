/*
 * profile-reviews.js
 * Loads and renders reviews on the PUBLIC user profile page (/user/<username>)
 * Uses window.profileUsername set by user-profile.html
 * Also used on own profile page — uses window.currentUser as fallback
 */

window.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('shopReviews');

    const container = document.getElementById('profile-reviews');
    if (!container) return;

    // Use profileUsername for public profiles, currentUser for own profile
    const username = window.profileUsername || window.currentUser;
    if (!username) return;

    fetch(`/api/reviews/${username}`)
        .then(res => res.json())
        .then(reviews => {
            if (reviews.length === 0) {
                container.innerHTML = '<p style="color:var(--muted);font-size:0.9rem;">No reviews yet</p>';
                return;
            }

            container.innerHTML = reviews.map(r => `
                <div style="
                    background:rgba(196,122,43,0.04);
                    border:1px solid rgba(196,122,43,0.15);
                    border-radius:10px;
                    padding:12px 14px;
                    margin-bottom:10px;
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <strong style="font-size:0.9rem;color:var(--text, #1a0e00);">${r.shop}</strong>
                        <span style="color:var(--caramel);font-size:0.85rem;">
                            ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                        </span>
                    </div>
                    <p style="font-size:0.82rem;color:var(--muted);margin:0;">${r.text}</p>
                </div>
            `).join('');
        })
        .catch(err => console.error('Profile reviews error:', err));
});