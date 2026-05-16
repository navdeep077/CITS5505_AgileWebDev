/*
 * profile-reviews.js
 * Loads and renders cafe reviews for a public user profile page.
 * Used on /user/<username> to show reviews submitted by that user.
 * Fetches from the database API so reviews are visible to all users
 * regardless of which browser or device they are using.
 */

window.addEventListener('DOMContentLoaded', () => {
    // Remove any legacy localStorage reviews from before the DB migration
    localStorage.removeItem('shopReviews');

    const reviewContainer = document.getElementById('profile-reviews');
    if (!reviewContainer) return;

    // Username of the profile being viewed — set in user-profile.html as a global
    const username = window.profileUsername;

    // Fetch all reviews submitted by this user from the backend API
    fetch(`/api/reviews/${username}`)
        .then(res => res.json())
        .then(reviews => {
            if (reviews.length === 0) {
                reviewContainer.innerHTML = "<p>No reviews yet</p>";
                return;
            }

            reviewContainer.innerHTML = '';

            // Render each review as a card showing cafe name, star rating and text
            reviews.forEach(r => {
                const div = document.createElement('div');
                div.className = 'review-card';
                div.innerHTML = `
                    <strong>${r.shop}</strong>
                    <!-- Star rating using filled and empty star characters -->
                    <div style="color:var(--caramel)">
                        ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                    </div>
                    <p style="font-size:0.85rem;color:var(--muted)">${r.text}</p>
                `;
                reviewContainer.appendChild(div);
            });
        })
        .catch(err => console.error('Error loading reviews:', err));
});