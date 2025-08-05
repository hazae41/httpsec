import { splitAndJoin } from "@/libs/split"
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

    if (url.pathname.startsWith("/x/")) {
      return
    }

    if (url.pathname === "/manifest.json") {
      event.respondWith((async () => {
        const [hash, href] = splitAndJoin(url.hash.slice(1), "@")

        const manifest = await fetch(new URL("/manifest.json", href)).then(r => r.json())

        manifest.scope = `${location.origin}/x/${crypto.randomUUID()}`

        manifest.start_url = `${location.origin}/x/${crypto.randomUUID()}/#${hash}@${href}`

        const headers = { "Content-Type": "application/json" }

        return new Response(JSON.stringify(manifest), {
          status: 200,
          statusText: "OK",
          headers
        })
      })())
    }

    return cache.handle(event)
  })
}
