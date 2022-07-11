import { Config } from '@pulumi/pulumi'
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
  kafka: {
    brokers: string[]
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
    kafka: {
      brokers: (
        config.get('env.KAFKA_BROKERS') ||
        `cerus-kafka.${namespace}.svc.cluster.local:9092`
      ).split(','),
    },
  }
  return {
    ...cfg,
    image: config.get('image') || githubImage(cfg, 'runner'),
  }
}