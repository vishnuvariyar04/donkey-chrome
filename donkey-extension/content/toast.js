function showToast(message, type = 'info') {
  document.getElementById('donkey-toast')?.remove()

  const icons = {
    success: { bg: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', symbol: '✓' },
    error:   { bg: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', symbol: '✕' },
    loading: { bg: '#818cf8', glow: 'rgba(129, 140, 248, 0.4)', symbol: '…' },
    info:    { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', symbol: 'i' }
  }

  const icon = icons[type] || icons.info

  const toast = document.createElement('div')
  toast.id = 'donkey-toast'
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(10, 11, 16, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #f1f5f9;
    padding: 10px 18px 10px 12px;
    border-radius: 99px;
    font-size: 13px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 500;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0;
    transform: translateY(12px);
  `

  const dot = document.createElement('div')
  dot.style.cssText = `
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${icon.bg};
    box-shadow: 0 0 8px ${icon.glow};
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

  // Add rotate animation for loading symbol
  if (type === 'loading') {
    dot.style.animation = 'donkey-rotate 1.2s linear infinite'
    if (!document.getElementById('donkey-toast-styles')) {
      const styles = document.createElement('style')
      styles.id = 'donkey-toast-styles'
      styles.textContent = `
        @keyframes donkey-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(styles)
    }
  }

  const label = document.createElement('span')
  label.textContent = message

  toast.appendChild(dot)
  toast.appendChild(label)
  document.body.appendChild(toast)

  // Smooth slide up & fade-in
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  })

  if (type !== 'loading') {
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateY(8px)'
      setTimeout(() => toast.remove(), 300)
    }, 3200)
  }
}

// Clickable wall shown when a trial user hits the free-save limit.
function showUpgradeToast() {
  document.getElementById('donkey-toast')?.remove()
  document.getElementById('donkey-panel')?.remove()

  const toast = document.createElement('div')
  toast.id = 'donkey-toast'
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(10, 11, 16, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #f1f5f9;
    padding: 12px 16px;
    border-radius: 14px;
    font-size: 13px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 500;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 280px;
    border: 1px solid rgba(129, 140, 248, 0.3);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  `

  const text = document.createElement('div')
  text.style.cssText = 'line-height: 1.4; color: #e2e8f0;'
  text.innerHTML = `You've used all <b>${DONKEY_FREE_SAVE_LIMIT}</b> free saves. Unlock <b>unlimited memory forever</b> for a one-time $29.`

  const cta = document.createElement('button')
  cta.textContent = 'Get lifetime access — $29'
  cta.style.cssText = `
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    border: none;
    color: #fff;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
  `
  cta.addEventListener('click', () => {
    track('upgrade_clicked', { placement: 'wall' })
    window.open(DONKEY_LTD_URL, '_blank')
    toast.remove()
  })

  const dismiss = document.createElement('span')
  dismiss.textContent = 'Maybe later'
  dismiss.style.cssText = 'font-size: 11px; color: #64748b; cursor: pointer; text-align: center;'
  dismiss.addEventListener('click', () => toast.remove())

  toast.appendChild(text)
  toast.appendChild(cta)
  toast.appendChild(dismiss)
  document.body.appendChild(toast)
}

function showMemoryPanel(items, onReplace, isFirstTime = false) {
  document.getElementById('donkey-toast')?.remove()
  document.getElementById('donkey-panel')?.remove()

  let panelVisible = false
  let remaining = [...items]

  // Panel Container
  const panel = document.createElement('div')
  panel.id = 'donkey-panel'
  panel.style.cssText = `
    position: fixed;
    bottom: 74px;
    right: 24px;
    background: rgba(10, 11, 16, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 6px;
    min-width: 220px;
    z-index: 999999;
    display: none;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  `

  function renderRows() {
    panel.innerHTML = ''
    remaining.forEach(item => {
      const row = document.createElement('div')
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        gap: 16px;
        border-radius: 8px;
        cursor: default;
        transition: background 0.15s ease;
      `
      row.addEventListener('mouseenter', () => row.style.background = 'rgba(255, 255, 255, 0.06)')
      row.addEventListener('mouseleave', () => row.style.background = 'transparent')

      const name = document.createElement('span')
      name.textContent = item.project
      name.style.cssText = `
        font-size: 12px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #e2e8f0;
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
        color: #64748b;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 0;
        flex-shrink: 0;
        transition: color 0.15s, transform 0.15s;
      `
      xBtn.addEventListener('mouseenter', () => {
        xBtn.style.color = '#f43f5e'
        xBtn.style.transform = 'scale(1.1)'
      })
      xBtn.addEventListener('mouseleave', () => {
        xBtn.style.color = '#64748b'
        xBtn.style.transform = 'scale(1)'
      })
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
    background: rgba(10, 11, 16, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #f1f5f9;
    padding: 10px 16px 10px 12px;
    border-radius: 99px;
    font-size: 13px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 500;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
    cursor: pointer;
    user-select: none;
    transition: all 0.25s ease;
  `

  const dot = document.createElement('div')
  dot.style.cssText = `
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
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
  chevron.style.cssText = `
    font-size: 8px; 
    color: #94a3b8; 
    margin-left: 2px;
    transition: transform 0.2s ease;
  `
  chevron.textContent = '▲'

  function updateLabel() {
    const n = remaining.length
    label.textContent = `Injected ${n} ${n === 1 ? 'memory' : 'memories'}`
  }

  toast.addEventListener('click', () => {
    panelVisible = !panelVisible
    panel.style.display = panelVisible ? 'flex' : 'none'
    chevron.textContent = panelVisible ? '▼' : '▲'
    chevron.style.transform = panelVisible ? 'rotate(180deg)' : 'rotate(0deg)'
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
      chevron.style.transform = 'rotate(180deg)'
    }, 600)
    setTimeout(() => {
      panelVisible = false
      panel.style.display = 'none'
      chevron.textContent = '▲'
      chevron.style.transform = 'rotate(0deg)'
    }, 3800)
  }
}

