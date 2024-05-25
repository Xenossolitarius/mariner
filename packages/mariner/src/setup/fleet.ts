import { FILES } from '../constants'
import { getJSON } from '../utils/json'
import Ajv, { type JSONSchemaType } from 'ajv'

export type Fleet = string[]

export type FleetConfig = Record<string, Fleet>

const schema: JSONSchemaType<FleetConfig> = {
  type: 'object',
  additionalProperties: {
    type: 'array',
    items: {
      type: 'string',
    },
    required: [],
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
