import { ok as assert } from 'assert'
import {
  BotRunnerResource,
  BotRunnerListResource,
} from '@cerusbots/common/dist/k8s'
import { getCurrentPod } from './pod'
import { DI } from '../di'
import config from '../config'

export async function findRunners() {
  let runners: BotRunnerResource[] = []
  const iterateRunners = async (cont?: string) => {
    const body = (
      await DI.k8s.api.customObjects.listNamespacedCustomObject(
        'cerusbots.com',
        'v1alpha1',
        config.namespace,
        'botrunners',
        undefined,
        undefined,
        cont
      )
    ).body as BotRunnerListResource
    const itemsLeft =
      typeof body.metadata === 'object' &&
      typeof body.metadata.remainingItemCount === 'number'
        ? body.metadata.remainingItemCount
        : 0

    runners = runners.concat.call(body.items as BotRunnerResource[])
    return itemsLeft > 0 ? body.metadata._continue : undefined
  }

  let cont: string | undefined
  while (typeof (cont = await iterateRunners(cont)) === 'string') {}
  return runners
}

export async function createRunner() {
  const pod = await getCurrentPod()
  const currentRunner = (await findRunners()).find((runner) => {
    assert(typeof runner.metadata.annotations === 'object')
    assert(
      typeof runner.metadata.annotations['runner.cerusbots.com/owned-by'] ===
        'string'
    )
    assert(typeof runner.spec === 'object')
    assert(typeof pod.metadata === 'object')
    assert(typeof pod.metadata.name === 'string')
    return (
      runner.metadata.annotations['runner.cerusbots.com/owned-by'] ===
      pod.metadata.name
    )
  })
  if (typeof currentRunner === 'object')
    await DI.k8s.api.customObjects.deleteNamespacedCustomObject(
      'cerusbots.com',
      'v1alpha1',
      config.namespace,
      'botrunners',
      currentRunner.metadata.name as string
    )

  assert(typeof pod.metadata === 'object')
  assert(
    typeof pod.metadata.ownerReferences === 'object',
    'pod.metadata.ownerReferences is not an array'
  )
  return (
    await DI.k8s.api.customObjects.createNamespacedCustomObject(
      'cerusbots.com',
      'v1alpha1',
      config.namespace,
      'botrunners',
      {
        apiVersion: 'cerusbots.com/v1alpha1',
        kind: 'BotRunner',
        metadata: {
          name: pod.metadata.name,
          namespace: pod.metadata.namespace,
          annotations: {
            'runner.cerusbots.com/owned-by': pod.metadata.name,
          },
          ownerReferences: [
            {
              apiVersion: pod.apiVersion,
              kind: pod.kind,
              name: pod.metadata.name,
              uid: pod.metadata.uid,
              controller: true,
            },
            ...pod.metadata.ownerReferences.map((owner) => ({
              ...owner,
              controller: false,
            })),
          ],
        },
        spec: {
          bots: [],
        },
      }
    )
  ).body as BotRunnerResource
}
