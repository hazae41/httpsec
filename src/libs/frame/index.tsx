import { JSX } from "react";

export function FrameWithCsp(props: JSX.IntrinsicElements["iframe"] & { csp?: string }) {
  return <iframe {...props} />
}