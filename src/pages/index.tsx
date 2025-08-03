import { useCallback, useEffect, useRef, useState } from "react";

export type Explicit = [{ method: string, params: any[] }, Transferable[]]

export function splitAndJoin(text: string, separator: string): [string, string] {
  const [first, ...rest] = text.split(separator)

  const join = rest.join(separator)

  return [first, join]
}

export function useHash() {
  const [hash, setHash] = useState(location.hash)

  const onHashChange = useCallback(() => {
    setHash(location.hash)
  }, [])

  useEffect(() => {
    addEventListener("hashchange", onHashChange)
    return () => removeEventListener("hashchange", onHashChange)
  }, [onHashChange])

  return hash
}

export default function Home() {
  const hash = useHash()

  const [integrity, href] = splitAndJoin(hash.slice(1), "@")

  const [hidden, setHidden] = useState(true)

  const [policy, setPolicy] = useState(`script-src '${integrity}';`)

  useEffect(() => {
    setPolicy(`script-src '${integrity}';`)
  }, [integrity])

  const iframe = useRef<HTMLIFrameElement>(null)

  const routeOrThrow = useCallback((event: MessageEvent<Explicit>) => {
    const [request] = event.data

    if (request.method === "csp_get") {
      iframe.current?.contentWindow?.postMessage([{ result: policy }], "*")
      return
    }

    if (request.method === "csp_set") {
      setPolicy(request.params[0])
      return
    }

    if (request.method === "html_show") {
      setHidden(false)
      return
    }

    throw new Error()
  }, [policy])

  const routeOrThrowAsRef = useRef(routeOrThrow)
  routeOrThrowAsRef.current = routeOrThrow

  const onMessage = useCallback((event: MessageEvent<Explicit>) => {
    if (event.origin !== location.origin)
      return
    routeOrThrowAsRef.current(event)
  }, [])

  useEffect(() => {
    addEventListener("message", onMessage)
    return () => removeEventListener("message", onMessage)
  }, [onMessage])

  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready)
    return null

  // @ts-ignore
  return <iframe height={hidden ? "auto" : 0} ref={iframe} csp={policy} src={href} />
}
