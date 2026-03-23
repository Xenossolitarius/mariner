import { FILES } from '../constants'
import { getJSON } from '../utils/json'
import Ajv from 'ajv'

export type FleetMode = 'shared' | 'isolated'

export type FleetEntry = {
  apps: string[]
  mode: FleetMode
}

export type FleetConfig = Record<string, FleetEntry>

/**
 * Accepts both legacy format (string[]) and new format ({ apps, mode }).
 * Legacy entries are normalized to { apps: [...], mode: 'isolated' }.
 */
type RawFleetConfig = Record<string, string[] | FleetEntry>

const schema = {
  type: 'object',
  additionalProperties: {
    oneOf: [
      {
        type: 'array',
        items: { type: 'string' },
      },
      {
        type: 'object',
        properties: {
          apps: { type: 'array', items: { type: 'string' } },
          mode: { type: 'string', enum: ['shared', 'isolated'] },
        },
        required: ['apps', 'mode'],
        additionalProperties: false,
      },
    ],
  },
  required: [],
}

export const validateFleetSchema = (fleet: RawFleetConfig) => {
  const ajv = new Ajv()
  const validate = ajv.compile(schema)
  return validate(fleet)
}

export const normalizeFleetConfig = (raw: RawFleetConfig): FleetConfig => {
  const normalized: FleetConfig = {}

  for (const [name, entry] of Object.entries(raw)) {
    if (Array.isArray(entry)) {
      normalized[name] = { apps: entry, mode: 'isolated' }
    } else {
      normalized[name] = entry
    }
  }

  return normalized
}

export const getFleetConfig = async (): Promise<FleetConfig | null | false> => {
  const fleet = await getJSON<RawFleetConfig>(FILES.fleet)

  if (!fleet) return null
  if (!validateFleetSchema(fleet)) return false

  return normalizeFleetConfig(fleet)
}
