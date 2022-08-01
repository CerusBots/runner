import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from './config'

import adminer from './components/adminer'
import cache from './components/cache'
import csi from './components/csi'
import db from './components/db'
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
  const dbRes = db(config, provider, dependsOn)
  const cacheRes = cache(config, provider, dependsOn)
  const runnerRes = runner(config, provider, [
    ...dependsOn,
    ...kafkaRes,
    ...minioRes,
    ...csiRes,
    ...dbRes,
    ...cacheRes,
  ])
  const baseRes = [...dependsOn, ...runnerRes]
  if (config.dev) {
    const kowlRes = kowl(config, provider, [...dependsOn, ...kafkaRes])
    const adminerRes = adminer(config, provider, [...dependsOn, ...dbRes])
    return [...baseRes, ...kowlRes, ...adminerRes]
  }
  return baseRes
}
