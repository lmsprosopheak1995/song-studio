self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => { /* ឆ្លងកាត់ទៅបណ្តាញ ជានិច្ច — មិន cache */ });
