import {
  BookOpen,
  CloudRain,
  Compass,
  Feather,
  Heart,
  HeartCrack,
  History,
  Home,
  Mountain,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sprout,
  Users,
} from 'lucide-react';

export function CategoryIcon({
  slug,
  className = 'h-4 w-4',
  color,
}: {
  slug: string;
  className?: string;
  color?: string;
}) {
  const style = color ? { color } : undefined;
  const props = { className, style, 'aria-hidden': true as const };

  switch (slug) {
    case 'love-breakup':
      return <HeartCrack {...props} />;
    case 'betrayal':
      return <ShieldAlert {...props} />;
    case 'loneliness':
      return <CloudRain {...props} />;
    case 'family':
      return <Home {...props} />;
    case 'friendship':
      return <Users {...props} />;
    case 'life-struggles':
      return <Mountain {...props} />;
    case 'memories':
      return <History {...props} />;
    case 'regrets':
      return <RotateCcw {...props} />;
    case 'healing':
      return <Sprout {...props} />;
    case 'student-life':
      return <BookOpen {...props} />;
    case 'unspoken-feelings':
      return <Feather {...props} />;
    case 'life-experiences':
      return <Compass {...props} />;
    case 'other':
      return <Sparkles {...props} />;
    default:
      return <Heart {...props} />;
  }
}
