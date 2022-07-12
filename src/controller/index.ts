import { ok as assert } from 'assert'
import { findPods } from '../kube/pod'
import { findRunners } from '../kube/runner'
import { spawnClient } from '../client'
import config from '../config'
import { DI } from '../di'

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

  const runners = await findRunners()

  const bots = Object.fromEntries(
    runners.map((runner) => {
      assert(typeof runner.metadata.annotations === 'object')
      assert(
        typeof runner.metadata.annotations['runner.cerusbots.com/owned-by'] ===
          'string'
      )
      assert(typeof runner.spec === 'object')
      return [
        runner.metadata.annotations['runner.cerusbots.com/owned-by'],
        runner.spec.bots,
      ]
    })
  )
  console.log(bots)
}
