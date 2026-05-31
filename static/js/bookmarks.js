// bookmarks.js
// Loads and renders bookmarked posts for the current user

function loadBookmarks() {
    fetch('/api/bookmarks')
        .then(res => res.json())
        .then(posts => {
            const feed = document.getElementById('bookmarks-feed');

            if (posts.length === 0) {
                feed.innerHTML = `
                    <div class="bookmarks-empty">
                        <i class="bi bi-bookmark"></i>
                        <h4>No saved posts yet</h4>
                        <p>Tap the bookmark icon on any post to save it here</p>
                    </div>
                `;
                return;
            }

            feed.innerHTML = '';
            posts.forEach(post => renderPost(post, 'bookmarks-feed'));
        })
        .catch(err => console.error('Bookmarks error:', err));
}

document.addEventListener('DOMContentLoaded', () => {
    loadBookmarks();

    document.getElementById('close-modal')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
    document.querySelector('.modal-overlay')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('hidden');
    });
});
