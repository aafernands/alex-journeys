import {
  Backpack,
  Banknote,
  Binoculars,
  BookOpen,
  Car,
  Compass,
  Hotel,
  Languages,
  Leaf,
  Lightbulb,
  MapPin,
  Mountain,
  Plane,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Luggage,
  Sun,
  Trees,
  User,
  Utensils,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  backpack: Backpack,
  banknote: Banknote,
  binoculars: Binoculars,
  "book-open": BookOpen,
  car: Car,
  compass: Compass,
  hotel: Hotel,
  languages: Languages,
  leaf: Leaf,
  lightbulb: Lightbulb,
  "map-pin": MapPin,
  mountain: Mountain,
  plane: Plane,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
  star: Star,
  suitcase: Luggage,
  sun: Sun,
  trees: Trees,
  user: User,
  utensils: Utensils,
  wallet: Wallet,
  wifi: Wifi,
};

type Props = {
  name: string;
  className?: string;
  size?: number;
};

/** Free Lucide icons — replaces Font Awesome from the WordPress menus. */
export function NavIcon({ name, className, size = 18 }: Props) {
  const Icon = ICONS[name] || Compass;
  return <Icon className={className} size={size} aria-hidden="true" strokeWidth={1.75} />;
}
