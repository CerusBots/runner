import { getPodType } from './kube/pod'
import winston from './providers/winston'
import initController from './controller'
import { init as initDI, DI } from './di'

async function init() {
  await initDI()
  const type = await getPodType()
  if (type === 'controller') {
    await initController()
  } else {
    winston.info('Cerus bot runner is online')
  }
}

init()
  .then(() => void 0)
  .catch((e) => {
    winston.error(e)
    process.exit(1)
  })
