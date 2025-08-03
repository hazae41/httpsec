import { useCallback, useEffect, useState } from "react"

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