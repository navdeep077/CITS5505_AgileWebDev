/*
 * cafe-feed.js
 * Handles the cafe-specific feed page (/cafe/<cafe_name>).
 * Loads and renders:
 * - All social posts tagged with this cafe from the database API
 * - Recent reviews for this cafe from the database API
 * Uses cafeName set as a global variable in the cafe-feed.html template.
 */

// ── Load Cafe Posts ───────────────────────────────────────────────────────────
// Fetches all posts tagged with this cafe from the backend API.
// Renders each post into the cafe feed container using renderPost() from social.js.
// Shows an empty state message if no posts exist for this cafe yet.
fetch(`/api/posts/cafe/${encodeURIComponent(cafeName)}`)
    .then(res => res.json())
    .then(posts => {
        const feed = document.getElementById("cafe-feed");
        if (posts.length === 0) {
            // Show an empty state with an invitation to post
            feed.innerHTML = `
                <div class="empty-feed">
                    <i class="bi bi-camera" style="font-size:2rem"></i>
                    <p class="mt-2">No posts yet for this cafe.</p>
                    <p class="small">Be the first to share your experience!</p>
                </div>`;
            return;
        }
        // Render each post into the cafe feed container
        posts.forEach(post => renderPost(post, "cafe-feed"));
    })
    .catch(err => console.error("Error loading cafe posts:", err));

// ── Load Cafe Reviews ─────────────────────────────────────────────────────────
// Fetches up to 3 recent reviews for this cafe from localStorage.
// Note: reviews were migrated to the database; this reads legacy data only.
// Shows an empty state message if no reviews exist yet.
// Load reviews from database API
const reviewContainer = document.getElementById("cafe-reviews");

fetch(`/api/reviews/shop/${encodeURIComponent(cafeName)}`)
    .then(res => res.json())
    .then(reviews => {
        if (reviews.length === 0) {
            reviewContainer.innerHTML = "<p class='text-muted small'>No reviews yet.</p>";
            return;
        }
        reviewContainer.innerHTML = reviews.slice(0, 3).map(r => `
            <div class="mb-2 pb-2" style="border-bottom:1px solid rgba(196,122,43,0.15)">
                <div style="font-size:0.85rem;font-weight:600">${r.username}</div>
                <div style="color:var(--caramel);font-size:0.8rem">
                    ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                </div>
                <div style="font-size:0.8rem;color:var(--muted)">${r.text}</div>
            </div>
        `).join("");
    })
    .catch(err => console.error("Error loading cafe reviews:", err));