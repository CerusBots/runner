import { BotCode } from '@cerusbots/common/dist/k8s'
import { ok as assert } from 'assert'
import { Volume, createFsFromVolume } from 'memfs'
import http from 'isomorphic-git/http/node'
import git from 'isomorphic-git'
import { Union } from 'unionfs'

async function createGitHubFS(code: BotCode) {
  assert(
    'fromRepo' in code,
    'code.fromRepo must be defined in order for a GitHub fs to be created'
  )

  const fs = createFsFromVolume(new Volume()) as any
  await git.clone({
    dir: '/',
    fs,
    http,
    url: code.fromRepo.url,
    ref: code.fromRepo.ref,
  })
  return fs
}

export default function createFs() {
  const ufs = new Union()
  const memfs = createFsFromVolume(new Volume()) as any
  ufs.use(memfs)
  return ufs
}
