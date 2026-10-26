/** Leitura do Custom Elements Manifest (custom-elements.json) para a
 *  documentação viva. */

/** A declaração do custom element `tag` no manifesto, ou undefined. */
export function findDeclaration(manifest, tag) {
  for (const mod of manifest.modules ?? []) {
    for (const declaration of mod.declarations ?? []) {
      if (declaration.tagName === tag) return declaration
    }
  }
  return undefined
}

/** "'sm' | 'md' | 'lg'" -> ['sm', 'md', 'lg']; null se o tipo não for uma
 *  união de literais de texto (ex.: um tipo nomeado como FzlButtonVariant). */
export function literalOptions(typeText) {
  if (!typeText) return null
  const parts = typeText.split('|').map((part) => part.trim())
  const values = parts.map((part) => /^(['"])(.*)\1$/.exec(part)?.[2])
  return values.every((value) => value !== undefined) ? values : null
}

/** "'primary'" -> 'primary', "false" -> false; undefined se não houver. */
function parseDefault(text) {
  if (text === undefined) return undefined
  if (text === 'true' || text === 'false') return text === 'true'
  return /^(['"])(.*)\1$/.exec(text)?.[2] ?? text
}

/** Os atributos de uma implementação como controles do palco:
 *  { name, description, kind: 'options' | 'boolean' | 'text', options?, default }.
 *  Quando o tipo de um atributo é um nome (o analisador do Lit guarda o tipo
 *  TypeScript, não a união), as opções vêm do mesmo atributo nas outras
 *  implementações do componente. */
export function controlsFor(implementation, siblings) {
  const declaration = findDeclaration(implementation.manifest, implementation.tag)
  return (declaration?.attributes ?? []).map((attribute) => {
    let options = literalOptions(attribute.type?.text)
    if (!options) {
      for (const sibling of siblings) {
        const other = findDeclaration(sibling.manifest, sibling.tag)?.attributes?.find((a) => a.name === attribute.name)
        options = literalOptions(other?.type?.text)
        if (options) break
      }
    }
    const kind = options ? 'options' : attribute.type?.text === 'boolean' ? 'boolean' : 'text'
    return { name: attribute.name, description: attribute.description ?? '', kind, options, default: parseDefault(attribute.default) }
  })
}
