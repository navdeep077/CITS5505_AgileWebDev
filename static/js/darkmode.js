// darkmode.js
// Handles dark mode toggle and persists preference in localStorage

const DARK_KEY = 'coffee_dark_mode';

function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    // Update all toggle button icons
    document.querySelectorAll('#dark-mode-toggle, #dark-mode-toggle-mobile').forEach(btn => {
        btn.innerHTML = dark
            ? '<i class="bi bi-sun"></i>'
            : '<i class="bi bi-moon"></i>';
    });
}

function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newDark = !isDark;
    localStorage.setItem(DARK_KEY, newDark ? '1' : '0');
    applyTheme(newDark);
    showToast(newDark ? 'Dark mode on ☕' : 'Light mode on ☀️', 'info');
}

// Apply saved preference on page load
const savedDark = localStorage.getItem(DARK_KEY) === '1';
applyTheme(savedDark);

// Wire up buttons after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#dark-mode-toggle, #dark-mode-toggle-mobile').forEach(btn => {
        btn.addEventListener('click', toggleDarkMode);
    });
});