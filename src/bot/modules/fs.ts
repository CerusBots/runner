import { BotResource } from '@cerusbots/common/dist/k8s'
import { ok as assert } from 'assert'
import { Volume, createFsFromVolume } from 'memfs'
import http from 'isomorphic-git/http/node'
import git from 'isomorphic-git'
import { Union } from 'unionfs'
import { isLocalDomain, hash } from '../../utils'

export async function createBotFS(bot: BotResource['spec']) {
  assert(typeof bot === 'object', 'Bot argument was not specified')
  const vol = new Volume()
  const fs = createFsFromVolume(vol)
  if (typeof bot.repo === 'object') {
    await git.clone({
      dir: '/',
      fs,
      http: {
        async request(req) {
          const url = new URL(req.url)
          const localDomain = Object.fromEntries(
            Object.entries(isLocalDomain(url.hostname)).filter(
              ([_domain, isLocal]) => isLocal
            )
          )
          if (localDomain.length === 0)
            throw new Error('Cannot use a local domain')
          return await http.request(req)
        },
      },
      url: bot.repo.url,
      ref: bot.repo.ref,
      depth: bot.repo.depth,
    })
  }

  if (typeof bot.commands === 'object' && Array.isArray(bot.commands)) {
    if (!fs.existsSync('/commands')) fs.mkdirpSync('/commands')
    bot.commands.forEach((command) => {
      if ('spec' in command) {
        const p = `/commands/${command.spec.name}`
        if (!fs.existsSync(p))
          fs.writeFileSync(p, command.spec.code.fromString.value)
      }
    })
  }

  if (typeof bot.messageHooks === 'object' && Array.isArray(bot.messageHooks)) {
    if (!fs.existsSync('/messageHooks')) fs.mkdirpSync('/messageHooks')
    bot.messageHooks.forEach((messageHook) => {
      if ('spec' in messageHook) {
        const p = `/messageHooks/${hash(messageHook.spec.regex.source)}`
        if (!fs.existsSync(p))
          fs.writeFileSync(p, messageHook.spec.code.fromString.value)
      }
    })
  }

  if (typeof bot.webhooks === 'object' && Array.isArray(bot.webhooks)) {
    if (!fs.existsSync('/webhooks')) fs.mkdirpSync('/webhooks')
    bot.webhooks.forEach((webhook) => {
      if ('spec' in webhook) {
        const p = `/messageHooks/${webhook.spec.id}`
        if (!fs.existsSync(p))
          fs.writeFileSync(p, webhook.spec.code.fromString.value)
      }
    })
  }
  return { fs, vol }
}

export default function createFs() {
  const ufs = new Union()
  const memfs = createFsFromVolume(new Volume()) as any
  ufs.use(memfs)
  return ufs
}
