import { FrameWithCsp } from "@/libs/frame";
import { useHash } from "@/libs/hash";
import { splitAndJoin } from "@/libs/split";
import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequestInit } from "@hazae41/jsonrpc";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  const params = useHash()

  if (!params)
    return <Home />

  return <Framer params={params} />
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

export function Framer(props: {
  readonly params: string
}) {
  const { params } = props

  const [hash, href] = splitAndJoin(params, "@")

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

  const urlNoHash = useMemo(() => {
    const url2 = new URL(url)
    url2.hash = ""
    return url2
  }, [url])

  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    setHidden(true)
  }, [urlNoHash.href])

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

    if (request.method === "html_show") {
      setHidden(false)
      return
    }

    throw new RpcMethodNotFoundError()
  }, [policy])

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

  if (!hidden)
    return <FrameWithCsp seamless className="w-full h-full bg-white" key={policy} ref={iframe} src={url.href} csp={policy} />

  return <FrameWithCsp className="hidden" key={policy} ref={iframe} src={url.href} csp={policy} />
}