import { join } from 'path'
import { KafkaConfig } from 'kafkajs'

type EnvType = 'production' | 'development' | 'testing' | 'none'

const env = (process.env.NODE_ENV ?? 'development') as EnvType
const production = env === 'production'

interface Config {
  buildDir: string
  sourceDir: string
  env: EnvType
  production: boolean
  debug: boolean
  namespace: string
  kafka: KafkaConfig
  logLevels: Record<string, string>
}

const config: Config = {
  buildDir: join(__dirname, '..', 'dist'),
  sourceDir: join(__dirname, '..', 'dist'),
  env,
  production,
  debug: !production,
  namespace: process.env.NAMESPACE || 'cerusbots',
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || '').split(','),
    retry: {
      retries: 30,
    },
  },
  logLevels: {
    test: 'error',
    development: 'debug',
    production: 'info',
  },
}

export default config
