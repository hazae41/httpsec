import { Immutable } from "@hazae41/immutable"

declare const self: ServiceWorkerGlobalScope

self.addEventListener("install", () => {
  /**
   * Auto-activate as the update was already accepted
   */
  self.skipWaiting()
})

/**
 * Declare global template
 */
declare const FILES: [string, string][]

/**
 * Only cache on production
 */
if (process.env.NODE_ENV === "production") {
  const cache = new Immutable.Cache(new Map(FILES))

  self.addEventListener("activate", (event) => {
    /**
     * Uncache previous version
     */
    event.waitUntil(cache.uncache())

    /**
     * Precache current version
     */
    event.waitUntil(cache.precache())
  })

  /**
   * Respond with cache
   */
  self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url)

    let matches: RegExpMatchArray | null

    if (matches = url.pathname.match(/^\/([a-f0-9]+)(\/.*)?$/)) {
      const request0 = new Request(event.request, { mode: "same-origin" })
      const request1 = new Request("/", request0)

      const response = cache.handle(request1)

      if (response == null)
        return

      event.respondWith(response)
      return
    }

    if (url.pathname === "/manifest.json") {
      event.respondWith((async () => {
        const href = url.hash.slice(1)

        const manifest = await fetch(new URL("/manifest.json", href)).then(r => r.json())

        const scope = new URL(manifest.scope, href)
        const start_url = new URL(manifest.start_url, href)

        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(scope.href)))
        const base16 = digest.reduce((s, x) => s + x.toString(16).padStart(2, "0"), "").slice(0, 8)

        manifest.scope = `/${base16}`
        manifest.start_url = `/${base16}#@${start_url.href}`

        const headers = { "Content-Type": "application/json" }

        return new Response(JSON.stringify(manifest), {
          status: 200,
          statusText: "OK",
          headers
        })
      })())

      return
    }

    const response = cache.handle(event.request)

    if (response == null)
      return

    event.respondWith(response)
  })
}