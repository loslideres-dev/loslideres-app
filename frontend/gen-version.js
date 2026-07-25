// Genera public/version.json con la versión del package.json, número de build y fecha.
// Se ejecuta automáticamente antes de cada dev y build.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = __dirname

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

// Build number = número total de commits en git (incremental y automático)
let build = '0'
try {
  build = execSync('git rev-list --count HEAD', { cwd: root }).toString().trim()
} catch {
  build = '0'
}

// Hash corto del commit actual
let commit = 'local'
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
} catch {
  commit = 'local'
}

const info = {
  version: pkg.version,
  build,
  commit,
  date: new Date().toISOString(),
}

const publicDir = join(root, 'public')
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true })

writeFileSync(join(publicDir, 'version.json'), JSON.stringify(info, null, 2))
console.log(`✓ version.json generado: v${info.version} (build ${info.build}, ${info.commit})`)
