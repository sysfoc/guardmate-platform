import * as React from 'react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/enums';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  role?: UserRole;
  online?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  role,
  online,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
  };

  const dotSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-4 w-4',
    xl: 'h-6 w-6',
  };

  const roleColors = {
    [UserRole.BOSS]: 'border-[var(--color-role-boss)]',
    [UserRole.MATE]: 'border-[var(--color-role-mate)]',
    [UserRole.ADMIN]: 'border-[var(--color-role-admin)]',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          'flex items-center justify-center rounded-full overflow-hidden bg-[var(--color-bg-subtle)] border-2 border-transparent transition-all',
          sizes[size],
          role && roleColors[role],
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="font-bold text-[var(--color-text-secondary)] select-none">
            {getInitials(name) || '?'}
          </span>
        )}
      </div>

      {online && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full bg-[var(--color-success)] ring-2 ring-white dark:ring-[var(--color-bg-base)]',
            dotSizes[size]
          )}
        />
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';
