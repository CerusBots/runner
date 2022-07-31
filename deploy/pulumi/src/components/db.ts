import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const release = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.helm.v3.Release(
    'cerus-db',
    {
      name: 'cerus-db',
      chart: 'mariadb',
      namespace: config.namespace,
      repositoryOpts: {
        repo: 'https://charts.bitnami.com/bitnami',
      },
      values: {
        global: {
          storageClass: config.db.storage.class,
        },
        auth: {
          rootPassword: config.db.root.password,
          password: config.db.user.password,
          username: config.db.user.name,
          database: config.db.name,
        },
        architecture: 'replication',
        primary: {
          persistence: {
            size: config.db.storage.size,
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

export default function db(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return [release(config, provider, dependsOn)]
}
