import { Badge } from '@/components/ui';
export function PublicationStatus({ status }: { status?: string }) {
  const value = status?.toLowerCase().replace(/_/g, ' ');
  const label =
    value && ['completed', 'complete', 'finished', 'finished airing'].includes(value)
      ? 'Completed'
      : value &&
          ['ongoing', 'releasing', 'current', 'currently airing', 'publishing'].includes(value)
        ? 'Ongoing'
        : value && ['hiatus', 'on hiatus'].includes(value)
          ? 'On hiatus'
          : value && ['cancelled', 'canceled'].includes(value)
            ? 'Cancelled'
            : value && ['not yet released', 'upcoming', 'not yet aired'].includes(value)
              ? 'Upcoming'
              : 'Status unknown';
  return (
    <Badge
      label={label}
      variant={label === 'Completed' ? 'success' : label === 'Ongoing' ? 'manga' : 'secondary'}
    />
  );
}
