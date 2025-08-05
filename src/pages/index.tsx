import { FrameWithCsp } from "@/libs/frame";
import { useHash } from "@/libs/hash";
import { splitAndJoin } from "@/libs/split";
import { RpcErr, RpcError, RpcOk, RpcRequestInit } from "@hazae41/jsonrpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function Home() {
  const hash = useHash()

  const [list, href] = splitAndJoin(hash, "@")

  const integrities = useMemo(() => {
    return list.split(",")
  }, [list])

  const policy0 = useMemo(() => {
    return `script-src ${integrities.map(i => `'${i}'`).join(", ")};`
  }, [integrities])

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

  if (!hidden)
    return <FrameWithCsp key={policy} ref={iframe} src={url.href} csp={policy} />

  return <FrameWithCsp key={policy} ref={iframe} src={url.href} csp={policy} height={0} />
}