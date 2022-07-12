import initClient from './client'
import initController from './controller'
import { getPodType } from './kube/pod'
import winston from './providers/winston'
import { init as initDI } from './di'

async function init() {
  await initDI()

  const type = await getPodType()
  if (type === 'controller') {
    await initController()
  } else {
    await initClient()
  }
}

init()
  .then(() => void 0)
  .catch((e) => {
    winston.error(e)
    process.exit(1)
  })
