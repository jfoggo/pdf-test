var CACHE_NAME = 'pdf-merger-cache';
var urlsToCache = [
	// PAGE RESOURCES
	'/pdf-test/',
	'/pdf-test/index.html',
	'/pdf-test/logo.png',
	'/pdf-test/main.css',
	'/pdf-test/main.js',
	'/pdf-test/manifest.json',
	'/pdf-test/sw.js',
	// JQUERY + JQUERY UI RESOURCES
	'https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js',
	'https://code.jquery.com/ui/1.12.1/jquery-ui.js',
	// BOOTSTRAP RESOURCES
	'https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css',
	'https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js',
	'https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/fonts/glyphicons-halflings-regular.woff',
	'https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/fonts/glyphicons-halflings-regular.woff2',
	'https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/fonts/glyphicons-halflings-regular.ttf',
	// PDFjs RESOURCE
	'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.0.943/pdf.min.js'
	// jsPDF RESOURCE
	'https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.3.3/jspdf.min.js',
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
		)
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

