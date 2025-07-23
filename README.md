# HTTPSec

Load websites with integrity checks

### Work in prograss 

Do not use

## How it works

You pass an URL and a hash to the HTTPSec webapp

```
https://httpsec.app/#/some-base64url-sha256-hash/#/https://example.com
```

Then it loads the given URL in an iframe and enforce it's CSP with the given hash

```html
<iframe csp="script-src 'sha256-abc123';" src="https://example.com" />
```

The given hash is in fact the hash of the first script tag to load in the HTML page

```html
<script integrity="abc123">
  ...
</script>
```

That script will verify the HTML page against a preembedded hash

```html
<script integrity="abc123">
  if (sha256(document) !== "xyz")
    throw ...
</script>
```

And recursively allow more scripts to load using preembedded hashes

```html
<script integrity="abc123">
  parent.postMessage("please allow def456 and ghi789 to load")
</script>
```

The downside is that service workers can't be fully verified

```html
<script integrity="abc123">
  navigator.serviceWorker.register("/service_worker.js") // idk what's inside
</script>
```

So you should not allow any unsafe things to the service worker

```tsx
localStorage.setItem("password", "abc123")
```

Or you can sandbox the service worker in another iframe with another origin

```
httpsec <embeds> app <embeds> app2 <runs> service_worker
```

But service worker can still be useful to cache pages that will still be verified

```tsx
addEventListener("fetch", () => {
  return <html>
    <title>
      Some other page
    </title>
    <script integrity="xyz987">
      i am verified too
    </script>
  </html>
})
```