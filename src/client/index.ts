import { hostname } from 'os'
import { getPodType, getCurrentPod } from '../kube/pod'
import config from '../config'
import { DI } from '../di'

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
  return client
}
