// ── NAVBAR AVATAR ─────────────────────────
(function () {
    const currentUser = window.currentUser || "";
    if (!currentUser) return;

    const avatarSlot = document.querySelector('[data-navbar-avatar]');

    function updateNavbarAvatar(avatarData) {
        if (!avatarSlot) return;
        if (avatarData) {
            avatarSlot.innerHTML = `<img src="${avatarData}" alt="${currentUser} profile photo">`;
        } else {
            avatarSlot.innerHTML = '<i class="bi bi-person-circle"></i>';
        }
    }

    async function loadNavbarAvatar() {
        const response = await fetch("/api/avatar");
        if (!response.ok) return;
        const data = await response.json();
        updateNavbarAvatar(data.avatar || "");
    }

    window.updateNavbarAvatar = updateNavbarAvatar;
    loadNavbarAvatar();
})();
