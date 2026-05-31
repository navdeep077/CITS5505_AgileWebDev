// hashtag.js
// Loads and renders posts for a specific hashtag page

document.addEventListener('DOMContentLoaded', () => {

    const feed = document.getElementById('hashtag-feed');

    // Show skeleton
    feed.innerHTML = `
        <div class="skeleton-post">
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-line" style="width:40%;"></div>
                </div>
            </div>
            <div class="skeleton skeleton-image"></div>
        </div>
    `;

    fetch(`/api/posts/hashtag/${encodeURIComponent(hashTag)}`)
        .then(res => res.json())
        .then(posts => {
            if (posts.length === 0) {
                feed.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:var(--muted);">
                        <i class="bi bi-hash" style="font-size:2.5rem;display:block;margin-bottom:1rem;"></i>
                        <h4>No posts with #${hashTag} yet</h4>
                        <p>Be the first to post with this hashtag</p>
                    </div>
                `;
                return;
            }

            feed.innerHTML = '';
            posts.forEach(post => renderPost(post, 'hashtag-feed'));
        })
        .catch(err => console.error('Hashtag feed error:', err));

    // Wire modal close
    document.getElementById('close-modal')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
    document.querySelector('.modal-overlay')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
});