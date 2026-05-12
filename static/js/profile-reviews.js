
window.addEventListener('DOMContentLoaded', () => {
     localStorage.removeItem('shopReviews'); // clear old localStorage reviews
    const reviewContainer = document.getElementById('profile-reviews');
    const username = window.profileUsername;

    fetch(`/api/reviews/${username}`)
        .then(res => res.json())
        .then(reviews => {
            if (reviews.length === 0) {
                reviewContainer.innerHTML = "<p>No reviews yet</p>";
                return;
            }

            reviewContainer.innerHTML = '';

            reviews.forEach(r => {
                const div = document.createElement('div');
                div.className = 'review-card';
                div.innerHTML = `
                    <strong>${r.shop}</strong>
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