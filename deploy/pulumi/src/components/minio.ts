import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const release = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.helm.v3.Release(
    'cerus-minio',
    {
      name: 'cerus-minio',
      chart: 'minio',
      namespace: config.namespace,
      repositoryOpts: {
        repo: 'https://charts.bitnami.com/bitnami',
      },
      values: {
        global: {
          storageClass: config.minio.storage.class,
        },
        mode: 'distributed',
        auth: {
          rootUser: config.minio.user.name,
          rootPassword: config.minio.user.password,
        },
        persistence: {
          size: config.minio.storage.size,
          storageClass: config.minio.storage.class,
        },
        metrics: {
          enabled: true,
          serviceMonitor: {
            enabled: true,
          },
          prometheusRule: {
            enabled: true,
          },
        },
      },
    },
    { provider, dependsOn }
  )

export default function minio(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  return [release(config, provider, dependsOn)]
}
