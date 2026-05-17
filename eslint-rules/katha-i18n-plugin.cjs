/**
 * @fileoverview Hard localization guardrails for Katha renderer.
 * @see eslint.config.mjs — scoped under src/renderer/src (recursive).
 */

/** @type {import('eslint').Rule.RuleModule} */
const noRawUiStringProps = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow raw string literals on props that carry visible UI copy.' },
    schema: [],
    messages: {
      prop:
        'Raw {{prop}} string — wrap visible copy with uiText from useUiText()/useAppI18n() ({{reason}}).'
    }
  },
  create(context) {
    const UI_PROP_HINT = new Set([
      'aria-label',
      'aria-description',
      'aria-describedby',
      'aria-labelledby',
      'title',
      'placeholder',
      'alt'
    ])

    const ALLOW_SUBSTRING = ['कथा एकादेशको', 'Tryst BJ', 'Penguin']

    function isAllowedLiteral(val) {
      if (val === '') return true
      if (typeof val !== 'string') return false
      if (/^[0-9a-zA-Z._\-:]+$/.test(val) && val.length <= 32) {
        return true // IDs / codes / technical hints (URLs handled separately)
      }
      if (/^https?:\/\//.test(val)) return true
      if (/^rgba?\(/i.test(val)) return true
      if (/^#[0-9a-f]{3,8}$/i.test(val)) return true
      return ALLOW_SUBSTRING.some((s) => val.includes(s))
    }

    function checkJsxAttrLiteral(node, propName, literalNode, rawVal) {
      if (!UI_PROP_HINT.has(propName)) return
      if (isAllowedLiteral(rawVal)) return
      context.report({
        node: literalNode,
        messageId: 'prop',
        data: {
          prop: propName,
          reason: 'no raw prose on accessibility / tooltip / media helper props'
        }
      })
    }

    return {
      JSXAttribute(node) {
        const propName =
          node.name.type === 'JSXIdentifier'
            ? node.name.name
            : node.name.type === 'JSXNamespacedName'
              ? `${node.name.namespace.name}:${node.name.name.name}`
              : null
        if (!propName || !UI_PROP_HINT.has(propName)) return

        const v = node.value
        if (!v) return

        if (v.type === 'Literal' && typeof v.value === 'string') {
          checkJsxAttrLiteral(node, propName, v, v.value)
        }
        if (v.type === 'JSXExpressionContainer') {
          const e = v.expression
          if (e.type === 'Literal' && typeof e.value === 'string') {
            checkJsxAttrLiteral(node, propName, e, e.value)
          }
        }
      }
    }
  }
}

/** @type {import('eslint').Rule.RuleModule} */
const forbidUseTranslationT = {
  meta: {
    type: 'problem',
    docs: { description: 'Require useUiText/useAppI18n instead of destructuring `t` from useTranslation.' },
    schema: [],
    messages: {
      noT:
        'Do not destructure `t` from useTranslation — use useUiText() or useAppI18n() and call uiText(key).'
    }
  },
  create(context) {
    function allowedFile() {
      const fn = context.filename.replace(/\\/g, '/')
      return (
        fn.endsWith('/i18n/LanguageProvider.tsx') ||
        fn.endsWith('/i18n/useSyncUiLanguageToI18n.ts') ||
        fn.endsWith('/i18n/LocalizedAppRoot.tsx')
      )
    }

    return {
      VariableDeclarator(node) {
        if (allowedFile()) return
        if (!node.init || node.init.type !== 'CallExpression') return
        const callee = node.init.callee
        if (callee.type !== 'Identifier' || callee.name !== 'useTranslation') return
        if (node.id.type !== 'ObjectPattern') return

        for (const prop of node.id.properties) {
          if (prop.type !== 'Property') continue
          const k = prop.key
          if (k.type === 'Identifier' && k.name === 't') {
            context.report({ node: prop, messageId: 'noT' })
          }
        }
      }
    }
  }
}

/** @type {import('eslint').Plugin} */
const plugin = {
  meta: { name: 'katha-i18n', version: '1.0.0' },
  rules: {
    'no-raw-ui-string-props': noRawUiStringProps,
    'forbid-use-translation-t': forbidUseTranslationT
  }
}

module.exports = plugin
