import { UserRole } from '@/types/user.types';

// ─── Role Metadata ────────────────────────────────────────────────────────────

export interface RoleMeta {
  label: string;
  description: string;
  dashboardPath: string;
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  [UserRole.BOSS]: {
    label: 'Guard Boss',
    description: 'Business owner who posts guard job listings and manages bookings.',
    dashboardPath: '/dashboard/boss',
  },
  [UserRole.MATE]: {
    label: 'Guard Mate',
    description: 'Security professional who applies for guard jobs.',
    dashboardPath: '/dashboard/mate',
  },
  [UserRole.ADMIN]: {
    label: 'Administrator',
    description: 'Platform administrator with full management access.',
    dashboardPath: '/admin',
  },
} as const;

// Re-export the enum so consumers only need to import from constants
export { UserRole } from '@/types/user.types';
