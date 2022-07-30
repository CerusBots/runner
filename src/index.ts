import { getPodType } from './kube/pod'
import winston from './providers/winston'
import { init as initDI } from './di'

async function init() {
  await initDI()
}

init()
  .then(() => void 0)
  .catch((e) => {
    winston.error(e)
    process.exit(1)
  })
