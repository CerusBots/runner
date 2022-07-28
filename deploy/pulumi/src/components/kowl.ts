import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const release = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.helm.v3.Release(
    'cerus-kowl',
    {
      name: 'cerus-kowl',
      chart: 'kowl',
      namespace: config.namespace,
      repositoryOpts: {
        repo: 'https://raw.githubusercontent.com/cloudhut/charts/master/archives',
      },
      values: {
        kowl: {
          config: {
            kafka: {
              brokers: config.kafka.brokers,
            },
          },
        },
      },
    },
    { provider, dependsOn }
  )

export default function kowl(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return [release(config, provider, dependsOn)]
}
