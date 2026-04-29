// ── NAVBAR AVATAR ─────────────────────────
(function () {
    const currentUser = window.currentUser || "";
    if (!currentUser) return;

    const avatar = localStorage.getItem(`profileAvatar:${currentUser}`);
    const avatarSlot = document.querySelector('[data-navbar-avatar]');

    function updateNavbarAvatar(avatarData) {
        if (!avatarSlot) return;
        if (avatarData) {
            avatarSlot.innerHTML = `<img src="${avatarData}" alt="${currentUser} profile photo">`;
        } else {
            avatarSlot.innerHTML = '<i class="bi bi-person-circle"></i>';
        }
    }

    updateNavbarAvatar(avatar);
    window.updateNavbarAvatar = updateNavbarAvatar;
})();