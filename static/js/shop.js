/*
 * shop.js
 * Handles star rating interactions, review submission,
 * loading and rendering reviews from database only.
 * Seed/demo reviews removed — all reviews are real user submissions.
 */

// ── Star Rating ───────────────────────────────────────────────────────────────
const starPicker = document.getElementById('starPicker');
let selectedRating = 0;

if (starPicker) {
    const stars = starPicker.querySelectorAll('.star-pick');

    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const val = parseInt(star.dataset.val);
            stars.forEach((s, i) => {
                s.style.color = i < val ? 'var(--caramel)' : '#ccc';
            });
        });

        star.addEventListener('mouseout', () => {
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? 'var(--caramel)' : '#ccc';
            });
        });

        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.val);
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? 'var(--caramel)' : '#ccc';
            });
        });
    });
}

// ── Review Submission ─────────────────────────────────────────────────────────
const submitBtn      = document.querySelector('.sidebar-card .btn-primary-custom');
const reviewTextarea = document.querySelector('.review-textarea');

if (submitBtn && reviewTextarea) {
    submitBtn.addEventListener('click', () => {
        const text     = reviewTextarea.value.trim();
        const shopName = document.querySelector('.shop-hero-title')?.innerText || '';

        if (selectedRating === 0) {
            alert('Please select a star rating.');
            return;
        }
        if (!text) {
            alert('Please write a review.');
            return;
        }

        fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shop:   shopName,
                rating: selectedRating,
                text:   text
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            reviewTextarea.value = '';
            selectedRating = 0;
            document.querySelectorAll('.star-pick').forEach(s => s.style.color = '#ccc');

            // Reload reviews and rating summary
            loadShopReviews();
            reloadRatingSummary(shopName);

            if (typeof showToast === 'function') {
                showToast('Review submitted ✓', 'success');
            }
        })
        .catch(err => console.error('Review error:', err));
    });
}

// ── Render Review Card ────────────────────────────────────────────────────────
function renderReview(r, currentUser) {
    const starsHtml = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const canDelete = r.username === currentUser;

    const div = document.createElement('div');
    div.className = 'shop-review-card';
    div.setAttribute('data-review-id', r.id);

    // Time ago
    let timeDisplay = 'Just now';
    if (r.created_at) {
        const seconds = Math.floor((new Date() - new Date(r.created_at)) / 1000);
        if (seconds < 60)        timeDisplay = `${seconds}s ago`;
        else if (seconds < 3600) timeDisplay = `${Math.floor(seconds/60)}m ago`;
        else if (seconds < 86400)timeDisplay = `${Math.floor(seconds/3600)}h ago`;
        else                     timeDisplay = `${Math.floor(seconds/86400)}d ago`;
    }

    div.innerHTML = `
        <div class="review-header">
            <div class="reviewer-avatar">
                ${r.username[0].toUpperCase()}
            </div>
            <div>
                <div class="reviewer-name">${r.username}</div>
                <div class="reviewer-date">${timeDisplay}</div>
            </div>
            <div class="review-stars ms-auto">${starsHtml}</div>
        </div>
        <p class="review-text">${r.text}</p>
        ${canDelete ? `
            <button onclick="deleteReview('${r.id}')"
                style="border:none;background:none;color:var(--muted);
                    font-size:0.8rem;cursor:pointer;padding:0;margin-top:4px;">
                <i class="bi bi-trash"></i> Delete
            </button>` : ''}
    `;
    return div;
}

// ── Load Reviews ──────────────────────────────────────────────────────────────
function loadShopReviews() {
    const reviewList  = document.querySelector('.review-list');
    if (!reviewList) return;

    reviewList.innerHTML = `
        <div style="text-align:center;padding:1rem;color:var(--muted);">
            Loading reviews...
        </div>`;

    const shopName   = document.querySelector('.shop-hero-title')?.innerText || '';
    const currentUser = window.currentUser || 'guest';

    fetch(`/api/reviews/shop/${encodeURIComponent(shopName)}`)
        .then(res => res.json())
        .then(reviews => {
            reviewList.innerHTML = '';

            if (reviews.length === 0) {
                reviewList.innerHTML = `
                    <div style="
                        text-align:center;
                        padding:2rem;
                        color:var(--muted);
                        background:rgba(196,122,43,0.04);
                        border-radius:12px;
                        border:1px dashed rgba(196,122,43,0.2);
                    ">
                        <i class="bi bi-chat-square-text"
                           style="font-size:1.8rem;display:block;margin-bottom:0.5rem;"></i>
                        <p style="margin:0;font-size:0.9rem;">
                            No reviews yet — be the first to review!
                        </p>
                    </div>`;
                return;
            }

            // Sort by newest first
            reviews.sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );

            reviews.forEach(r => {
                reviewList.appendChild(renderReview(r, currentUser));
            });
        })
        .catch(err => console.error('Error loading reviews:', err));
}

// ── Reload Rating Summary after new review ────────────────────────────────────
function reloadRatingSummary(shopName) {
    fetch(`/api/cafe-stats/${encodeURIComponent(shopName)}`)
        .then(r => r.json())
        .then(data => {
            if (data.count === 0) return;

            const pill = document.getElementById('hero-rating-pill');
            if (pill) {
                pill.style.display = 'flex';
                document.getElementById('hero-avg').textContent   = data.average;
                document.getElementById('hero-stars').textContent =
                    '★'.repeat(Math.round(data.average)) +
                    '☆'.repeat(5 - Math.round(data.average));
                document.getElementById('hero-count').textContent =
                    `${data.count} review${data.count > 1 ? 's' : ''}`;
            }

            const section = document.getElementById('cafe-rating-summary');
            if (section) {
                section.style.display = 'flex';
                document.getElementById('cafe-avg-score').textContent = data.average;
                document.getElementById('cafe-avg-stars').textContent =
                    '★'.repeat(Math.round(data.average)) +
                    '☆'.repeat(5 - Math.round(data.average));
                document.getElementById('cafe-review-count').textContent =
                    `${data.count} review${data.count > 1 ? 's' : ''}`;

                const bars = document.getElementById('cafe-rating-bars');
                if (bars) {
                    bars.innerHTML = [5,4,3,2,1].map(star => {
                        const count = data.breakdown[star] || 0;
                        const pct   = Math.round((count / data.count) * 100);
                        return `
                            <div class="cafe-rating-bar-row">
                                <span style="color:var(--caramel);min-width:12px;">${star}</span>
                                <i class="bi bi-star-fill"
                                   style="color:var(--caramel);font-size:0.7rem;"></i>
                                <div class="cafe-rating-bar-fill">
                                    <div class="cafe-rating-bar-inner"
                                         style="width:${pct}%"></div>
                                </div>
                                <span style="color:var(--muted);min-width:24px;
                                    text-align:right;">${count}</span>
                            </div>`;
                    }).join('');
                }
            }
        })
        .catch(() => {});
}

// ── Delete Review ─────────────────────────────────────────────────────────────
window.deleteReview = function(id) {
    if (!confirm('Delete this review?')) return;

    fetch(`/api/reviews/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            const shopName = document.querySelector('.shop-hero-title')?.innerText || '';
            loadShopReviews();
            reloadRatingSummary(shopName);
            if (typeof showToast === 'function') {
                showToast('Review deleted', 'info');
            }
        })
        .catch(err => console.error('Delete error:', err));
};

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    loadShopReviews();
});