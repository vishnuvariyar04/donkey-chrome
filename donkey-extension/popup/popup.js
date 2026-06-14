async function render() {
  const container = document.getElementById('projects')
  const projects = await getAllProjects()

  if (projects.length === 0) {
    container.innerHTML = '<div class="empty">No memories saved yet.<br>Use @donkey save in any AI chat.</div>'
    return
  }

  // Sort by lastUpdated desc
  projects.sort((a, b) => b.lastUpdated - a.lastUpdated)

  container.innerHTML = projects.map(p => `
    <div class="project">
      <div class="project-name">${p.name}</div>
      <div class="project-meta">${p.memoryCount} memory object${p.memoryCount !== 1 ? 's' : ''} · last saved ${new Date(p.lastUpdated).toLocaleDateString()}</div>
    </div>
  `).join('')
}

render()
