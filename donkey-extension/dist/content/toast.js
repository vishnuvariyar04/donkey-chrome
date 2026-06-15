function showToast(message, type = 'info') {
  document.getElementById('donkey-toast')?.remove()

  const icons = {
    success: { bg: '#22c55e', symbol: '✓' },
    error:   { bg: '#ef4444', symbol: '✕' },
    loading: { bg: '#6b7280', symbol: '…' },
    info:    { bg: '#3b82f6', symbol: 'i' }
  }

  const icon = icons[type] || icons.info

  const toast = document.createElement('div')
  toast.id = 'donkey-toast'
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #111;
    color: #fff;
    padding: 10px 16px 10px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 500;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    transition: opacity 0.25s ease;
    opacity: 1;
  `

  const dot = document.createElement('div')
  dot.style.cssText = `
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${icon.bg};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
  `
  dot.textContent = icon.symbol

  const label = document.createElement('span')
  label.textContent = message

  toast.appendChild(dot)
  toast.appendChild(label)
  document.body.appendChild(toast)

  if (type !== 'loading') {
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 250)
    }, 3000)
  }
}

function showMemoryPanel(items, onReplace, isFirstTime = false) {
  document.getElementById('donkey-toast')?.remove()
  document.getElementById('donkey-panel')?.remove()

  let panelVisible = false
  let remaining = [...items]

  // Panel
  const panel = document.createElement('div')
  panel.id = 'donkey-panel'
  panel.style.cssText = `
    position: fixed;
    bottom: 70px;
    right: 24px;
    background: #1a1a1a;
    border: 1px solid #2e2e2e;
    border-radius: 12px;
    padding: 4px;
    min-width: 210px;
    z-index: 999999;
    display: none;
    flex-direction: column;
    gap: 2px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  `

  function renderRows() {
    panel.innerHTML = ''
    remaining.forEach(item => {
      const row = document.createElement('div')
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 10px;
        gap: 16px;
        border-radius: 8px;
        cursor: default;
      `
      row.addEventListener('mouseenter', () => row.style.background = '#252525')
      row.addEventListener('mouseleave', () => row.style.background = 'transparent')

      const name = document.createElement('span')
      name.textContent = item.project
      name.style.cssText = `
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        color: #e5e5e5;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
      `

      const xBtn = document.createElement('button')
      xBtn.textContent = '×'
      xBtn.style.cssText = `
        background: none;
        border: none;
        color: #555;
        cursor: pointer;
        font-size: 17px;
        line-height: 1;
        padding: 0;
        flex-shrink: 0;
        transition: color 0.15s;
      `
      xBtn.addEventListener('mouseenter', () => xBtn.style.color = '#ef4444')
      xBtn.addEventListener('mouseleave', () => xBtn.style.color = '#555')
      xBtn.addEventListener('click', e => {
        e.stopPropagation()
        remaining = remaining.filter(i => i !== item)
        onReplace(remaining)
        if (remaining.length === 0) {
          panel.remove()
          toast.remove()
        } else {
          updateLabel()
          renderRows()
        }
      })

      row.appendChild(name)
      row.appendChild(xBtn)
      panel.appendChild(row)
    })
  }

  // Toast pill
  const toast = document.createElement('div')
  toast.id = 'donkey-toast'
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #111;
    color: #fff;
    padding: 10px 14px 10px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 500;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    cursor: pointer;
    user-select: none;
  `

  const dot = document.createElement('div')
  dot.style.cssText = `
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #22c55e;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
  `
  dot.textContent = '✓'

  const label = document.createElement('span')

  const chevron = document.createElement('span')
  chevron.style.cssText = `font-size: 9px; color: #666; margin-left: 2px;`
  chevron.textContent = '▲'

  function updateLabel() {
    const n = remaining.length
    label.textContent = `Injected ${n} ${n === 1 ? 'memory' : 'memories'}`
  }

  toast.addEventListener('click', () => {
    panelVisible = !panelVisible
    panel.style.display = panelVisible ? 'flex' : 'none'
    chevron.textContent = panelVisible ? '▼' : '▲'
  })

  toast.appendChild(dot)
  toast.appendChild(label)
  toast.appendChild(chevron)

  updateLabel()
  renderRows()

  document.body.appendChild(panel)
  document.body.appendChild(toast)

  if (isFirstTime) {
    setTimeout(() => {
      panelVisible = true
      panel.style.display = 'flex'
      chevron.textContent = '▼'
    }, 600)
    setTimeout(() => {
      panelVisible = false
      panel.style.display = 'none'
      chevron.textContent = '▲'
    }, 3500)
  }
}
