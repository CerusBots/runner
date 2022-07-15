import cluster, { Worker } from 'cluster'
import { hostname } from 'os'
import { BotRunnerResource } from '@cerusbots/common/dist/k8s'
import { getPodType, getCurrentPod } from '../kube/pod'
import { createRunner } from '../kube/runner'
import winston from '../providers/winston'
import config from '../config'
import { DI } from '../di'

interface BotContext {
  worker: Worker
}

async function waitForClient(name: string) {
  let isReady = false
  const wait = async () => {
    const { body } = await DI.k8s.api.core.readNamespacedPodStatus(
      name,
      config.namespace
    )
    const isReady =
      typeof body.status === 'object' &&
      typeof body.status.containerStatuses === 'object'
        ? body.status.containerStatuses.findIndex((stat) => stat.ready) > -1 &&
          body.status.phase === 'Running'
        : false
    return isReady
  }

  const sleep = () =>
    new Promise<boolean>((resolve, reject) =>
      setTimeout(() => wait().then(resolve).catch(reject), 10000)
    )
  while (!isReady) isReady = await sleep()
}

export async function spawnClient() {
  const type = await getPodType()
  const pod = await getCurrentPod()

  if (type === 'client')
    throw new Error('Only clients may be spawned by controllers')

  const client = (
    await DI.k8s.api.core.createNamespacedPod(config.namespace, {
      metadata: {
        labels: {
          app: 'cerus-runner',
        },
        annotations: {
          'runner.cerusbots.com/type': 'client',
          'runner.cerusbots.com/owned-by': hostname(),
        },
        ownerReferences: [
          {
            apiVersion: pod.apiVersion as string,
            kind: pod.kind as string,
            name: pod.metadata?.name as string,
            uid: pod.metadata?.uid as string,
            controller: true,
          },
        ],
        generateName: 'cerus-runner-',
      },
      spec: pod.spec,
    })
  ).body

  await waitForClient(client.metadata?.name as string)
  return (
    await DI.k8s.api.core.readNamespacedPod(
      client.metadata?.name as string,
      config.namespace
    )
  ).body
}

export default async function initClient() {
  const runner = await createRunner()
  const bots: Record<string, BotContext> = {}

  await DI.k8s.watch.watch(
    `/apis/${runner.apiVersion}/namespaces/${runner.metadata.namespace}/botrunners`,
    {
      fieldSelector: `metadata.name=${runner.metadata.name}`,
    },
    (_type: any, _apiObj: any, obj: BotRunnerResource) => {
      if (typeof obj.spec === 'object') {
        const addedBots = obj.spec.bots.filter(
          (botName) => !Object.keys(bots).includes(botName)
        )
        const removedBots = Object.keys(bots).filter(
          (botName) => !obj.spec?.bots.includes(botName)
        )

        winston.debug(
          `bots have changed for this runner, dropping ${removedBots.join(
            ', '
          )}; adding ${addedBots.join(', ')}`
        )

        // TODO: check if the listed bots are valid objects
        for (const name of removedBots) {
          const bot = bots[name]
          bot.worker.kill()
          delete bots[name]
        }

        for (const name of addedBots) {
          const worker = cluster.fork({
            BOT_NAME: name,
          })

          worker.on('exit', () => {
            winston.debug(`bot ${name} has shut down`)
            delete bots[name]
          })

          worker.on('online', () => {
            winston.debug(`bot ${name} is online`)
            bots[name] = { worker }
          })
        }
      }
    },
    () => void 0
  )
  winston.info('Cerus bot runner is online')
}
