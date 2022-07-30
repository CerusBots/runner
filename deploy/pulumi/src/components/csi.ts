import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import { Configuration } from '../config'

export const serviceAccounts = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  ['csi-controller-rclone', 'csi-nodeplugin-rclone'].map(
    (name) =>
      new k8s.core.v1.ServiceAccount(
        name,
        {
          metadata: {
            name: name,
            namespace: 'kube-system',
          },
        },
        { provider, dependsOn }
      )
  )

export const clusterRoles = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  Object.entries({
    'external-controller-rclone': [
      {
        apiGroups: [''],
        resources: ['persistentvolumes'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: [''],
        resources: ['nodes'],
        verbs: ['get', 'list', 'watch'],
      },
      {
        apiGroups: ['csi.storage.k8s.io'],
        resources: ['csinodeinfos'],
        verbs: ['get', 'list', 'watch'],
      },
      {
        apiGroups: ['storage.k8s.io'],
        resources: ['volumeattachments'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: ['storage.k8s.io'],
        resources: ['volumeattachments/status'],
        verbs: ['patch'],
      },
      {
        apiGroups: ['coordination.k8s.io'],
        resources: ['leases'],
        verbs: ['get', 'create', 'update'],
      },
      {
        apiGroups: [''],
        resources: ['events'],
        verbs: ['create'],
      },
    ],
    'csi-nodeplugin-rclone': [
      {
        apiGroups: [''],
        resources: ['persistentvolumes'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: [''],
        resources: ['secrets', 'secret'],
        verbs: ['get', 'list'],
      },
      {
        apiGroups: [''],
        resources: ['nodes'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: ['storage.k8s.io'],
        resources: ['volumeattachments'],
        verbs: ['get', 'list', 'watch', 'update'],
      },
      {
        apiGroups: [''],
        resources: ['events'],
        verbs: ['get', 'list', 'watch', 'create', 'update', 'patch'],
      },
    ],
  }).map(
    ([name, rules]) =>
      new k8s.rbac.v1.ClusterRole(
        name,
        {
          metadata: {
            name,
          },
          rules,
        },
        { provider, dependsOn }
      )
  )

export const clusterRoleBindings = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  Object.entries({
    'csi-attacher-role-rclone': [
      'csi-controller-rclone',
      'external-controller-rclone',
    ],
    'csi-nodeplugin-rclone': ['csi-nodeplugin-rclone', 'csi-nodeplugin-rclone'],
  }).map(
    ([name, [subject, role]]) =>
      new k8s.rbac.v1.ClusterRoleBinding(
        name,
        {
          metadata: {
            name: name,
          },
          subjects: [
            {
              kind: 'ServiceAccount',
              name: subject,
              namespace: 'kube-system',
            },
          ],
          roleRef: {
            kind: 'ClusterRole',
            name: role,
            apiGroup: 'rbac.authorization.k8s.io',
          },
        },
        { provider, dependsOn }
      )
  )

export const csiDriver = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.storage.v1.CSIDriver(
    'csi-rclone',
    {
      metadata: {
        name: 'csi-rclone',
        namespace: 'kube-system',
      },
      spec: {
        attachRequired: true,
        podInfoOnMount: false,
      },
    },
    { provider, dependsOn }
  )

export const statefulSet = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apps.v1.StatefulSet(
    'csi-controller-rclone',
    {
      metadata: {
        name: 'csi-controller-rclone',
        namespace: 'kube-system',
        labels: {
          app: 'csi-controller-rclone',
        },
      },
      spec: {
        serviceName: 'csi-controller-rclone',
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'csi-controller-rclone',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'csi-controller-rclone',
            },
          },
          spec: {
            serviceAccount: 'csi-controller-rclone',
            containers: [
              {
                name: 'csi-attacher',
                image: 'k8s.gcr.io/sig-storage/csi-attacher:v3.4.0',
                imagePullPolicy: 'IfNotPresent',
                args: [
                  '--v=5',
                  '--csi-address=$(ADDRESS)',
                  '--leader-election',
                ],
                env: [
                  {
                    name: 'ADDRESS',
                    value: '/csi/csi.sock',
                  },
                ],
                volumeMounts: [
                  {
                    name: 'socket-dir',
                    mountPath: '/csi',
                  },
                ],
              },
              {
                name: 'rclone',
                image: 'wunderio/csi-rclone:v1.2.8',
                args: ['--nodeid=$(NODE_ID)', '--endpoint=$(CSI_ENDPOINT)'],
                imagePullPolicy: 'Always',
                env: [
                  {
                    name: 'NODE_ID',
                    valueFrom: {
                      fieldRef: {
                        fieldPath: 'spec.nodeName',
                      },
                    },
                  },
                  {
                    name: 'CSI_ENDPOINT',
                    value: 'unix://plugin/csi.sock',
                  },
                ],
                volumeMounts: [
                  {
                    name: 'socket-dir',
                    mountPath: '/plugin',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'socket-dir',
                emptyDir: {},
              },
            ],
          },
        },
      },
    },
    { provider, dependsOn }
  )

export const daemonSet = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.apps.v1.DaemonSet(
    'csi-nodeplugin-rclone',
    {
      metadata: {
        name: 'csi-nodeplugin-rclone',
        namespace: 'kube-system',
        labels: {
          app: 'csi-nodeplugin-rclone',
        },
      },
      spec: {
        selector: {
          matchLabels: {
            app: 'csi-nodeplugin-rclone',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'csi-nodeplugin-rclone',
            },
          },
          spec: {
            serviceAccount: 'csi-nodeplugin-rclone',
            hostNetwork: true,
            dnsPolicy: 'ClusterFirstWithHostNet',
            containers: [
              {
                name: 'node-driver-registrar',
                image:
                  'k8s.gcr.io/sig-storage/csi-node-driver-registrar:v2.4.0',
                args: [
                  '--kubelet-registration-path=/var/lib/kubelet/plugins/csi-rclone/csi.sock',
                  '--v=5',
                  '--csi-address=/plugin/csi.sock',
                ],
                env: [
                  {
                    name: 'KUBE_NODE_NAME',
                    valueFrom: {
                      fieldRef: {
                        fieldPath: 'spec.nodeName',
                      },
                    },
                  },
                ],
                lifecycle: {
                  preStop: {
                    exec: {
                      command: [
                        '/bin/sh',
                        '-c',
                        'rm -rf /registration/csi-rclone /registration/csi-rclone-reg.sock',
                      ],
                    },
                  },
                },
                volumeMounts: [
                  {
                    name: 'plugin-dir',
                    mountPath: '/plugin',
                  },
                  {
                    name: 'registration-dir',
                    mountPath: '/registration',
                  },
                ],
              },
              {
                name: 'rclone',
                securityContext: {
                  privileged: true,
                  capabilities: {
                    add: ['SYS_ADMIN'],
                  },
                  allowPrivilegeEscalation: true,
                },
                image: 'wunderio/csi-rclone:v1.2.8',
                imagePullPolicy: 'Always',
                args: ['--endpoint=$(CSI_ENDPOINT)', '--nodeid=$(NODE_ID)'],
                env: [
                  {
                    name: 'CSI_ENDPOINT',
                    value: 'unix:///plugin/csi.sock',
                  },
                  {
                    name: 'NODE_ID',
                    valueFrom: {
                      fieldRef: {
                        fieldPath: 'spec.nodeName',
                      },
                    },
                  },
                ],
                lifecycle: {
                  postStart: {
                    exec: {
                      command: [
                        '/bin/sh',
                        '-c',
                        "mount -t fuse.rclone | while read -r mount; do umount $(echo $mount | awk '{print $3}') ; done",
                      ],
                    },
                  },
                },
                volumeMounts: [
                  {
                    name: 'plugin-dir',
                    mountPath: '/plugin',
                  },
                  {
                    name: 'pods-mount-dir',
                    mountPath: '/var/lib/kubelet/pods',
                    mountPropagation: 'Bidirectional',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'registration-dir',
                hostPath: {
                  path: '/var/lib/kubelet/plugins_registry',
                  type: 'DirectoryOrCreate',
                },
              },
              {
                name: 'plugin-dir',
                hostPath: {
                  path: '/var/lib/kubelet/plugins/csi-rclone',
                  type: 'DirectoryOrCreate',
                },
              },
              {
                name: 'pods-mount-dir',
                hostPath: {
                  path: '/var/lib/kubelet/pods',
                  type: 'Directory',
                },
              },
            ],
          },
        },
      },
    },
    { provider, dependsOn }
  )

export const storageClass = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.storage.v1.StorageClass(
    'rclone',
    {
      metadata: {
        name: 'rclone',
      },
      provisioner: 'kubernetes.io/no-provisioner',
      volumeBindingMode: 'WaitForFirstConsumer',
    },
    { provider, dependsOn }
  )

export const secret = (
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) =>
  new k8s.core.v1.Secret('rclone-secret', {
    metadata: {
      name: 'rclone-secret',
      namespace: 'kube-system',
    },
    stringData: {
      remote: 's3',
      remotePath: 'cerus-runner',
      's3-provider': 'Minio',
      's3-endpoint': `http://cerus-minio.${config.namespace}.svc.cluster.local:9000`,
      's3-access-key-id': config.minio.user.name,
      's3-secret-access-key': config.minio.user.password,
    },
  })

export default function csi(
  config: Configuration,
  provider?: k8s.Provider,
  dependsOn?: pulumi.Resource[]
) {
  const serviceAccountsRes = serviceAccounts(config, provider, dependsOn)
  const clusterRolesRes = clusterRoles(config, provider, dependsOn)
  const clusterRoleBindingsRes = clusterRoleBindings(config, provider, [
    ...dependsOn,
    ...clusterRolesRes,
  ])
  const statefulSetRes = statefulSet(config, provider, [
    ...dependsOn,
    ...clusterRoleBindingsRes,
  ])
  const daemonSetRes = daemonSet(config, provider, [
    ...dependsOn,
    ...serviceAccountsRes,
  ])
  const csiDriverRes = csiDriver(config, provider, [
    ...dependsOn,
    ...serviceAccountsRes,
    statefulSetRes,
    daemonSetRes,
  ])
  const secretRes = secret(config, provider, dependsOn)
  const storageClassRes = storageClass(config, provider, [
    ...dependsOn,
    daemonSetRes,
    secretRes,
    csiDriverRes,
  ])
  return [storageClassRes]
}
