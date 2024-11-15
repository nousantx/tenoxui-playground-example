/*!
 * @tenoxui/core v1.3.0-alpha.2
 * Licensed under MIT (https://github.com/tenoxui/tenoxui/blob/main/LICENSE)
 */

class ComputeValue {
  constructor(element, properties, values) {
    this.element = element
    this.properties = properties
    this.values = values
    this.setCustomClass = this.setStyle.bind(this)
  }
  valueHandler(type, value, unit) {
    const property = this.properties[type]
    const registryValue = this.values[value]
    let resolvedValue = registryValue || value
    if ((value + unit).length !== value.toString().length && unit !== '') {
      return value + unit
    }
    if (
      typeof property === 'object' &&
      'value' in property &&
      property.value &&
      !property.value.includes('{0}')
    ) {
      return property.value
    }
    if (resolvedValue.startsWith('$')) {
      return `var(--${resolvedValue.slice(1)})`
    }
    if (resolvedValue.startsWith('[') && resolvedValue.endsWith(']')) {
      const cleanValue = resolvedValue.slice(1, -1).replace(/_/g, ' ')
      return cleanValue.startsWith('--') ? `var(${cleanValue})` : cleanValue
    }
    const typeRegistry = this.values[type]
    if (typeof typeRegistry === 'object') {
      resolvedValue = typeRegistry[value] || resolvedValue
    }
    return resolvedValue + unit
  }
  setStyle(property, value) {
    property.startsWith('--')
      ? this.element.style.setProperty(property, value)
      : (this.element.style[property] = value)
  }
  setCustomValue({ property, value: template }, value, secondValue = '') {
    const finalValue = template
      ? template.replace(/\{0}/g, value).replace(/\{1}/g, secondValue)
      : value
    Array.isArray(property)
      ? property.forEach((prop) => this.setStyle(prop, finalValue))
      : this.setStyle(property, finalValue)
  }
  setDefaultValue(property, value) {
    Array.isArray(property)
      ? property.forEach((prop) => this.setStyle(prop, value))
      : this.setStyle(property, value)
  }
}

const isObjectWithValue = (typeAttribute) => {
  return (
    typeof typeAttribute === 'object' &&
    typeAttribute !== null &&
    'value' in typeAttribute &&
    'property' in typeAttribute
  )
}

class StyleHandler {
  constructor(element, property, values, classes) {
    this.element = element
    this.property = property
    this.values = values
    this.classes = classes
    this.computeValue = new ComputeValue(element, property, this.values)
    this.isInitialLoad = new WeakMap()
    if (element) {
      this.isInitialLoad.set(element, true)
    }
  }
  handleTransitionProperty(property, value) {
    const isInitial = this.isInitialLoad.get(this.element)
    if (!isInitial) {
      this.element.style[property] = value
      return
    }
    this.element.style.transition = 'none'
    this.element.style.transitionDuration = '0s'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.element.style.transition = ''
        this.element.style.transitionDuration = ''
        this.element.style[property] = value
        this.isInitialLoad.set(this.element, false)
      })
    })
  }
  handleCSSVariables(type, resolvedValue, secondValue) {
    const items = type
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
    items.forEach((item) => {
      const propertyDef = this.property[item]
      if (item.startsWith('--')) {
        this.computeValue.setCustomClass(item, resolvedValue)
      } else if (propertyDef) {
        if (typeof propertyDef === 'object' && 'property' in propertyDef) {
          this.computeValue.setCustomValue(propertyDef, resolvedValue, secondValue)
        } else {
          this.computeValue.setDefaultValue(propertyDef, resolvedValue)
        }
      } else {
        this.computeValue.setDefaultValue(item, resolvedValue)
      }
    })
  }
  addStyle(type, value, unit, secondValue, secondUnit, classProp) {
    const propertyDef = this.property[type]
    if (classProp && value && this.classes[classProp]) {
      this.computeValue.setCustomClass(classProp, value)
      return
    }
    if (!value && isObjectWithValue(propertyDef)) {
      value = propertyDef.value
    }
    if (!value) return
    const resolvedValue = this.computeValue.valueHandler(type, value, unit || '')
    const resolvedSecondValue = secondValue
      ? this.computeValue.valueHandler(type, secondValue, secondUnit || '')
      : ''
    if (propertyDef === 'transition' || propertyDef === 'transitionDuration') {
      this.handleTransitionProperty(propertyDef, resolvedValue)
      return
    }
    if (type.startsWith('[') && type.endsWith(']')) {
      this.handleCSSVariables(type, resolvedValue, resolvedSecondValue)
      return
    }
    if (typeof propertyDef === 'object' && 'property' in propertyDef) {
      this.computeValue.setCustomValue(propertyDef, resolvedValue, resolvedSecondValue)
      return
    }
    if (propertyDef) {
      this.computeValue.setDefaultValue(propertyDef, resolvedValue)
    }
  }
}

class Responsive {
  constructor(element, breakpoints, property, classes, styler) {
    this.element = element
    this.breakpoints = breakpoints
    this.property = property
    this.classes = classes
    this.styler = styler
  }
  matchBreakpoint({ name, min, max }, prefix, width) {
    if (name !== prefix) return false
    if (min !== undefined && max !== undefined) return width >= min && width <= max
    if (min !== undefined) return width >= min
    if (max !== undefined) return width <= max
    return false
  }
  handleResponsive(
    breakpointPrefix,
    type,
    value,
    unit,
    secondValue = '',
    secondUnit = '',
    propKey
  ) {
    const properties = this.property[type]
    const applyStyle = () => {
      if (isObjectWithValue(properties)) {
        this.styler.addStyle(type)
      } else if (propKey && this.classes[propKey]) {
        this.styler.addStyle(type, value, unit, secondValue, secondUnit, propKey)
      } else {
        this.styler.addStyle(type, value, unit, secondValue, secondUnit)
      }
    }
    const handleResize = () => {
      var _a
      const windowWidth = window.innerWidth
      const matchPoint = this.breakpoints.find((bp) =>
        this.matchBreakpoint(bp, breakpointPrefix, windowWidth)
      )
      matchPoint
        ? applyStyle()
        : (_a = this.element) === null || _a === void 0
          ? void 0
          : _a.style.setProperty(type, '')
    }
    handleResize()
    window.addEventListener('resize', handleResize)
  }
}

function camelToKebab(str) {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

class Pseudo {
  constructor(element, property, classes, computeValue, styler) {
    this.element = element
    this.property = property
    this.classes = classes
    this.computeValue = computeValue
    this.styler = styler
  }
  getPropName(type, propKey) {
    if (type.startsWith('[') && type.endsWith(']')) {
      const properties = type
        .slice(1, -1)
        .split(',')
        .map((p) => p.trim())
      const processProp = (prop) => {
        if (prop.startsWith('--')) return prop
        const attrProp = this.property[prop]
        if (!attrProp) return prop
        if (typeof attrProp === 'object' && 'property' in attrProp) {
          return camelToKebab(attrProp.property)
        }
        return camelToKebab(attrProp)
      }
      return properties.length === 1 ? processProp(properties[0]) : properties.map(processProp)
    }
    if (propKey && propKey in this.classes) {
      return camelToKebab(propKey)
    }
    const property = this.property[type]
    if (!property) return undefined
    if (typeof property === 'object' && 'property' in property) {
      return camelToKebab(property.property)
    }
    return Array.isArray(property)
      ? property.map((prop) => camelToKebab(prop))
      : camelToKebab(property)
  }
  getInitialValue(propsName) {
    return Array.isArray(propsName)
      ? propsName.reduce((acc, prop) => {
          acc[prop] = this.element.style.getPropertyValue(prop)
          return acc
        }, {})
      : this.element.style.getPropertyValue(propsName)
  }
  revertStyle(propsName, styleInitValue) {
    if (Array.isArray(propsName)) {
      propsName.forEach((prop) => this.computeValue.setStyle(prop, styleInitValue[prop]))
    } else {
      this.computeValue.setStyle(propsName, styleInitValue)
    }
  }
  pseudoHandler(type, value, unit, secondValue, secondUnit, pseudoEvent, revertEvent, propKey) {
    const properties = this.property[type]
    const propsName = propKey ? this.getPropName('', propKey) : this.getPropName(type)
    if (!propsName || !pseudoEvent || !revertEvent) return
    const styleInitValue = this.getInitialValue(propsName)
    const applyStyle = () => {
      if (isObjectWithValue(properties)) {
        properties.value.includes('{0}')
          ? this.styler.addStyle(type, value, unit, secondValue, secondUnit)
          : this.styler.addStyle(type)
      } else if (
        propKey &&
        propKey in this.classes &&
        typeof this.classes[propKey] === 'object' &&
        this.classes[propKey] !== null &&
        type in this.classes[propKey]
      ) {
        this.styler.addStyle(type, value, '', '', '', propKey)
      } else {
        this.styler.addStyle(type, value, unit)
      }
    }
    this.element.addEventListener(pseudoEvent, applyStyle)
    this.element.addEventListener(revertEvent, () => this.revertStyle(propsName, styleInitValue))
  }
}

class ParseStyles {
  constructor(property, classes, styler, pseudo, responsive) {
    this.property = property
    this.classes = classes
    this.styler = styler
    this.pseudo = pseudo
    this.responsive = responsive
  }
  getParentClass(className) {
    return Object.keys(this.classes).filter((cssProperty) =>
      Object.prototype.hasOwnProperty.call(this.classes[cssProperty], className)
    )
  }
  applyPrefixedStyle(prefix, type, value, unit = '', secondValue = '', secondUnit = '', propKey) {
    const pseudoEvents = {
      hover: ['mouseover', 'mouseout'],
      focus: ['focus', 'blur']
    }
    const events = pseudoEvents[prefix]
    if (events) {
      this.pseudo.pseudoHandler(type, value, unit, secondValue, secondUnit, ...events, propKey)
    } else {
      this.responsive.handleResponsive(prefix, type, value, unit, secondValue, secondUnit, propKey)
    }
  }
  parseDefaultStyle(prefix, type, value, unit = '', secondValue = '', secondUnit = '') {
    prefix
      ? this.applyPrefixedStyle(prefix, type, value, unit, secondValue, secondUnit)
      : this.styler.addStyle(type, value, unit, secondValue, secondUnit)
  }
  handlePredefinedStyle(type, prefix) {
    const properties = this.property[type]
    if (properties && isObjectWithValue(properties)) {
      const value = properties.value || ''
      prefix ? this.applyPrefixedStyle(prefix, type, value, '') : this.styler.addStyle(type)
      return true
    }
    return false
  }
  handleCustomClass(type, prefix) {
    const propKeys = this.getParentClass(type)
    if (!propKeys.length) return false
    propKeys.forEach((propKey) => {
      const classValue = this.classes[propKey]
      if (classValue === null || classValue === void 0 ? void 0 : classValue[type]) {
        const value = classValue[type]
        prefix
          ? this.applyPrefixedStyle(prefix, type, value, '', '', '', propKey)
          : this.styler.addStyle(type, value, '', '', '', propKey)
      }
    })
    return true
  }
}

function createTenoxUIComponents(context) {
  const computeValue = new ComputeValue(context.element, context.property, context.values)
  const styler = new StyleHandler(
    context.element,
    context.property,
    context.values,
    context.classes
  )
  const pseudo = new Pseudo(
    context.element,
    context.property,
    context.classes,
    computeValue,
    styler
  )
  const responsive = new Responsive(
    context.element,
    context.breakpoints,
    context.property,
    context.classes,
    styler
  )
  const parseStyles = new ParseStyles(context.property, context.classes, styler, pseudo, responsive)
  return { computeValue, styler, responsive, pseudo, parseStyles }
}

function getTypePrefixes(styleAttribute) {
  return Object.keys(styleAttribute)
    .sort((a, b) => b.length - a.length)
    .join('|')
}
function generateClassNameRegEx(styleAttribute) {
  const typePrefixes = getTypePrefixes(styleAttribute)
  return new RegExp(
    `(?:([a-zA-Z0-9-]+):)?(${typePrefixes}|\\[[^\\]]+\\])-(-?(?:\\d+(?:\\.\\d+)?)|(?:[a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*(?:-[a-zA-Z0-9_]+)*)|(?:#[0-9a-fA-F]+)|(?:\\[[^\\]]+\\])|(?:\\$[^\\s]+))([a-zA-Z%]*)(?:\\/(-?(?:\\d+(?:\\.\\d+)?)|(?:[a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*(?:-[a-zA-Z0-9_]+)*)|(?:#[0-9a-fA-F]+)|(?:\\[[^\\]]+\\])|(?:\\$[^\\s]+))([a-zA-Z%]*))?`
  )
}
function parseClassName(className, styleAttribute) {
  const classNameRegEx = generateClassNameRegEx(styleAttribute)
  const match = className.match(classNameRegEx)
  if (!match) return null
  const [, prefix, type, value, unit, secValue, secUnit] = match
  return [prefix, type, value, unit, secValue, secUnit]
}

function scanAndApplyStyles(applyStylesCallback, htmlElement) {
  const classes = htmlElement.className.split(/\s+/)
  classes.forEach((className) => {
    applyStylesCallback(className)
  })
}
function setupClassObserver(applyStylesCallback, htmlElement) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        htmlElement.style.cssText = ''
        scanAndApplyStyles(applyStylesCallback, htmlElement)
      }
    })
  })
  observer.observe(htmlElement, { attributes: true })
}

class AttributifyHandler {
  constructor(
    tenoxuiInstance,
    attributifyPrefix = 'tx-',
    attributifyIgnore = ['style', 'class', 'id', 'src']
  ) {
    this.observedElements = new WeakSet()
    this.ignoredAttributes = new Set()
    this.instance = tenoxuiInstance
    this.attributePrefix = attributifyPrefix
    attributifyIgnore.forEach((attr) => this.ignoredAttributes.add(attr))
  }
  addIgnoredAttributes(...attributes) {
    attributes.forEach((attr) => this.ignoredAttributes.add(attr))
  }
  removeIgnoredAttribute(attribute) {
    this.ignoredAttributes.delete(attribute)
  }
  processElement(element) {
    if (this.observedElements.has(element)) return
    Array.from(element.attributes).forEach((attr) =>
      this.processAttribute(element, attr.name, attr.value)
    )
    this.observedElements.add(element)
    this.observeAttributes(element)
  }
  processAttribute(element, name, value) {
    if (!value || this.ignoredAttributes.has(name)) return
    if (name === 'child') {
      this.processChildAttribute(element, value)
      return
    }
    value.split(/\s+/).forEach((part) => {
      this.parseValue(part).forEach((valueObj) => {
        const className = this.attributeToClassName(name, valueObj)
        if (className) {
          console.log(className)
          this.instance.applyStyles(className, element)
        }
      })
    })
  }
  processChildAttribute(element, value) {
    const selectors = this.parseChildSelector(value)
    selectors.forEach(({ selector, styles }) => {
      this.applyChildStyles(element, selector, styles)
    })
    this.observeChildChanges(element, selectors)
  }
  parseChildSelector(selectorStr) {
    const selectorPattern = /\((.*?)\):\s*([^;]+);/g
    const selectors = []
    let match
    while ((match = selectorPattern.exec(selectorStr))) {
      const [, selector, styles] = match
      selectors.push({
        selector: selector.trim(),
        styles: styles.trim()
      })
    }
    return selectors
  }
  applyChildStyles(parent, childSelector, styles) {
    parent.querySelectorAll(childSelector).forEach((child) => {
      styles.split(/\s+/).forEach((className) => {
        this.instance.applyStyles(className, child)
      })
    })
  }
  observeChildChanges(element, selectors) {
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          this.handleAddedNodes(mutation.addedNodes, selectors)
        } else if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          this.handleAttributeChange(mutation.target, selectors)
        }
      })
    }).observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
  }
  observeAttributes(element) {
    const attributesToObserve = Array.from(element.attributes)
      .map((attr) => attr.name)
      .filter((name) => !this.ignoredAttributes.has(name))
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName) {
          const attrName = mutation.attributeName
          if (!this.ignoredAttributes.has(attrName)) {
            this.processAttribute(element, attrName, element.getAttribute(attrName))
          }
        }
      })
    }).observe(element, {
      attributes: true,
      attributeFilter: ['child', ...Object.keys(this.instance.property), ...attributesToObserve]
    })
  }
  handleAddedNodes(nodes, selectors) {
    nodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        selectors.forEach(({ selector, styles }) => {
          if (node.matches(selector)) {
            styles.split(/\s+/).forEach((className) => {
              this.instance.applyStyles(className, node)
            })
          }
        })
      }
    })
  }
  handleAttributeChange(target, selectors) {
    selectors.forEach(({ selector, styles }) => {
      if (target.matches(selector)) {
        styles.split(/\s+/).forEach((className) => {
          this.instance.applyStyles(className, target)
        })
      }
    })
  }
  parseValue(value) {
    const valueRegex = /(?:([a-zA-Z0-9-]+):)?([^:\s]+)/g
    return Array.from(value.matchAll(valueRegex)).map(([, prefix, val]) => ({
      prefix: prefix || '',
      value: val
    }))
  }
  attributeToClassName(name, valueObj) {
    const { prefix, value } = valueObj
    if (name === 'child') return null
    let baseClass = null
    if (name.startsWith(this.attributePrefix)) {
      const propertyName = name.slice(this.attributePrefix.length)
      if (propertyName in this.instance.property) {
        baseClass = `${propertyName}-${value}`
      } else {
        baseClass = `[${propertyName}]-${value}`
      }
    } else if (name.startsWith('--')) {
      baseClass = `[${name}]-${value}`
    } else if (name.startsWith('data-')) {
      baseClass = `[${name.slice(5)}]-${value}`
    } else if (name in this.instance.property && !this.ignoredAttributes.has(name)) {
      baseClass = `${name}-${value}`
    } else if (name.startsWith('[') && name.endsWith(']')) {
      baseClass = `${name.slice(1, -1)}-${value}`
    } else if (!this.ignoredAttributes.has(name)) {
      baseClass = `[${name}]-${value}`
    }
    return baseClass ? (prefix ? `${prefix}:${baseClass}` : baseClass) : null
  }
}

class MakeTenoxUI {
  constructor({
    element,
    property = {},
    values = {},
    breakpoints = [],
    classes = {},
    attributify = false,
    attributifyPrefix = 'tx-',
    attributifyIgnore = ['style', 'class', 'id', 'src']
  }) {
    this.attributifyHandler = null
    this.element = element instanceof HTMLElement ? element : element[0]
    this.property = property
    this.values = values
    this.breakpoints = breakpoints
    this.classes = classes
    this.attributify = attributify
    this.attributifyPrefix = attributifyPrefix
    this.attributifyIgnore = attributifyIgnore
    if (this.attributify) {
      this.initAttributifyHandler()
    }
  }
  initAttributifyHandler() {
    this.attributifyHandler = new AttributifyHandler(
      this,
      this.attributifyPrefix,
      this.attributifyIgnore
    )
  }
  useDOM(element) {
    const targetElement = element || this.element
    if (!targetElement) return
    const applyStyles = (className) => this.applyStyles(className)
    if (targetElement.className) {
      scanAndApplyStyles(applyStyles, targetElement)
      setupClassObserver(applyStyles, targetElement)
    }
    if (this.attributify && this.attributifyHandler) {
      this.handleAttributify(targetElement)
    }
  }
  handleAttributify(element) {
    if (!(element instanceof HTMLElement) || !this.attributifyHandler) return
    this.attributifyHandler.processElement(element)
    this.attributifyHandler.observeAttributes(element)
  }
  applyStyles(className, targetElement = this.element) {
    const create = this.createComponentInstance(targetElement)
    const { prefix, type } = this.parseStylePrefix(className)
    if (create.parseStyles.handlePredefinedStyle(type, prefix)) return
    if (create.parseStyles.handleCustomClass(type, prefix)) return
    const parts = parseClassName(className, this.property)
    if (!parts) return
    const [parsedPrefix, parsedType, value = '', unit = '', secValue, secUnit] = parts
    create.parseStyles.parseDefaultStyle(parsedPrefix, parsedType, value, unit, secValue, secUnit)
  }
  createComponentInstance(targetElement) {
    return createTenoxUIComponents({
      element: targetElement,
      property: this.property,
      values: this.values,
      classes: this.classes,
      breakpoints: this.breakpoints
    })
  }
  parseStylePrefix(className) {
    const [prefix, type] = className.split(':')
    return {
      prefix: type ? prefix : undefined,
      type: type || prefix
    }
  }
  applyMultiStyles(styles, targetElement = this.element) {
    styles.split(/\s+/).forEach((style) => this.applyStyles(style, targetElement))
  }
  enableAttributify(selector = '*') {
    if (!this.attributify) {
      this.attributify = true
      this.initAttributifyHandler()
    }
    const elements = document.querySelectorAll(selector)
    elements.forEach((element) => this.handleAttributify(element))
    this.observeNewElements(selector)
  }
  observeNewElements(selector) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.matches(selector)) {
            this.handleAttributify(node)
          }
        })
      })
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Scans and applies styles once without setting up observers
   * @param {HTMLElement} element - The target element to scan and apply styles to
   * @returns {void}
   */
  scanOnce(element) {
    const targetElement = element || this.element
    if (!targetElement) return

    // Apply class-based styles
    if (targetElement.className) {
      const classes = targetElement.className.split(/\s+/)
      classes.forEach((className) => {
        if (className) {
          this.applyStyles(className, targetElement)
        }
      })
    }

    // Apply attributify styles if enabled
    if (this.attributify && this.attributifyHandler) {
      this.scanAttributesOnce(targetElement)
    }
  }

  /**
   * Processes attributes once without setting up observers
   * @param {HTMLElement} element - The target element to scan attributes
   * @private
   */
  scanAttributesOnce(element) {
    if (!(element instanceof HTMLElement) || !this.attributifyHandler) return

    // Process all current attributes
    Array.from(element.attributes).forEach((attr) => {
      if (!this.attributifyHandler.ignoredAttributes.has(attr.name)) {
        if (attr.name === 'child') {
          this.attributifyHandler.processChildAttribute(element, attr.value)
        } else {
          this.attributifyHandler.processAttribute(element, attr.name, attr.value)
        }
      }
    })

    // Process child elements if there's a child attribute
    const childAttr = element.getAttribute('child')
    if (childAttr) {
      const selectors = this.attributifyHandler.parseChildSelector(childAttr)
      selectors.forEach(({ selector, styles }) => {
        const childElements = element.querySelectorAll(selector)
        childElements.forEach((childElement) => {
          styles.split(/\s+/).forEach((className) => {
            if (className) {
              this.applyStyles(className, childElement)
            }
          })
        })
      })
    }
  }

  /**
   * Scans and applies styles once to multiple elements
   * @param {string} selector - CSS selector to target elements
   * @returns {void}
   */
  scanAllOnce(selector = '*') {
    const elements = document.querySelectorAll(selector)
    elements.forEach((element) => {
      this.scanOnce(element)
    })
  }
}

class SelectorStyleHandler {
  constructor(tenoxInstance) {
    this.instance = tenoxInstance
    this.styleMap = new Map()
    this.observer = null
  }

  /**
   * Apply styles to elements matching the selector
   * @param {string} selector - CSS selector
   * @param {string} styles - Space-separated style classes
   */
  applyStyleToSelector(selector, styles) {
    const elements = document.querySelectorAll(selector)
    elements.forEach((element) => {
      this.instance.applyMultiStyles(styles, element)
    })
    this.styleMap.set(selector, styles)
  }

  /**
   * Initialize mutation observer to handle dynamically added elements
   */
  initObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              this.checkAndApplyStyles(node)
              // Check children of added node
              node.querySelectorAll('*').forEach((child) => {
                this.checkAndApplyStyles(child)
              })
            }
          })
        }
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Check if element matches any stored selectors and apply styles
   * @param {HTMLElement} element - Element to check
   */
  checkAndApplyStyles(element) {
    this.styleMap.forEach((styles, selector) => {
      if (element.matches(selector)) {
        this.instance.applyMultiStyles(styles, element)
      }
    })
  }

  /**
   * Apply styles from a style object
   * @param {Object} styleObject - Object with selectors as keys and styles as values
   */
  applyStyles(styleObject) {
    Object.entries(styleObject).forEach(([selector, styles]) => {
      this.applyStyleToSelector(selector, styles)
    })
  }

  /**
   * Clear all stored styles
   */
  clearStyles() {
    this.styleMap.clear()
  }

  /**
   * Remove styles for a specific selector
   * @param {string} selector - CSS selector to remove styles for
   */
  removeSelector(selector) {
    this.styleMap.delete(selector)
  }

  /**
   * Update styles for a specific selector
   * @param {string} selector - CSS selector to update
   * @param {string} styles - New styles to apply
   */
  updateSelector(selector, styles) {
    this.removeSelector(selector)
    this.applyStyleToSelector(selector, styles)
  }
}

// Extend MakeTenoxUI class with selector styles functionality
class ExtendedTenoxUI extends MakeTenoxUI {
  constructor(config) {
    super(config)
    this.selectorHandler = new SelectorStyleHandler(this)
    this.selectorHandler.initObserver()
  }

  /**
   * Apply styles using selector object
   * @param {Object} styleObject - Object with selectors and their styles
   */
  applySelectorStyles(styleObject) {
    this.selectorHandler.applyStyles(styleObject)
  }

  /**
   * Update styles for a specific selector
   * @param {string} selector - CSS selector
   * @param {string} styles - New styles to apply
   */
  updateSelectorStyles(selector, styles) {
    this.selectorHandler.updateSelector(selector, styles)
  }

  /**
   * Remove styles for a specific selector
   * @param {string} selector - CSS selector to remove
   */
  removeSelectorStyles(selector) {
    this.selectorHandler.removeSelector(selector)
  }

  /**
   * Clear all selector-based styles
   */
  clearSelectorStyles() {
    this.selectorHandler.clearStyles()
  }
}
