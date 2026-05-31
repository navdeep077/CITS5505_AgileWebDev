// search.js
// Handles the navbar search bar — searches users and cafes

const searchInput = document.getElementById('navbar-search-input');
const searchResults = document.getElementById('navbar-search-results');

if (searchInput) {
    let searchTimeout;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (!query) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }

        // Debounce — wait 300ms after user stops typing
        searchTimeout = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => renderSearchResults(data))
                .catch(err => console.error('Search error:', err));
        }, 300);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

function renderSearchResults(data) {
    if (!searchResults) return;

    const users = data.users || [];
    const cafes = data.cafes || [];

    if (users.length === 0 && cafes.length === 0) {
        searchResults.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:0.85rem;">No results found</div>';
        searchResults.classList.add('active');
        return;
    }

    let html = '';

    // Users section
    if (users.length > 0) {
        html += '<div style="padding:8px 14px;font-size:0.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;">Users</div>';
        users.forEach(u => {
            const initial = u.username.charAt(0).toUpperCase();
            const avatarHtml = u.avatar
                ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;">`
                : initial;

            html += `
                <a href="/user/${u.username}" class="search-result-item">
                    <div class="search-result-avatar">${avatarHtml}</div>
                    <div>
                        <div style="font-weight:600;font-size:0.9rem;">${u.username}</div>
                        <div style="font-size:0.75rem;color:var(--muted);">${u.followers} followers</div>
                    </div>
                </a>
            `;
        });
    }

    // Cafes section
    if (cafes.length > 0) {
        html += '<div style="padding:8px 14px;font-size:0.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;">Cafes</div>';
        cafes.forEach(c => {
            html += `
                <a href="/cafe/${encodeURIComponent(c.name)}" class="search-result-item">
                    <div class="search-result-avatar">☕</div>
                    <div>
                        <div style="font-weight:600;font-size:0.9rem;">${c.name}</div>
                        <div style="font-size:0.75rem;color:var(--muted);">★ ${c.rating} · ${c.location}</div>
                    </div>
                </a>
            `;
        });
    }

    searchResults.innerHTML = html;
    searchResults.classList.add('active');
}