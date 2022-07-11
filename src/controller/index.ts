import { findPods } from '../kube/pod'
import { DI } from '../di'
import { spawnClient } from '../client'

export default async function initController() {
  const pods = await findPods()

  const controllers = pods.filter((pod) => {
    if (typeof pod.metadata !== 'object') return false
    if (typeof pod.metadata.annotations !== 'object') return false
    return (
      pod.metadata.annotations['runner.cerusbots.com/type'] === 'controller'
    )
  })

  const clients = pods.filter((pod) => {
    if (typeof pod.metadata !== 'object') return false
    if (typeof pod.metadata.annotations !== 'object') return false
    return pod.metadata.annotations['runner.cerusbots.com/type'] === 'client'
  })

  if (clients.length === 0) clients.push(await spawnClient())

  const bots = Object.fromEntries(
    await Promise.all(
      clients.map(async (client) => [
        client.metadata?.name,
        await DI.ipc.discoverBots(client.metadata?.name + '-client'),
      ])
    )
  ) as Record<string, string[]>
  console.log(bots, controllers, clients)
}
