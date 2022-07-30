import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from './config'

import csi from './components/csi'
import kafka from './components/kafka'
import kowl from './components/kowl'
import minio from './components/minio'
import namespace from './components/namespace'
import runner from './components/runner'

export function createKube(config: Configuration, provider?: k8s.Provider) {
  const dependsOn: pulumi.Resource[] = []
  if (!config.hasNamespace) dependsOn.push(namespace(config, provider))
  else dependsOn.push(new pulumi.StackReference(`CerusBots/k8s/${config.name}`))
  const kafkaRes = kafka(config, provider, dependsOn)
  const minioRes = minio(config, provider, dependsOn)
  const csiRes = csi(config, provider, [...dependsOn, ...minioRes])
  const runnerRes = runner(config, provider, [
    ...dependsOn,
    ...kafkaRes,
    ...minioRes,
    ...csiRes,
  ])
  const baseRes = [...dependsOn, ...runnerRes]
  if (config.dev) {
    const kowlRes = kowl(config, provider, [...dependsOn, ...kafkaRes])
    return [...baseRes, ...kowlRes]
  }
  return baseRes
}
