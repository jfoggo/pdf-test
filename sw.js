var CACHE_NAME = 'pdf-merger-cache';
var urlsToCache = [
	'/pdf-test/',
	'/pdf-test/index.html',
	'/pdf-test/logo.png',
	'/pdf-test/main.css',
	'/pdf-test/main.js',
	'/pdf-test/manifest.json',
	'/pdf-test/sw.js',
	// TODO: include Bootstrap, Jquery and other libraries as scripts
];

// Install Event
self.addEventListener('install', function(event) {
	console.log("[SW] install event: ",event);
	// Perform install steps
	event.waitUntil(
		caches.open(CACHE_NAME).then(
			function(cache) {
				console.log('[SW] Opened cache: ',cache);
				return cache.addAll(urlsToCache);
			},
			function (...args){
				console.log("[SW] Something failed (install): ",args);
			}
		);
	);
});

// Fetch Event
self.addEventListener('fetch', function(event) {
	console.log("[SW] fetch event: ",event);
	event.respondWith(
		caches.match(event.request).then(
			function(response) {
				// Cache hit - return response
				if (response) return response;
				else {
					fetch(event.request).then(
						// Try to cache new requests directly 
						function(response) {
							// Check if we received a valid response
							if(!response || response.status !== 200 || response.type !== 'basic') return response;
							// IMPORTANT: Clone the response. A response is a stream
							// and because we want the browser to consume the response
							// as well as the cache consuming the response, we need
							// to clone it so we have two streams.
							var responseToCache = response.clone();
							caches.open(CACHE_NAME).then(
								function(cache) {
									cache.put(event.request, responseToCache);
								}
							);
							return response;
						}

					);
				}
			},
			function (...args){
				console.log("[SW] Something failed (fetch): ",args);
			}
		)
	);
});

