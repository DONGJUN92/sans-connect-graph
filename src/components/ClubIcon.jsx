import React from 'react';
import {
  GraduationCap,
  Mic,
  Brain,
  Trophy,
  BookOpen,
  Music,
  Footprints,
  FlaskConical,
  Home,
  Drama,
  Clapperboard,
  BookMarked,
  BookText,
  Sparkles,
  Languages,
  Waves,
  Users
} from 'lucide-react';

const ICON_MAP = {
  GraduationCap,
  Mic,
  Brain,
  Trophy,
  BookOpen,
  Music,
  Footprints,
  FlaskConical,
  Home,
  Drama,
  Clapperboard,
  BookMarked,
  BookText,
  Sparkles,
  Languages,
  Waves,
  Users
};

export default function ClubIcon({ name, className = 'w-5 h-5', style }) {
  const IconComponent = ICON_MAP[name] || Users;
  return <IconComponent className={className} style={style} />;
}
