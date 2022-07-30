import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const pvc = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.core.v1.PersistentVolumeClaim(
    'cerus-runner',
    {
      metadata: {
        namespace: config.namespace,
        name: 'cerus-runner',
      },
      spec: {
        accessModes: ['ReadWriteMany'],
        storageClassName: 'cerus-csi-s3',
        resources: {
          requests: {
            storage: '5Gi',
          },
        },
      },
    },
    { provider, dependsOn }
  )

export const serviceAccount = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.core.v1.ServiceAccount(
    'cerus-runner',
    {
      metadata: {
        name: 'cerus-runner',
        namespace: config.namespace,
      },
      automountServiceAccountToken: true,
    },
    { provider, dependsOn }
  )

export const role = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.rbac.v1.Role(
    'cerus-runner',
    {
      metadata: {
        name: 'cerus-runner',
        namespace: config.namespace,
      },
      rules: [
        {
          apiGroups: ['*'],
          resources: ['*'],
          verbs: ['*'],
        },
      ],
    },
    { provider, dependsOn }
  )

export const roleBinding = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.rbac.v1.RoleBinding(
    'cerus-runner',
    {
      metadata: {
        name: 'cerus-runner',
        namespace: config.namespace,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: 'cerus-runner',
          namespace: config.namespace,
        },
      ],
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Role',
        name: 'cerus-runner',
      },
    },
    { provider, dependsOn }
  )

export const deployment = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apps.v1.Deployment(
    'cerus-runner-controller',
    {
      metadata: {
        labels: {
          app: 'cerus-runner',
        },
        annotations: {
          'runner.cerusbots.com/type': 'controller',
        },
        name: 'cerus-runner',
        namespace: config.namespace,
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'cerus-runner',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'cerus-runner',
            },
            annotations: {
              'runner.cerusbots.com/type': 'controller',
            },
          },
          spec: {
            serviceAccountName: 'cerus-runner',
            serviceAccount: 'cerus-runner',
            containers: [
              {
                image: config.image,
                imagePullPolicy: config.dev ? 'IfNotPresent' : 'Always',
                name: 'cerus-runner',
                env: [
                  {
                    name: 'KAFKA_BROKERS',
                    value: config.kafka.brokers.join(','),
                  },
                  {
                    name: 'NAMESPACE',
                    value: config.namespace,
                  },
                  {
                    name: 'BOT_IMAGE',
                    value: config.botImage,
                  },
                  {
                    name: 'STORE_PATH',
                    value: '/mnt/runner',
                  },
                ],
                volumeMounts: [
                  {
                    name: 'cerus-runner',
                    mountPath: '/mnt/runner',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'cerus-runner',
                persistentVolumeClaim: {
                  claimName: 'cerus-runner',
                },
              },
            ],
          },
        },
      },
    },
    { provider, dependsOn }
  )

export default function runner(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  dependsOn = dependsOn || []
  const serviceAccountRes = serviceAccount(config, provider, dependsOn)
  const roleRes = role(config, provider, [...dependsOn, serviceAccountRes])
  const roleBindingRes = roleBinding(config, provider, [
    ...dependsOn,
    serviceAccountRes,
    roleRes,
  ])
  const pvcRes = pvc(config, provider, dependsOn)
  const deploymentRes = deployment(config, provider, [
    ...dependsOn,
    serviceAccountRes,
    roleRes,
    roleBindingRes,
    pvcRes,
  ])
  return [serviceAccountRes, roleRes, roleBindingRes, deploymentRes]
}
