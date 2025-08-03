export function splitAndJoin(text: string, separator: string): [string, string] {
  const [first, ...rest] = text.split(separator)

  const join = rest.join(separator)

  return [first, join]
}