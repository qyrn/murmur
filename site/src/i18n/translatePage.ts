import { ENGLISH_PAGE } from './englishPage'
import { getLanguage } from './language'
import { renderRichText } from './richText'

interface TranslatedAttribute {
  element: Element
  name: string
  key: string
  french: string
}

const frenchContent = new Map<Element, Node[]>()
const translatedAttributes: TranslatedAttribute[] = []

function parseAttributeSpec(element: Element): void {
  const spec = element.getAttribute('data-i18n-attr') ?? ''
  for (const pair of spec.split(';')) {
    const [name, key] = pair.split(':')
    if (name && key) {
      translatedAttributes.push({ element, name, key, french: element.getAttribute(name) ?? '' })
    }
  }
}

export function snapshotFrenchPage(): void {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    frenchContent.set(
      element,
      Array.from(element.childNodes).map((node) => node.cloneNode(true))
    )
  })
  document.querySelectorAll('[data-i18n-attr]').forEach(parseAttributeSpec)
}

export function translatePage(): void {
  const isEnglish = getLanguage() === 'en'
  frenchContent.forEach((frenchNodes, element) => {
    const key = element.getAttribute('data-i18n') ?? ''
    const english = ENGLISH_PAGE[key]
    if (isEnglish && english !== undefined) {
      element.replaceChildren(renderRichText(english))
    } else {
      element.replaceChildren(...frenchNodes.map((node) => node.cloneNode(true)))
    }
  })
  translatedAttributes.forEach(({ element, name, key, french }) => {
    element.setAttribute(name, isEnglish ? (ENGLISH_PAGE[key] ?? french) : french)
  })
}
