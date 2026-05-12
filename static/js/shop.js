// ── SEED REVIEWS ─────────────────────────
const seedReviews = [
    // Blacklist Coffee Roasters
    {
        id: "1-review-1",
        shop: "Blacklist Coffee Roasters",
        username: "AmeliaBrews",
        rating: 5,
        text: "Best cold brew in Perth, hands down. The nitro cold brew is absolutely incredible — smooth, creamy and never bitter.",
        date: "3 days ago",
        seed: true
    },
    {
        id: "1-review-2",
        shop: "Blacklist Coffee Roasters",
        username: "RoastHunter_WA",
        rating: 5,
        text: "The single origin espresso changes seasonally. Every visit is a new experience. Worth the drive to Welshpool.",
        date: "5 days ago",
        seed: true
    },
    // Harvest Espresso
    {
        id: "2-review-1",
        shop: "Harvest Espresso",
        username: "JavaJunkie",
        rating: 5,
        text: "Harvest is my go-to in Leederville. Their V60 is exceptional — clean and complex without being fussy.",
        date: "2 days ago",
        seed: true
    },
    // La Veen Coffee
    {
        id: "3-review-1",
        shop: "La Veen Coffee",
        username: "ThirdWaveTom",
        rating: 5,
        text: "The best pour over in the CBD — the V60 rotation keeps things exciting. Staff are incredibly knowledgeable.",
        date: "2 days ago",
        seed: true
    },
    {
        id: "3-review-2",
        shop: "La Veen Coffee",
        username: "PerthCoffeeFan",
        rating: 5,
        text: "Perfectly executed Chemex every single time. This is my daily stop before work. Cannot recommend enough.",
        date: "6 days ago",
        seed: true
    },
    // Mary Street Bakery
    {
        id: "4-review-1",
        shop: "Mary Street Bakery",
        username: "LatteLover_Perth",
        rating: 5,
        text: "Mary Street is a Perth institution. The cinnamon scrolls with a cold brew is the perfect combo.",
        date: "3 days ago",
        seed: true
    },
    // Satchmo
    {
        id: "5-review-1",
        shop: "Satchmo",
        username: "MorningMutt",
        rating: 5,
        text: "Brought my dog here on the weekend — huge outdoor area, super welcoming staff. Coffee was great too!",
        date: "4 days ago",
        seed: true
    },
    // Telegram Cafe
    {
        id: "6-review-1",
        shop: "Telegram Cafe",
        username: "SipAndWork",
        rating: 5,
        text: "Love the vibe here in Northbridge. The pour over selection rotates weekly — always something new to try.",
        date: "1 week ago",
        seed: true
    },
    // Venn Coffee
    {
        id: "7-review-1",
        shop: "Venn Coffee",
        username: "CoffeeEnthusiast_UWA",
        rating: 5,
        text: "The oat flat white here is the gold standard for Subiaco. Super smooth, never bitter. Staff brought out a water bowl for my dog unprompted!",
        date: "2 days ago",
        seed: true
    },
    {
        id: "7-review-2",
        shop: "Venn Coffee",
        username: "BrewHound_Perth",
        rating: 4,
        text: "Consistently excellent. Space can get tight on weekends but staff genuinely know their coffee.",
        date: "1 week ago",
        seed: true
    }
];

// ── STAR PICKER ─────────────────────────
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

// ── SUBMIT REVIEW ─────────────────────────
const submitBtn = document.querySelector('.sidebar-card .btn-primary-custom');
const reviewTextarea = document.querySelector('.review-textarea');

if (submitBtn && reviewTextarea) {
    submitBtn.addEventListener('click', () => {
    const text = reviewTextarea.value.trim();

    if (selectedRating === 0) {
        alert('Please select a star rating.');
        return;
    }
    if (!text) {
        alert('Please write a review.');
        return;
    }

    const shopName = document.querySelector('.shop-hero-title')?.innerText || 'Unknown Shop';

    fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            shop: shopName,
            rating: selectedRating,
            text: text
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        alert(`Review submitted! ${selectedRating}★ for ${shopName}`);
        reviewTextarea.value = '';
        selectedRating = 0;
        document.querySelectorAll('.star-pick').forEach(s => s.style.color = '#ccc');
        loadShopReviews();
    })
    .catch(err => console.error('Review error:', err));
});
}

// ── RENDER SINGLE REVIEW ─────────────────────────
function renderReview(r, currentUser) {
    const starsHtml = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const canDelete = r.username === currentUser;

    const div = document.createElement('div');
    div.className = 'shop-review-card';
    div.setAttribute('data-review-id', r.id);
    div.innerHTML = `
        <div class="review-header">
            <div class="reviewer-avatar">${r.username[0].toUpperCase()}</div>
            <div>
                <div class="reviewer-name">${r.username}</div>
                <div class="reviewer-date">${r.date || 'Just now'}</div>
            </div>
            <div class="review-stars ms-auto">${starsHtml}</div>
        </div>
        <p class="review-text">${r.text}</p>
        ${canDelete ? `
            <button onclick="deleteReview('${r.id}')"
                style="border:none;background:none;color:var(--muted);font-size:0.8rem;cursor:pointer;padding:0;">
                <i class="bi bi-trash"></i> Delete
            </button>` : ''}
    `;
    return div;
}

// ── LOAD REVIEWS FOR THIS SHOP ─────────────────────────
function loadShopReviews() {
    const reviewList = document.querySelector('.review-list');
    if (!reviewList) return;

    reviewList.innerHTML = '';

    const shopName = document.querySelector('.shop-hero-title')?.innerText || '';
    const currentUser = window.currentUser || 'guest';
    const deletedIds = JSON.parse(localStorage.getItem('deletedReviews')) || [];

    fetch(`/api/reviews/shop/${encodeURIComponent(shopName)}`)
        .then(res => res.json())
        .then(dbReviews => {
            const allForShop = [
                ...seedReviews.filter(r => r.shop === shopName),
                ...dbReviews
            ].filter(r => !deletedIds.includes(String(r.id)));

            if (allForShop.length === 0) {
                reviewList.innerHTML = "<p class='text-muted'>No reviews yet. Be the first!</p>";
                return;
            }

            allForShop.forEach(r => {
                reviewList.appendChild(renderReview(r, currentUser));
            });
        })
        .catch(err => console.error('Error loading reviews:', err));
}

// ── DELETE REVIEW ─────────────────────────
window.deleteReview = function(id) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    // seed reviews only tracked in localStorage
    if (String(id).includes('-')) {
        let deletedIds = JSON.parse(localStorage.getItem('deletedReviews')) || [];
        if (!deletedIds.includes(String(id))) {
            deletedIds.push(String(id));
            localStorage.setItem('deletedReviews', JSON.stringify(deletedIds));
        }
        loadShopReviews();
        return;
    }

    // DB reviews deleted via API
    fetch(`/api/reviews/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            loadShopReviews();
        })
        .catch(err => console.error('Delete error:', err));
}

// ── INIT ─────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    loadShopReviews();
});