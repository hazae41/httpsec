import { FrameWithCsp } from "@/libs/frame";
import { useHash } from "@/libs/hash";
import { Nullable } from "@/libs/nullable";
import { splitAndJoin } from "@/libs/split";
import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequestInit } from "@hazae41/jsonrpc";
import Head from "next/head";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

export default function Page() {
  const fragment = useHash()

  if (!fragment)
    return <Home />

  return <Framer fragment={fragment} />
}

export function Home() {
  const [href, setHref] = useState("")
  const [hash, setHash] = useState("")

  const onHrefChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setHref(event.target.value)
  }, [])

  const onHashChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setHash(event.target.value)
  }, [])

  const fragment = useMemo(() => {
    if (!href)
      return
    if (!hash)
      return
    return `#${hash}@${href}`
  }, [href, hash])

  return <div className="">
    <div className="p-4 m-auto w-full max-w-[800px] h-screen flex flex-col">
      <div className="h-4 grow" />
      <h1 className="text-3xl font-medium">
        Welcome to HTTPSec
      </h1>
      <div className="h-1" />
      <div className="text-default-contrast">
        Load websites with strict integrity
      </div>
      <div className="h-4" />
      <h2 className="font-medium">
        Enter a compatible website
      </h2>
      <div className="h-2" />
      <input className="w-full po-2 rounded-full bg-default-double-contrast outline-none"
        type="text"
        value={href}
        onChange={onHrefChange}
        placeholder="https://example.com/path/to/page" />
      <div className="h-4" />
      <h2 className="font-medium">
        Enter the hash of the main script
      </h2>
      <div className="h-2" />
      <input className="w-full po-2 rounded-full bg-default-double-contrast outline-none"
        type="text"
        value={hash}
        onChange={onHashChange}
        placeholder="LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=" />
      <div className="h-4" />
      <a className="w-full po-2 rounded-full text-opposite bg-opposite text-center aria-disabled:opacity-50"
        aria-disabled={!fragment}
        href={fragment}>
        Let's go
      </a>
      <div className="h-4 md:grow" />
    </div>
  </div>
}

export function Framer(props: {
  readonly fragment: string
}) {
  const { fragment } = props

  const [hash, href] = useMemo(() => {
    return splitAndJoin(fragment, "@")
  }, [fragment])

  const origin = useMemo(() => {
    return new URL(href).origin
  }, [href])

  const [frame, setFrame] = useState<Nullable<HTMLIFrameElement>>(null)

  const policy0 = useMemo(() => {
    const length = atob(hash).length * 8

    if (length === 256)
      return `script-src 'sha256-${hash}';`
    if (length === 384)
      return `script-src 'sha384-${hash}';`
    if (length === 512)
      return `script-src 'sha512-${hash}';`

    return `script-src 'none';`
  }, [hash])

  const [policy, setPolicy] = useState(policy0)

  useEffect(() => {
    setPolicy(policy0)
  }, [policy0])

  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (frame == null)
      return
    const f = () => setHidden(true)

    frame.addEventListener("load", f)
    return () => frame.removeEventListener("load", f)
  }, [frame])

  const [manifest, setManifest] = useState<string>()

  const routeOrThrow = useCallback(async (event: MessageEvent<RpcRequestInit>) => {
    const request = event.data

    if (request.method === "knock_knock")
      return "httpsec"

    if (request.method === "csp_get")
      return policy

    if (request.method === "csp_set") {
      const [policy] = request.params as [string]
      setPolicy(policy)
      return
    }

    if (request.method === "frame_show") {
      console.log("showing frame")
      setHidden(false)
      return
    }

    if (request.method === "frame_hide") {
      setHidden(true)
      return
    }

    if (request.method === "href_set") {
      const [href] = request.params as [string]
      location.hash = `#${hash}@${href}`
      return
    }

    if (request.method === "hash_set") {
      const [hash] = request.params as [string]
      location.hash = `#${hash}@${href}`
      return
    }

    if (request.method === "manifest_set") {
      const [endpoint] = request.params as [string]

      const manifest = await fetch(new URL(endpoint, href)).then(res => res.json())

      const origin = new URL(href).origin

      const scope = new URL(manifest.scope, href)
      const start_url = new URL(manifest.start_url, href)

      if (scope.origin !== origin)
        throw new Error("Invalid origin")
      if (start_url.origin !== origin)
        throw new Error("Invalid origin")

      const nonce = crypto.randomUUID().slice(0, 8)

      manifest.scope = new URL(`/x/${nonce}`, location.href).href
      manifest.start_url = new URL(`/x/${nonce}#${hash}@${start_url.href}`, location.href).href

      for (const icon of (manifest.icons || []))
        icon.src = new URL(icon.src, href).href

      setManifest("data:application/json;base64," + btoa(JSON.stringify(manifest)))

      return
    }

    throw new RpcMethodNotFoundError()
  }, [hash, href, policy])

  const onMessage = useCallback(async (event: MessageEvent<RpcRequestInit>) => {
    if (event.origin !== origin)
      return
    const request = event.data

    try {
      const response = new RpcOk(request.id, await routeOrThrow(event))
      event.source?.postMessage(response, { targetOrigin: event.origin })
    } catch (e: unknown) {
      const response = new RpcErr(request.id, RpcError.rewrap(e))
      event.source?.postMessage(response, { targetOrigin: event.origin })
    }
  }, [origin, routeOrThrow])

  useEffect(() => {
    addEventListener("message", onMessage)
    return () => removeEventListener("message", onMessage)
  }, [onMessage])

  return <>
    <Head>
      {manifest && <link rel="manifest" href={manifest} />}
    </Head>
    <FrameWithCsp className={hidden ? "hidden" : "w-full h-full bg-white"}
      ref={setFrame}
      key={policy}
      src={href}
      csp={policy}
      seamless />
  </>
}