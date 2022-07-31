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
  storage: {
    size: string
  }
  db: {
    root: {
      password: string | Output<string>
    }
    user: {
      password: string | Output<string>
      name: string
    }
    name: string
    storage: {
      class: string
      size: string
    }
  }
  cache: {
    password: string | Output<string>
    storage: {
      class: string
      size: string
    }
  }
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
    storage: {
      size: config.get('storage.size') || '6Gi',
    },
    db: {
      root: {
        password: config.getSecret('db.root.password') || 'db',
      },
      user: {
        name: config.get('db.root.username') || 'runner',
        password: config.getSecret('db.root.password') || 'db',
      },
      name: config.get('db.name') || 'runner',
      storage: {
        class: config.get('db.storage.class') || storageClass,
        size: config.get('db.storage.size') || '4Gi',
      },
    },
    cache: {
      password: config.getSecret('env.REDIS_PASSWORD') || 'cache',
      storage: {
        class: config.get('cache.storage.class') || storageClass,
        size: config.get('cache.storage.size') || '1Gi',
      },
    },
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
