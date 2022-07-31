import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const release = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.helm.v3.Release(
    'cerus-adminer',
    {
      name: 'cerus-adminer',
      chart: 'adminer',
      namespace: config.namespace,
      repositoryOpts: {
        repo: 'https://cetic.github.io/helm-charts',
      },
      values: {
        config: {
          design: 'dracula',
          externalserver: 'mariadb',
        },
      },
    },
    { provider, dependsOn }
  )

export default function adminer(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return [release(config, provider, dependsOn)]
}
