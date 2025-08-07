import { FrameWithCsp } from "@/libs/frame";
import { useHash } from "@/libs/hash";
import { splitAndJoin } from "@/libs/split";
import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequestInit } from "@hazae41/jsonrpc";
import Head from "next/head";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  const params = useHash()

  if (!params)
    return <Home />

  return <Loader params={params} />
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

  const params = useMemo(() => {
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
        aria-disabled={!params}
        href={params}>
        Let's go
      </a>
      <div className="h-4 md:grow" />
    </div>
  </div>
}

function getSecretOrThrow() {
  const stale = localStorage.getItem("secret")

  if (stale != null)
    return stale

  const fresh = crypto.randomUUID().slice(0, 8)

  localStorage.setItem("secret", fresh)

  return fresh
}

export function Loader(props: {
  readonly params: string
}) {
  const { params } = props

  const [hash, href] = splitAndJoin(params, "@")

  const getScopeOrThrow = useCallback(async () => {
    const secret = getSecretOrThrow()

    const mixing = new TextEncoder().encode(`${secret}#${hash}@${href}`)
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", mixing))

    return digest.reduce((s, x) => s + x.toString(16).padStart(2, "0"), "").slice(0, 8)
  }, [hash, href])

  const [scope, setScope] = useState<string>()

  useEffect(() => {
    getScopeOrThrow().then(setScope).catch(console.error)
  }, [getScopeOrThrow])

  const ok = useMemo(() => {
    if (scope == null)
      return
    if (location.pathname === `/${scope}`)
      return true

    const url = new URL(location.href)

    url.pathname = `/${scope}`

    location.replace(url)
  }, [scope])

  if (!ok)
    return null

  return <Framer key={scope} hash={hash} href={href} />
}

export function Framer(props: {
  readonly hash: string
  readonly href: string
}) {
  const { hash, href } = props

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

  const url = useMemo(() => {
    return new URL(href)
  }, [href])

  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    setHidden(true)
  }, [hash])

  const iframe = useRef<HTMLIFrameElement>(null)

  const routeOrThrow = useCallback(async (event: MessageEvent<RpcRequestInit>) => {
    const request = event.data

    if (request.method === "csp_get") {
      return policy
    }

    if (request.method === "csp_set") {
      const [policy] = request.params as [string]
      setPolicy(policy)
      return
    }

    if (request.method === "frame_show") {
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

    throw new RpcMethodNotFoundError()
  }, [hash, href, policy])

  const onMessage = useCallback(async (event: MessageEvent<RpcRequestInit>) => {
    if (event.origin !== url.origin)
      return
    const request = event.data

    try {
      const response = new RpcOk(request.id, await routeOrThrow(event))
      event.source?.postMessage(response, { targetOrigin: event.origin })
    } catch (e: unknown) {
      const response = new RpcErr(request.id, RpcError.rewrap(e))
      event.source?.postMessage(response, { targetOrigin: event.origin })
    }
  }, [url, routeOrThrow])

  useEffect(() => {
    addEventListener("message", onMessage)
    return () => removeEventListener("message", onMessage)
  }, [onMessage])

  const manifest = useMemo(() => {
    return new URL(`${location.pathname}/manifest.json#${hash}@${href}`, location.href)
  }, [hash, href])

  return <>
    <Head>
      <link rel="manifest" href={manifest.href} />
    </Head>
    <FrameWithCsp className={hidden ? "hidden" : "w-full h-full bg-white"}
      key={policy}
      ref={iframe}
      src={url.href}
      csp={policy}
      seamless />
  </>
}