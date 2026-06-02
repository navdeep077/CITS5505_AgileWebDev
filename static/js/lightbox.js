/*
 * lightbox.js
 * Full screen image viewer when clicking any post image
 */

// Create lightbox HTML once
const lightboxHtml = `
<div id="lightbox-overlay" style="
    display:none;
    position:fixed;
    top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.92);
    z-index:9999;
    align-items:center;
    justify-content:center;
    cursor:zoom-out;
">
    <button id="lightbox-close" style="
        position:absolute;
        top:20px;right:24px;
        background:none;
        border:none;
        color:white;
        font-size:2rem;
        cursor:pointer;
        line-height:1;
        z-index:10000;
    ">×</button>
    <button id="lightbox-prev" style="
        position:absolute;
        left:20px;
        background:rgba(255,255,255,0.1);
        border:none;
        color:white;
        font-size:1.5rem;
        cursor:pointer;
        padding:12px 16px;
        border-radius:50%;
        transition:background 0.2s;
    ">‹</button>
    <img id="lightbox-img" style="
        max-width:90vw;
        max-height:90vh;
        object-fit:contain;
        border-radius:8px;
        box-shadow:0 8px 48px rgba(0,0,0,0.6);
        cursor:default;
    ">
    <button id="lightbox-next" style="
        position:absolute;
        right:20px;
        background:rgba(255,255,255,0.1);
        border:none;
        color:white;
        font-size:1.5rem;
        cursor:pointer;
        padding:12px 16px;
        border-radius:50%;
        transition:background 0.2s;
    ">›</button>
    <div id="lightbox-caption" style="
        position:absolute;
        bottom:24px;
        left:50%;
        transform:translateX(-50%);
        color:rgba(255,255,255,0.7);
        font-size:0.85rem;
        text-align:center;
        max-width:600px;
    "></div>
</div>
`;

document.body.insertAdjacentHTML('beforeend', lightboxHtml);

let lightboxImages = [];
let lightboxIndex  = 0;

function openLightbox(src, caption, allImages) {
    lightboxImages = allImages || [src];
    lightboxIndex  = lightboxImages.indexOf(src);
    if (lightboxIndex === -1) lightboxIndex = 0;

    showLightboxImage();
    document.getElementById('lightbox-overlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Show/hide prev next based on image count
    document.getElementById('lightbox-prev').style.display =
        lightboxImages.length > 1 ? 'block' : 'none';
    document.getElementById('lightbox-next').style.display =
        lightboxImages.length > 1 ? 'block' : 'none';
}

function showLightboxImage() {
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    img.src = lightboxImages[lightboxIndex];
    cap.textContent = lightboxImages.length > 1
        ? `${lightboxIndex + 1} / ${lightboxImages.length}`
        : '';
}

function closeLightbox() {
    document.getElementById('lightbox-overlay').style.display = 'none';
    document.body.style.overflow = '';
}

// Wire events
document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeLightbox();
});

document.getElementById('lightbox-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    showLightboxImage();
});

document.getElementById('lightbox-next').addEventListener('click', (e) => {
    e.stopPropagation();
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    showLightboxImage();
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay.style.display === 'none') return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowRight')  {
        lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
        showLightboxImage();
    }
    if (e.key === 'ArrowLeft') {
        lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
        showLightboxImage();
    }
});

// Make all post images open lightbox
// Called after posts are rendered
function initLightbox() {
    document.querySelectorAll('.post-image-wrapper img').forEach(img => {
        if (img.dataset.lightboxInit) return;
        img.dataset.lightboxInit = 'true';
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            // Collect all post images on page
            const allImgs = Array.from(
                document.querySelectorAll('.post-image-wrapper img')
            ).map(i => i.src);
            openLightbox(img.src, '', allImgs);
        });
    });
}

// Run after DOM loads and after new posts are added
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initLightbox, 1000);
});

// Export for social.js to call after rendering posts
window.initLightbox = initLightbox;