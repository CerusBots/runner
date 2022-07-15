import cluster from 'cluster'
import initBot from './bot'
import initClient from './client'
import initController from './controller'
import { getPodType } from './kube/pod'
import winston from './providers/winston'
import { init as initDI } from './di'

async function init() {
  if (cluster.isPrimary) {
    await initDI()

    const type = await getPodType()
    if (type === 'controller') {
      await initController()
    } else {
      await initClient()
    }
  } else {
    await initBot()
  }
}

init()
  .then(() => void 0)
  .catch((e) => {
    winston.error(e)
    process.exit(1)
  })
