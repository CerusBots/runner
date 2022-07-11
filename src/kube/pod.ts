import { ok as assert } from 'assert'
import { V1Pod } from '@kubernetes/client-node'
import { hostname } from 'os'
import { DI } from '../di'
import config from '../config'

export type PodType = 'controller' | 'client'

export async function findPods() {
  let pods: V1Pod[] = []
  const iteratePods = async (cont?: string) => {
    const { body } = await DI.k8s.api.core.listNamespacedPod(
      config.namespace,
      undefined,
      undefined,
      cont
    )
    const itemsLeft =
      typeof body.metadata === 'object' &&
      typeof body.metadata.remainingItemCount === 'number'
        ? body.metadata.remainingItemCount
        : 0

    pods = pods.concat.call(
      body.items.filter((pod) => {
        if (typeof pod.metadata !== 'object') return false
        if (typeof pod.metadata.annotations !== 'object') return false
        return (
          typeof pod.metadata.annotations['runner.cerusbots.com/type'] !==
          'undefined'
        )
      })
    )
    return itemsLeft > 0 ? body.metadata?._continue : undefined
  }

  let cont: string | undefined
  while (typeof (cont = await iteratePods(cont)) === 'string') {}
  return pods
}

export async function getCurrentPod() {
  return (await DI.k8s.api.core.readNamespacedPod(hostname(), config.namespace))
    .body
}

export async function getPodType() {
  const pod = await getCurrentPod()
  assert(typeof pod.metadata === 'object', 'pod.metadata is undefined')
  assert(
    typeof pod.metadata.annotations === 'object',
    'pod.metadata.annotations is undefined'
  )
  const value = pod.metadata.annotations['runner.cerusbots.com/type']
  assert(
    value === 'controller' || value === 'client',
    'Value is not controller nor client'
  )
  return value as PodType
}
