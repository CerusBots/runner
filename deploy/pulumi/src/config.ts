import { Config, Output, secret } from '@pulumi/pulumi'
import { parse } from 'yaml'
import { githubImage } from './utils/image'

export interface Configuration {
  kubeConfig: any
  org: string
  name: string
  namespace: string
  dev: boolean
  mode: string
  version: string
  sha: string
  hasNamespace: boolean
  image: string
  botImage: string
  minio: {
    user: {
      name: string
      password: Output<string>
    }
    storage: {
      class: string
      size: string
    }
  }
  kafka: {
    brokers: string[]
    storage: {
      class: string
      size: string
    }
  }
  zookeeper: {
    storage: {
      class: string
      size: string
    }
  }
}

export function createConfig(config: Config): Configuration {
  const name = config.get('name') || 'dev'
  const mode = config.get('mode') || 'development'
  const dev = mode === 'development'
  const namespace = config.get('namespace') || 'cerusbots'
  const org = config.get('org') || 'CerusBots'
  const version = config.get('version') || 'latest'
  const sha = config.get('sha') || 'HEAD'
  const kubeConfigRaw = config.get('kubeconfig')
  const kubeConfig = kubeConfigRaw ? parse(kubeConfigRaw) : undefined
  const storageClass = config.get('storage.class') || 'standard'
  const hasNamespaceRaw = config.getBoolean('hasNamespace')
  const hasNamespace =
    typeof hasNamespaceRaw === 'undefined' ? true : hasNamespaceRaw

  const cfg = {
    name,
    org,
    namespace,
    kubeConfig,
    dev,
    mode,
    version,
    sha,
    hasNamespace,
    image: '',
    botImage: '',
    minio: {
      user: {
        name: config.get('minio.user.name') || 'admin',
        password: config.getSecret('minio.privateKey') || secret('1234567890'),
      },
      storage: {
        class: config.get('minio.storage.class') || storageClass,
        size: config.get('minio.storage.size') || '12Gi',
      },
    },
    kafka: {
      brokers: (
        config.get('env.KAFKA_BROKERS') ||
        `cerus-kafka.${namespace}.svc.cluster.local:9092`
      ).split(','),
      storage: {
        class: config.get('kafka.storage.class') || storageClass,
        size: config.get('kafka.storage.size') || '4Gi',
      },
    },
    zookeeper: {
      storage: {
        class: config.get('zookeeper.storage.class') || storageClass,
        size: config.get('zookeeper.storage.size') || '1Gi',
      },
    },
  }
  return {
    ...cfg,
    image: config.get('image') || githubImage(cfg, 'runner'),
    botImage: config.get('bot.image') || githubImage(cfg, 'bot'),
  }
}
