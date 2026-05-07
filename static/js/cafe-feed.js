// Load posts for this cafe from API
fetch(`/api/posts/cafe/${encodeURIComponent(cafeName)}`)
    .then(res => res.json())
    .then(posts => {
        const feed = document.getElementById("cafe-feed");
        if (posts.length === 0) {
            feed.innerHTML = `
                <div class="empty-feed">
                    <i class="bi bi-camera" style="font-size:2rem"></i>
                    <p class="mt-2">No posts yet for this cafe.</p>
                    <p class="small">Be the first to share your experience!</p>
                </div>`;
            return;
        }
        posts.forEach(post => renderPost(post, "cafe-feed"));
    })
    .catch(err => console.error("Error loading cafe posts:", err));

// Load reviews from localStorage
const reviewContainer = document.getElementById("cafe-reviews");
const allReviews = JSON.parse(localStorage.getItem("shopReviews")) || [];
const cafeReviews = allReviews.filter(r => r.shop === cafeName);

if (cafeReviews.length === 0) {
    reviewContainer.innerHTML = "<p class='text-muted small'>No reviews yet.</p>";
} else {
    reviewContainer.innerHTML = cafeReviews.slice(0, 3).map(r => `
        <div class="mb-2 pb-2" style="border-bottom:1px solid var(--border)">
            <div style="font-size:0.85rem;font-weight:600">${r.username}</div>
            <div style="color:var(--caramel);font-size:0.8rem">
                ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
            </div>
            <div style="font-size:0.8rem;color:var(--muted)">${r.text}</div>
        </div>
    `).join("");
}