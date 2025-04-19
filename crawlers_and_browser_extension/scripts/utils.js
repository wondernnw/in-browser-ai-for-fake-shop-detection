import { clearLine, cursorTo } from 'readline'

/**
 * @param {string} content
 */
export function updateLine(content) {
  clearLine(process.stdout, 0)
  cursorTo(process.stdout, 0)
  process.stdout.write(content)
}

/**
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60
  const minutes = Math.floor(ms / (1000 * 60)) % 60
  const hours = Math.floor(ms / (1000 * 60 * 60))

  const pad = (/** @type {number} */ num) => String(num).padStart(2, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
