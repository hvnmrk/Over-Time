const CACHE_NAME =
    'overtime-static-v1';


const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];



// INSTALL

let deferredInstallPrompt =
    null;


window.addEventListener(
    'beforeinstallprompt',
    event => {

        event.preventDefault();


        deferredInstallPrompt =
            event;


        if (
            $('installAppButton')
        ) {

            $('installAppButton').hidden =
                false;

        }


        if (
            $('settingsInstallButton')
        ) {

            $('settingsInstallButton').hidden =
                false;

        }

    }
);


async function installApp() {

    if (
        !deferredInstallPrompt
    ) {

        toast(
            'Install is not available yet.'
        );

        return;

    }


    deferredInstallPrompt.prompt();


    const {
        outcome
    } =
        await deferredInstallPrompt
            .userChoice;


    console.log(
        'Install result:',
        outcome
    );


    deferredInstallPrompt =
        null;


    if (
        $('installAppButton')
    ) {

        $('installAppButton').hidden =
            true;

    }


    if (
        $('settingsInstallButton')
    ) {

        $('settingsInstallButton').hidden =
            true;

    }

}
$('installAppButton')
    ?.addEventListener(
        'click',
        installApp
    );


$('settingsInstallButton')
    ?.addEventListener(
        'click',
        installApp
    );


// ACTIVATE

self.addEventListener(
    'activate',
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(
                    keys => {

                        return Promise.all(

                            keys
                                .filter(
                                    key =>
                                        key !==
                                        CACHE_NAME
                                )
                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )

                        );

                    }
                )

        );


        self.clients.claim();

    }
);



// FETCH


self.addEventListener(
    'fetch',
    event => {

        const request =
            event.request;


        if (
            request.method !==
            'GET'
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        event.respondWith(

            fetch(
                request
            )

                .then(
                    response => {

                        if (
                            response &&
                            response.ok
                        ) {

                            const copy =
                                response.clone();


                            caches
                                .open(
                                    CACHE_NAME
                                )
                                .then(
                                    cache => {

                                        cache.put(
                                            request,
                                            copy
                                        );

                                    }
                                );

                        }


                        return response;

                    }
                )

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


                        return Response.error();

                    }
                )

        );

    }
);

if (
    'serviceWorker' in navigator
) {

    window.addEventListener(
        'load',
        async () => {

            try {

                const registration =
                    await navigator
                        .serviceWorker
                        .register(
                            '/service-worker.js'
                        );


                console.log(
                    'Service Worker registered:',
                    registration.scope
                );

            } catch (error) {

                console.error(
                    'Service Worker registration failed:',
                    error
                );

            }

        }
    );

}