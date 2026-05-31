/*
 * sw.js — Service Worker for Coffee Social Hub PWA
 * Caches static assets for offline use
 */

const CACHE_NAME = 'coffee-hub-v1';
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/static/css/style.css',
    '/static/css/theme.css',
    '/static/css/week3.css',
    '/static/css/week5.css',
    '/static/js/darkmode.js',
    '/static/js/toast.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
];

// Install — cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch — serve from cache, fallback to network, fallback to offline
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).catch(() => {
                // If network fails and it is a page request show offline page
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/offline');
                }
            });
        })
    );
});