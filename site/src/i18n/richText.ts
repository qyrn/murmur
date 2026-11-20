const TOKEN = /\[\[(kbd|code|b|a):([^\]]+)\]\]/g
const ALLOWED_LINK = /^(#[\w-]+|https:\/\/github\.com\/qyrn\/murmur[\w./-]*)$/

function inlineElement(kind: string, body: string): Node {
  if (kind === 'a') {
    const [href = '', label = href] = body.split('|')
    if (!ALLOWED_LINK.test(href)) {
      return document.createTextNode(label)
    }
    const link = document.createElement('a')
    link.href = href
    link.textContent = label
    if (href.startsWith('https://')) {
      link.rel = 'noopener'
    }
    return link
  }
  const element = document.createElement(kind)
  element.textContent = body
  return element
}

export function renderRichText(source: string): DocumentFragment {
  const fragment = document.createDocumentFragment()
  let cursor = 0
  for (const match of source.matchAll(TOKEN)) {
    const [whole, kind = '', body = ''] = match
    fragment.append(source.slice(cursor, match.index), inlineElement(kind, body))
    cursor = match.index + whole.length
  }
  fragment.append(source.slice(cursor))
  return fragment
}
