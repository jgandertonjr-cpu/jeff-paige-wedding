// Offline support for the landscaping hours page only.
// Registered with scope "/landscaping-hours", so it never touches the wedding pages.
var CACHE = 'landscaping-hours-v1';
var PAGE = '/landscaping-hours.html';

// Store a clean copy (a redirected response can't be served for a page load)
function store(key, res){
  if(!(res.ok || res.type === 'opaque')) return Promise.resolve();
  var p = res.redirected
    ? res.blob().then(function(b){ return new Response(b, {status:200, headers:res.headers}); })
    : Promise.resolve(res);
  return p.then(function(r){ return caches.open(CACHE).then(function(c){ return c.put(key, r); }); });
}

self.addEventListener('install', function(e){
  e.waitUntil(
    fetch(PAGE, {cache:'no-cache'}).then(function(res){ return store(PAGE, res); })
      .catch(function(){}).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf('landscaping-hours-') === 0 && k !== CACHE; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Network first so updates show up; fall back to the saved copy when there's
// no signal, or after 4 seconds of a weak one.
function networkFirst(req, key){
  return new Promise(function(resolve){
    var done = false;
    function finish(r){ if(!done && r){ done = true; resolve(r); } }
    var timer = setTimeout(function(){ caches.match(key).then(finish); }, 4000);
    fetch(req).then(function(res){
      clearTimeout(timer);
      store(key, res.clone()).catch(function(){});
      finish(res);
    }).catch(function(){
      clearTimeout(timer);
      caches.match(key).then(function(r){ finish(r || Response.error()); });
    });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  if(req.mode === 'navigate'){
    e.respondWith(networkFirst(req, PAGE));
  }else if(/^fonts\.(googleapis|gstatic)\.com$/.test(new URL(req.url).hostname)){
    e.respondWith(networkFirst(req, req));
  }
});
