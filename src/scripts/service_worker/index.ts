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

    let matches: RegExpMatchArray | null

    if (matches = url.pathname.match(/^\/([a-f0-9]+)(\/.*)?$/)) {
      const scope = matches[1]

      if (url.pathname === `/${scope}/manifest.json`) {
        event.respondWith((async () => {
          const [hash, href] = splitAndJoin(url.hash.slice(1), "@")

          const manifest = await fetch(new URL("/manifest.json", href)).then(r => r.json())

          manifest.scope = `/${scope}`

          manifest.start_url = `/${scope}#${hash}@${href}`

          const headers = { "Content-Type": "application/json" }

          return new Response(JSON.stringify(manifest), {
            status: 200,
            statusText: "OK",
            headers
          })
        })())

        return
      }

      const request0 = new Request(event.request, { mode: "same-origin" })
      const request1 = new Request("/", request0)

      const response = cache.handle(request1)

      if (response == null)
        return

      event.respondWith(response)
      return
    }

    const response = cache.handle(event.request)

    if (response == null)
      return

    event.respondWith(response)
  })
}