import { FrameWithCsp } from "@/libs/frame";
import { useHash } from "@/libs/hash";
import { splitAndJoin } from "@/libs/split";
import { RpcErr, RpcError, RpcOk, RpcRequestInit } from "@hazae41/jsonrpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function Home() {
  const hash = useHash()

  const [integrity, href] = splitAndJoin(hash.slice(1), "@")

  const url = useMemo(() => new URL(href), [href])

  const urlNoHash = useMemo(() => {
    const url2 = new URL(url)
    url2.hash = ""
    return url2
  }, [url])

  const [hidden, setHidden] = useState(true)

  const [policy, setPolicy] = useState(`script-src '${integrity}';`)

  useEffect(() => {
    setPolicy(`script-src '${integrity}';`)
  }, [integrity])

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

    throw new Error()
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

  if (hidden)
    return <FrameWithCsp key={policy} ref={iframe} src={url.href} csp={policy} height={0} />
  else
    return <FrameWithCsp key={policy} ref={iframe} src={url.href} csp={policy} />
}