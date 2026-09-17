import { UserProfile } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-rodrigo',
    name: 'Rodrigo Bustos',
    shortName: 'Rodrigo',
    role: 'CEO',
    accessLevel: 'Administración total',
    active: true,
  },
  {
    id: 'user-nicolas',
    name: 'Nicolás Díaz',
    shortName: 'Nicolás',
    role: 'Administrativo Principal de Dirección',
    accessLevel: 'Dirección',
    active: true,
  },
  {
    id: 'user-noemi',
    name: 'Noemi Bazán',
    shortName: 'Noemi',
    role: 'Administrativa Principal de Dirección',
    accessLevel: 'Dirección',
    active: true,
  },
  {
    id: 'user-laura',
    name: 'Laura Soledad Figueroa',
    shortName: 'Laura',
    role: 'Coordinadora colaboradora de Dirección',
    accessLevel: 'Coordinación',
    active: true,
  },
  {
    id: 'user-gabriela',
    name: 'Gabriela Alejandra Borda Quival',
    shortName: 'Gabriela',
    role: 'Coordinadora colaboradora de Dirección',
    accessLevel: 'Coordinación',
    active: true,
  },
  {
    id: 'user-sebastian',
    name: 'Sebastián De La Rosa',
    shortName: 'Sebastián',
    role: 'Asesor Jurídico y Administrativo de Dirección',
    accessLevel: 'Colaborador de Dirección',
    active: true,
  },
  {
    id: 'user-lora',
    name: 'Dr. Richard Lora Espada',
    shortName: 'Dr. Lora',
    role: 'Director Médico',
    accessLevel: 'Colaborador médico',
    active: true,
  },
  {
    id: 'user-yasku',
    name: 'Agustin Yaskuloski',
    shortName: 'Yasku',
    role: 'Coordinador de Sistemas y Tecnología',
    accessLevel: 'Responsable de Sistemas',
    active: true,
  },
];

/**
 * Normalizes legacy or shorthand names to the standardized UserProfile.
 */
export function findUserByNameOrAlias(name: string, users: UserProfile[] = INITIAL_USERS): UserProfile | undefined {
  if (!name) return undefined;
  const lower = name.trim().toLowerCase();

  return users.find(u => {
    const uName = u.name.toLowerCase();
    const uShort = u.shortName.toLowerCase();
    if (uName === lower || uShort === lower) return true;
    if (lower === 'noelia' && (u.shortName === 'Noemi' || u.id === 'user-noemi')) return true;
    if (lower.includes('rodrigo') && u.id === 'user-rodrigo') return true;
    if (lower.includes('nicolás') || lower.includes('nicolas')) {
      if (u.id === 'user-nicolas') return true;
    }
    if (lower.includes('lora') && u.id === 'user-lora') return true;
    if ((lower.includes('yasku') || lower.includes('agustin') || lower.includes('agustín')) && u.id === 'user-yasku') return true;
    if (lower.includes('laura') && u.id === 'user-laura') return true;
    if (lower.includes('gabriela') && u.id === 'user-gabriela') return true;
    if (lower.includes('sebastián') || lower.includes('sebastian')) {
      if (u.id === 'user-sebastian') return true;
    }
    return false;
  });
}
