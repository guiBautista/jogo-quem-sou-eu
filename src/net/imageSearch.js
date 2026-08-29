// Busca de imagens sem chave de API e sem backend.
//
// Num app 100% client-side não existe chave secreta: qualquer credencial no
// código estaria visível para quem abrisse o devtools. A API da Wikimedia é a
// exceção viável — é gratuita, não pede chave e responde com
// `access-control-allow-origin: *`, então o navegador chama direto.
//
// A Wikipédia em português acerta bem nomes de personagens e pessoas; quando ela
// não devolve nada (nome inventado, piada interna), caímos no Commons, que busca
// por nome de arquivo e cobre coisas mais genéricas.

const THUMB_SIZE = 640
export const IMAGE_RESULTS = 3

// O host valida a URL antes de repassar para os outros jogadores, então precisa
// ser a mesma lista dos dois lados.
export const ALLOWED_IMAGE_HOST = /^([a-z0-9-]+\.)*wikimedia\.org$/

export function isAllowedImageUrl(url) {
  if (typeof url !== 'string' || url.length > 500) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ALLOWED_IMAGE_HOST.test(parsed.hostname)
  } catch {
    return false
  }
}

async function callApi(endpoint, params, signal) {
  const url = new URL(endpoint)
  url.search = new URLSearchParams({ ...params, format: 'json', origin: '*' }).toString()

  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`API respondeu ${response.status}`)
  return response.json()
}

// `generator=search` numera os resultados em `index`; a ordem do objeto não vale.
function orderedPages(payload) {
  const pages = payload?.query?.pages
  if (!pages) return []
  return Object.values(pages).sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
}

async function searchWikipedia(term, signal) {
  const payload = await callApi(
    'https://pt.wikipedia.org/w/api.php',
    {
      action: 'query',
      generator: 'search',
      gsrsearch: term,
      gsrlimit: '8',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: String(THUMB_SIZE),
    },
    signal,
  )

  return orderedPages(payload)
    .filter((page) => page.thumbnail?.source)
    .map((page) => ({ url: page.thumbnail.source, title: page.title }))
}

async function searchCommons(term, signal) {
  const payload = await callApi(
    'https://commons.wikimedia.org/w/api.php',
    {
      action: 'query',
      generator: 'search',
      gsrsearch: term,
      gsrnamespace: '6', // só arquivos
      gsrlimit: '8',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: String(THUMB_SIZE),
    },
    signal,
  )

  return orderedPages(payload)
    .map((page) => ({
      url: page.imageinfo?.[0]?.thumburl,
      title: page.title.replace(/^File:/, '').replace(/\.(jpg|jpeg|png|svg|gif|webp)$/i, ''),
    }))
    .filter((item) => Boolean(item.url))
}

/**
 * Devolve até 3 imagens para o termo. Nunca lança por "não achei nada":
 * a imagem é opcional, então lista vazia é um resultado válido.
 */
export async function searchImages(term, signal) {
  const clean = term.trim()
  if (clean.length < 2) return []

  let results = await searchWikipedia(clean, signal)
  if (results.length === 0) results = await searchCommons(clean, signal)

  const seen = new Set()
  const unique = []
  for (const item of results) {
    if (!isAllowedImageUrl(item.url) || seen.has(item.url)) continue
    seen.add(item.url)
    unique.push(item)
    if (unique.length === IMAGE_RESULTS) break
  }
  return unique
}
