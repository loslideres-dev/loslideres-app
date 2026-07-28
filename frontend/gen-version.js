// Genera public/version.json con la versión del package.json, número de build y fecha.
// Se ejecuta automáticamente antes de cada dev y build.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = __dirname

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

// Build number:
// 1. En Railway: usa RAILWAY_GIT_COMMIT_SHA (primeros 7 chars) como referencia
//    y deriva el build de la versión (major*10000 + minor*100 + patch) + offset fijo
// 2. En local: cuenta commits git normalmente
// 3. Fallback: deriva de la versión
let build = '0'
try {
  const isRailway = !!process.env.RAILWAY_GIT_COMMIT_SHA
  if (isRailway) {
    // En Railway el shallow clone no tiene historial completo.
    // Derivamos un build number incremental desde la versión semántica.
    // v0.4.1 → (0*10000 + 4*100 + 1) + 100 base = 501
    const [major, minor, patch] = pkg.version.split('.').map(Number)
    const versionBuild = (major * 10000) + (minor * 100) + patch + 100
    build = String(versionBuild)
  } else {
    // Local: conteo real de commits
    build = execSync('git rev-list --count HEAD', { cwd: root }).toString().trim()
  }
} catch {
  const [major, minor, patch] = pkg.version.split('.').map(Number)
  build = String((major * 10000) + (minor * 100) + patch + 100)
}

// Hash corto del commit actual
let commit = 'local'
try {
  // Railway inyecta el SHA completo — tomamos los primeros 7 chars
  commit = process.env.RAILWAY_GIT_COMMIT_SHA
    ? process.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7)
    : execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
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