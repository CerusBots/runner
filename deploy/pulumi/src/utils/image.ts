import { Configuration } from '../config'

export const githubImage = (config: Configuration, pkg: string) =>
  `ghcr.io/cerusbots/${pkg}:${config.version}`
