window.addEventListener('DOMContentLoaded', () => {

    const reviewContainer = document.getElementById('profile-reviews');

    if (!reviewContainer) return;

    const username = window.profileUsername;

    const reviews = JSON.parse(localStorage.getItem('shopReviews')) || [];

    const userReviews = reviews.filter(r => r.username === username);

    if (userReviews.length === 0) {
        reviewContainer.innerHTML = "<p>No reviews yet</p>";
        return;
    }

    reviewContainer.innerHTML = '';

    userReviews.forEach(r => {

        const div = document.createElement('div');

        div.className = 'review-card';

        div.innerHTML = `
            <strong>${r.shop}</strong>
            <div>
                ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
            </div>
        `;

        reviewContainer.appendChild(div);

    });

});