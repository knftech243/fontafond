/** Propose au navigateur d'enregistrer un fichier généré sur l'appareil. */
export function downloadFile(filename: string, content: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Nom de fichier sûr à partir d'un nom de projet. */
export function safeFileName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'police'
  )
}
