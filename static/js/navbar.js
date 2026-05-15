/*
  Navbar avatar management.

  Handles:
  - Loading the current user's avatar
  - Updating navbar avatar display dynamically
*/

// Self-executing function to isolate navbar avatar logic
(function () {
    const currentUser = window.currentUser || "";
    if (!currentUser) return;

    const avatarSlot = document.querySelector('[data-navbar-avatar]');

    // Updates the navbar avatar image or fallback initials dynamically
    function updateNavbarAvatar(avatarData) {
        if (!avatarSlot) return;
        if (avatarData) {
            avatarSlot.innerHTML = `<img src="${avatarData}" alt="${currentUser} profile photo">`;
        } else {
            avatarSlot.innerHTML = '<i class="bi bi-person-circle"></i>';
        }
    }

    // Fetches the current user's avatar from the backend API
    async function loadNavbarAvatar() {
        const response = await fetch("/api/avatar");
        if (!response.ok) return;
        const data = await response.json();
        updateNavbarAvatar(data.avatar || "");
    }

    // Expose avatar update function globally for reuse across pages
    window.updateNavbarAvatar = updateNavbarAvatar;
    loadNavbarAvatar();
})();
