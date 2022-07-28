import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const release = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.helm.v3.Release(
    'cerus-kafka',
    {
      name: 'cerus-kafka',
      chart: 'kafka',
      namespace: config.namespace,
      repositoryOpts: {
        repo: 'https://charts.bitnami.com/bitnami',
      },
      values: {
        global: {
          storageClass: config.kafka.storage.class,
        },
        persistence: {
          size: config.kafka.storage.size,
        },
        zookeeper: {
          persistence: {
            storageClass: config.zookeeper.storage.class,
            size: config.zookeeper.storage.size,
          },
        },
        metrics: {
          enabled: true,
          serviceMonitor: {
            enabled: true,
          },
        },
      },
    },
    { provider, dependsOn }
  )

export default function kafka(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return [release(config, provider, dependsOn)]
}
