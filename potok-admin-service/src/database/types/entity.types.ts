export type EntityName = 
  | 'users' 
  | 'tasks' 
  | 'user_states' 
  | 'work_sessions' 
  | 'user_settings' 
  | 'analytics_events';

export const VALID_ENTITIES: readonly EntityName[] = [
  'users',
  'tasks',
  'user_states',
  'work_sessions',
  'user_settings',
  'analytics_events',
] as const;

export function isValidEntity(entity: string): entity is EntityName {
  return VALID_ENTITIES.includes(entity as EntityName);
}

export function assertValidEntity(entity: string): asserts entity is EntityName {
  if (!isValidEntity(entity)) {
    throw new Error(`Invalid entity: ${entity}. Valid entities: ${VALID_ENTITIES.join(', ')}`);
  }
}
