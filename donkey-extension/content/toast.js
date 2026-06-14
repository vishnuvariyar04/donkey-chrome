function showToast(message, type = 'info') {
  // Remove existing toast
  document.getElementById('donkey-toast')?.remove()

  const colors = {
    loading: '#6B7280',
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6'
  }

  const toast = document.createElement('div')
  toast.id = 'donkey-toast'
  toast.textContent = `🫏 ${message}`
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${colors[type]};
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-family: sans-serif;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: opacity 0.3s;
  `

  document.body.appendChild(toast)

  if (type !== 'loading') {
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }
}
