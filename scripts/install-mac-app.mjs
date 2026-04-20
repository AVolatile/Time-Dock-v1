import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  renameSync
} from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { signAsync } = require('@electron/osx-sign')
const sourceApp = join(projectRoot, 'dist', 'mac-arm64', 'TimeDock.app')
const targetApp = '/Applications/TimeDock.app'
const backupApp = `/Applications/TimeDock.app.previous-${Date.now()}`
const executable = join(targetApp, 'Contents', 'MacOS', 'TimeDock')
const frameworksDir = join(targetApp, 'Contents', 'Frameworks')
const localEntitlements = join(projectRoot, 'resources', 'entitlements.local.plist')
const unsignedResourceExtensions = new Set([
  '.asar',
  '.bin',
  '.dat',
  '.gif',
  '.icns',
  '.jpg',
  '.jpeg',
  '.pak',
  '.pdf',
  '.png',
  '.tiff',
  '.ttf',
  '.woff',
  '.woff2'
])

function assertBundleSymlinksArePortable(directory) {
  if (!existsSync(directory)) return

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    const stats = lstatSync(fullPath)

    if (stats.isSymbolicLink()) {
      const linkTarget = readlinkSync(fullPath)

      if (linkTarget.startsWith(projectRoot)) {
        throw new Error(`Installed app contains a project-local symlink: ${fullPath} -> ${linkTarget}`)
      }

      continue
    }

    if (stats.isDirectory()) {
      assertBundleSymlinksArePortable(fullPath)
    }
  }
}

async function signInstalledApp() {
  await signAsync({
    app: targetApp,
    identity: '-',
    identityValidation: false,
    preAutoEntitlements: false,
    preEmbedProvisioningProfile: false,
    strictVerify: false,
    hardenedRuntime: true,
    timestamp: false,
    ignore: (filePath) => unsignedResourceExtensions.has(extname(filePath)),
    optionsForFile: (filePath) => {
      if (filePath === targetApp || filePath.endsWith('.app')) {
        return { entitlements: localEntitlements }
      }

      return null
    }
  })
}

if (process.platform !== 'darwin') {
  throw new Error('Local app installation is only supported on macOS.')
}

if (!existsSync(sourceApp)) {
  throw new Error(`Packaged app not found at ${sourceApp}. Run npm run package first.`)
}

if (!existsSync(localEntitlements)) {
  throw new Error(`Local signing entitlements not found at ${localEntitlements}.`)
}

mkdirSync(dirname(targetApp), { recursive: true })

let movedExisting = false

try {
  if (existsSync(targetApp)) {
    renameSync(targetApp, backupApp)
    movedExisting = true
    console.log(`Moved existing TimeDock.app to ${backupApp}`)
  }

  const copy = spawnSync('ditto', [sourceApp, targetApp], {
    encoding: 'utf8'
  })

  if (copy.status !== 0) {
    throw new Error(copy.stderr.trim() || 'Failed to copy TimeDock.app into /Applications.')
  }

  const quarantine = spawnSync('xattr', ['-dr', 'com.apple.quarantine', targetApp], {
    encoding: 'utf8'
  })

  if (quarantine.status !== 0 && quarantine.stderr && !quarantine.stderr.includes('No such xattr')) {
    console.warn(quarantine.stderr.trim())
  }

  if (!existsSync(executable)) {
    throw new Error(`Installed app is missing its executable at ${executable}.`)
  }

  assertBundleSymlinksArePortable(frameworksDir)
  await signInstalledApp()
  console.log('Signed TimeDock for local macOS execution')

  if (movedExisting) {
    rmSync(backupApp, { recursive: true, force: true })
  }

  console.log(`Installed TimeDock to ${targetApp}`)
} catch (error) {
  rmSync(targetApp, { recursive: true, force: true })

  if (movedExisting && existsSync(backupApp)) {
    renameSync(backupApp, targetApp)
    console.error('Restored previous TimeDock.app after install failure.')
  }

  throw error
}
