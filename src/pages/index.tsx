import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Explicit = [{ method: string, params: any[] }, Transferable[]]

export default function Home() {
  const iframe = useRef<HTMLIFrameElement>(null)

  const [integrity, ...href] = location.hash.slice(1).split("@")

  const policy = useRef(`script-src '${integrity}';`)

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
