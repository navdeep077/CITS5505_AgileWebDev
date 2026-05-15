/*
  Post deletion utilities for BrewConnect.

  Handles:
  - Deleting posts through the backend API
  - Refreshing feed/profile views after deletion
*/

// Deletes a post after confirmation and refreshes related feeds
async function deletePost(postTime) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    // Extract the database post ID and send delete request
    if (postTime.startsWith('post-')) {
        const postId = postTime.replace('post-', '');
        const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Could not delete post');
            return;
        }
    }

    // Refresh either the profile feed or global feed after deletion
    if (document.getElementById('profile-feed') && typeof loadProfilePosts === 'function') {
        await loadProfilePosts();
    } else if (typeof loadPosts === 'function') {
        await loadPosts();
    }
}

// Wrapper function used for deleting posts from the profile page
async function deleteProfilePost(postTime) {
    await deletePost(postTime);
}
