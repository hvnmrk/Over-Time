const CACHE_NAME = 'overtime-static-v4';

const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];


// =====================================================
// INSTALL
// =====================================================

self.addEventListener(
    'install',
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(
                        STATIC_FILES
                    );

                })

        );


        self.skipWaiting();

    }
);


// =====================================================
// ACTIVATE
// =====================================================

self.addEventListener(
    'activate',
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(keys => {

                    return Promise.all(

                        keys
                            .filter(
                                key =>
                                    key !== CACHE_NAME
                            )
                            .map(
                                key =>
                                    caches.delete(key)
                            )

                    );

                })

        );


        self.clients.claim();

    }
);


// =====================================================
// FETCH
// =====================================================

self.addEventListener(
    'fetch',
    event => {

        const request =
            event.request;


        if (
            request.method !== 'GET'
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        // DO NOT cache Supabase,
        // Lucide, CDN, or other external requests.
        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        event.respondWith(

            fetch(request)

                .then(response => {

                    if (
                        response &&
                        response.ok
                    ) {

                        const copy =
                            response.clone();


                        caches
                            .open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    copy
                                );

                            });

                    }


                    return response;

                })

                .catch(
                    async () => {

                        const cached =
                            await caches.match(
                                request
                            );


                        if (cached) {

                            return cached;

                        }


                        if (
                            request.mode ===
                            'navigate'
                        ) {

                            return caches.match(
                                '/index.html'
                            );

                        }


                        return new Response(
                            'Offline',
                            {
                                status: 503,
                                statusText: 'Offline'
                            }
                        );

                    }
                )

        );

    }
);