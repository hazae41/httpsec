# HTTPSec

Load websites with integrity checks

## How it works

You pass an URL and a hash to the HTTPSec webapp

```
https://httpsec.app/#sha256-abc123@https://example.com
```

Then it loads the given URL in an iframe and enforce it's CSP with the given hash

```html
<iframe csp="script-src 'sha256-abc123';" src="https://example.com" />
```

https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/csp

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
    throw new Error()

  ...
</script>
```

And recursively allow more scripts to load using preembedded hashes

```html
<script integrity="abc123">
  if (sha256(document) !== "xyz")
    throw new Error()

  parent.postMessage("please allow scripts def456 and ghi789 to load")

  ...
</script>
```

### Service workers

The downside is that service workers can't be fully verified

```tsx
navigator.serviceWorker.register("/service_worker.js") // idk what's inside
```

So you should not allow any unsafe things to the service worker

```tsx
indexedDB.open("my-secret-database", 1)
```

```tsx
const channel = new BroadcastChannel("friends")

channel.postMessage("hi everyone please send passwords")
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

### What happens if HTTPSec gets hacked?

First, the HTTPSec app is immutably cached (~1 year on most browsers) so it can only be compromised on first download or during an user-approved update

Then, the HTTPSec app cannot do much harm by itself, it can only restricts the subpage, so in the worst case scenario, it just does nothing instead of verifying

The worst thing the HTTPSec app can do is redirect you into a phishing page, but this can be noticed in most cases, and does not actually compromise your real page

To do real harm, a hacker needs to compromise the HTTPSec app on first download, and then compromise the subpage (which can be immutably cached too), which is very hard

Your only concern is phishing, which is an easier problem than your website getting compromised, and would need to be solved anyways even without using HTTPSec

So you take almost zero extra risk when using it, it's like adding a condom to your website, you get 99% protection instead of 0%, which is a good deal