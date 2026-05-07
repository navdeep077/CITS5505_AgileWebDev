async function deletePost(postTime) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    if (postTime.startsWith('post-')) {
        const postId = postTime.replace('post-', '');
        const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Could not delete post');
            return;
        }
    }

    if (document.getElementById('profile-feed') && typeof loadProfilePosts === 'function') {
        await loadProfilePosts();
    } else if (typeof loadPosts === 'function') {
        await loadPosts();
    }
}

async function deleteProfilePost(postTime) {
    await deletePost(postTime);
}
