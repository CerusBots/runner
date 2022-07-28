import { BotResource } from '@cerusbots/common/dist/k8s'
import { DI } from '../di'
import winston from '../providers/winston'

export default async function initBot() {
  // TODO: process.on('message', ({ message }) => {})
  winston.debug('Bot is online')
}
