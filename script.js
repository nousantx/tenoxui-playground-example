document.documentElement.setAttribute(
  'child',
  `
    (h1): fs-2.5rem fw-600 ls--0.030em;
    (h2): fs-1.75rem fw-500 ls--0.025em;
    (.editor-section): p-1rem;
    (textarea): family-[JetBrains_Mono] w-full h-300px mb-1rem;
    (.preview-section #preview): h-mn-150px p-1rem bg-#77777730;
  `
)

// document.querySelectorAll('*:not(#preview *)').forEach(element => {
document.querySelectorAll('*').forEach((element) => {
  const instance = new __tenoxui_core.MakeTenoxUI({
    element,
    property: TENOXUI_PROPERTY.property,
    values: { full: '100%' },
    attributify: true,
    attributifyPrefix: 'tx-',
    attributifyIgnore: __attr_list.standardAttributes
  }).useDOM()
})
// Create a global instance store
const tuiInstances = new Map()

// Debounce function to limit the rate of function calls
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Function to initialize TenoxUI instances for all elements
function initializeTenoxUI(config) {
  tuiInstances.clear()
  // Only select the preview wrapper
  document.querySelectorAll('#preview *').forEach((element) => {
    const instance = new __tenoxui_core.MakeTenoxUI({
      element,
      ...config
    }).useDOM()
    tuiInstances.set(element, instance)
  })
}

// Function to update preview
function updatePreview() {
  const htmlContent = document.getElementById('htmlEditor').value
  const configContent = document.getElementById('configEditor').value
  // const elementContent = document.getElementById('elementEditor').value

  document.getElementById('preview').innerHTML = htmlContent

  try {
    const config = JSON.parse(configContent)
    // Ignore standard html attributes
    config.attributifyIgnore = __attr_list.standardAttributes
    initializeTenoxUI(config)
  } catch (error) {
    console.error('Error parsing configuration:', error)
  }
}

// Debounced update function
const debouncedUpdate = debounce(updatePreview, 0) // set whatever you one, or just remove this. (0 = realtime)
document.getElementById('htmlEditor').addEventListener('input', debouncedUpdate)
document.getElementById('configEditor').addEventListener('input', debouncedUpdate)

// Run initial preview
updatePreview()
