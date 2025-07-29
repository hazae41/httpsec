import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Explicit = [{ method: string, params: any[] }, Transferable[]]

export namespace Base64 {

  export function fromBase64Url(text: string): string {
    return text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4);
  }

}

export default function Home() {
  const iframe = useRef<HTMLIFrameElement>(null)

  const [_0, hash, _1, ...href] = location.hash.split("/")

  // const policy = useRef(`script-src 'sha256-${Base64.fromBase64Url(hash)}';`)
  const policy = useRef(`script-src 'sha256-+REarvlix0czEKAgG5/QYe/ekfCYpPjGiiIRjiEMcn4=';`)

  const [key, setKey] = useState(crypto.randomUUID())

  const onMessage = useCallback((event: MessageEvent<Explicit>) => {
    const [request] = event.data

    if (request.method === "csp_get") {
      iframe.current?.contentWindow?.postMessage([{ result: policy.current }], "*")
      return
    }

    if (request.method === "csp_set") {
      policy.current = request.params[0]
      setKey(crypto.randomUUID())
      return
    }

    throw new Error()
  }, [])

  const offMessage = useMemo(() => {
    addEventListener("message", onMessage)
    return () => removeEventListener("message", onMessage)
  }, [onMessage])

  useEffect(() => () => {
    offMessage()
  }, [offMessage])

  console.log(policy.current)

  // @ts-ignore
  return <iframe key={key} ref={iframe} csp={policy.current} src={href.join("/")} />
}
