import * as base from 'net'

export class Server extends base.Server {
  constructor(
    options?: base.ServerOpts,
    connectionListener?: (socket: base.Socket) => void
  ) {
    super(options, connectionListener)
    throw new Error('Cannot create a server')
  }
}

export function createServer(..._args: Parameters<typeof base.createServer>) {
  throw new Error('Cannot create a server inside of Cerus')
}

export function connect(..._args: Parameters<typeof base.connect>) {
  throw new Error('Cannot connect to a socket')
}
