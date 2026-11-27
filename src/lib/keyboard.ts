/**
 * True when a keyboard event originated from an element the user is typing
 * into — form fields or contenteditable regions (the Desmos expression list
 * uses contenteditable, so shortcuts stay inert while editing expressions).
 */
export function isTypingTarget(target: EventTarget | null | undefined): boolean {
  if (!target || typeof target !== "object") return false
  const element = target as { isContentEditable?: boolean; tagName?: string }
  if (element.isContentEditable) return true
  const tag = typeof element.tagName === "string" ? element.tagName.toUpperCase() : ""
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}
