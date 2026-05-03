// ── DELETE POST ─────────────────────────
function deletePost(postTime) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    posts = posts.filter(p => p.time !== postTime);
    localStorage.setItem('posts', JSON.stringify(posts));

    if (document.getElementById("profile-feed")) loadProfilePosts();
    else loadPosts();
}

// ── DELETE COMMENT ─────────────────────────
function deleteComment(postTime, index) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    posts = posts.map(p => {
        if (p.time === postTime) p.comments.splice(index, 1);
        return p;
    });
    localStorage.setItem('posts', JSON.stringify(posts));

    if (document.getElementById("profile-feed")) loadProfilePosts();
    else loadPosts();
}

// ── DELETE PROFILE POST ─────────────────────────
function deleteProfilePost(postTime) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    posts = posts.filter(p => p.time !== postTime);
    localStorage.setItem('posts', JSON.stringify(posts));
    loadProfilePosts();
}

// ── DELETE PROFILE COMMENT ─────────────────────────
function deleteProfileComment(postTime, index) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    posts = posts.map(p => {
        if (p.time === postTime) p.comments.splice(index, 1);
        return p;
    });
    localStorage.setItem('posts', JSON.stringify(posts));
    loadProfilePosts();
}