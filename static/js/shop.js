// ── STAR PICKER ─────────────────────────
const starPicker = document.getElementById('starPicker');
let selectedRating = 0;

if (starPicker) {
    const stars = starPicker.querySelectorAll('.star-pick');

    stars.forEach(star => {
        // hover effect
        star.addEventListener('mouseover', () => {
            const val = parseInt(star.dataset.val);
            stars.forEach((s, i) => {
                s.style.color = i < val ? 'var(--caramel)' : '#ccc';
            });
        });

        // mouse out — keep selected stars highlighted
        star.addEventListener('mouseout', () => {
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? 'var(--caramel)' : '#ccc';
            });
        });

        // click to select
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.val);
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? 'var(--caramel)' : '#ccc';
            });
        });
    });
}

// ── SUBMIT REVIEW ─────────────────────────
const submitBtn = document.querySelector('.btn-primary-custom');
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

        // get shop name from page title
        const shopName = document.querySelector('.shop-hero-title')?.innerText || 'Unknown Shop';
        const currentUser = window.currentUser || 'guest';

        // save to localStorage
        const review = {
            shop: shopName,
            username: currentUser,
            rating: selectedRating,
            text: text,
            time: new Date().toISOString()
        };

        let reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];
        reviews.unshift(review);
        localStorage.setItem('shopReviews', JSON.stringify(reviews));

        // show success and reset
        alert(`Review submitted! ${selectedRating}★ for ${shopName}`);
        reviewTextarea.value = '';
        selectedRating = 0;
        document.querySelectorAll('.star-pick').forEach(s => s.style.color = '#ccc');

        // add review to page immediately
        addReviewToPage(review);
    });
}

// ── ADD REVIEW TO PAGE ─────────────────────────
function addReviewToPage(review) {
    const reviewList = document.querySelector('.review-list');
    if (!reviewList) return;

    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const div = document.createElement('div');
    div.className = 'shop-review-card';
    div.innerHTML = `
        <div class="review-header">
            <div class="reviewer-avatar">${review.username[0].toUpperCase()}</div>
            <div>
                <div class="reviewer-name">${review.username}</div>
                <div class="reviewer-date">Just now</div>
            </div>
            <div class="review-stars ms-auto">${stars}</div>
        </div>
        <p class="review-text">${review.text}</p>
    `;
    reviewList.prepend(div);
}