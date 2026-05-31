// profile-edit.js
// Handles editing bio, website and location on the profile page

function showEditBio() {
    document.getElementById('bio-display').style.display = 'none';
    document.getElementById('bio-edit').style.display = 'block';
}

function cancelEditBio() {
    document.getElementById('bio-display').style.display = 'block';
    document.getElementById('bio-edit').style.display = 'none';
}

function saveEditBio() {
    const bio      = document.getElementById('bio-input').value.trim();
    const website  = document.getElementById('website-input').value.trim();
    const location = document.getElementById('location-input').value.trim();

    fetch('/api/profile/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, website, location })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('bio-text').textContent = data.bio || 'No bio yet';

        const websiteEl = document.getElementById('website-display');
        const locationEl = document.getElementById('location-display');
        if (websiteEl) websiteEl.textContent = data.website || '';
        if (locationEl) locationEl.textContent = data.location || '';

        cancelEditBio();
        showToast('Profile updated ✓', 'success');
    })
    .catch(err => console.error('Edit bio error:', err));
}