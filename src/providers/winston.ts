import { hostname } from 'os'
import { createLogger, format, transports } from 'winston'
import TransportStream from 'winston-transport'
import config from '../config'
import { DI } from '../di'
import { CompressionTypes, Producer } from 'kafkajs'

class KafkaTransport extends TransportStream {
  private producer?: Producer

  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts)
  }

  log(info: object, next: () => void) {
    this.getProducer()
      .then((producer) => {
        if (typeof producer === 'object') {
          producer
            .send({
              topic: 'cerus-runner-log',
              messages: [{ value: JSON.stringify(info), key: hostname() }],
              compression: CompressionTypes.GZIP,
            })
            .then(() => next())
            .catch((e) => console.error(e))
        } else {
          next()
        }
      })
      .catch((e) => {
        console.error(e)
      })
  }

  private async getProducer() {
    if (typeof this.producer !== 'object') {
      if (typeof DI.kafka !== 'object') return undefined

      this.producer = DI.kafka.producer({
        allowAutoTopicCreation: true,
      })

      await this.producer.connect()
    }

    return this.producer
  }
}

const logger = createLogger({
  level: config.logLevels[config.env],
  format: format.combine(format.colorize(), format.splat(), format.simple()),
  transports: [new transports.Console(), new KafkaTransport()],
})
export default logger
