export enum ServerCommands {
  SERVE = 'serve',
  BUILD = 'build',
}

export type ServerCommand = `${ServerCommands}`
