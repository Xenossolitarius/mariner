import { FILES } from '../constants'
import { getJSON } from '../utils/json'
import type { ConfigEnv } from 'vite'
import Ajv, { type JSONSchemaType } from 'ajv'

export type Fleet = {
  [K in ConfigEnv['command']]: string[]
}

export type FleetConfig = Record<string, Fleet>

const schema: JSONSchemaType<FleetConfig> = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      build: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      serve: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    required: ['build', 'serve'],
  },
  required: [],
}

export const validateFleetSchema = (fleet: FleetConfig) => {
  const ajv = new Ajv()

  const validate = ajv.compile(schema)

  return validate(fleet)
}

export const getFleetConfig = async () => {
  const fleet = await getJSON<FleetConfig>(FILES.fleet)

  return fleet && validateFleetSchema(fleet) && fleet
}
