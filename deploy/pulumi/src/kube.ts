import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from './config'

import crds from './components/crds'
import kafka from './components/kafka'
import kowl from './components/kowl'
import namespace from './components/namespace'
import runner from './components/runner'

export function createKube(config: Configuration, provider?: k8s.Provider) {
  const dependsOn: pulumi.Resource[] = []
  if (!config.hasNamespace) dependsOn.push(namespace(config, provider))
  else dependsOn.push(new pulumi.StackReference(`CerusBots/k8s/${config.name}`))
  const crdsRes = crds(config, provider, dependsOn)
  const kafkaRes = kafka(config, provider, dependsOn)
  const runnerRes = runner(config, provider, [
    ...dependsOn,
    ...crdsRes,
    ...kafkaRes,
  ])
  const baseRes = [...dependsOn, ...crdsRes, ...runnerRes]
  if (config.dev) {
    const kowlRes = kowl(config, provider, [...dependsOn, ...kafkaRes])
    return [...baseRes, ...kowlRes]
  }
  return baseRes
}
