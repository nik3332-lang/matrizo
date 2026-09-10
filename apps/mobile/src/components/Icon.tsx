import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Same icon set as apps/web/src/components/Icon.tsx, redrawn with
// react-native-svg primitives (web's version uses raw <svg>/<path> DOM
// elements, which don't exist in React Native) — keep the two in sync by
// hand if the set changes.
export type IconName =
  | 'truck'
  | 'badgeCheck'
  | 'package'
  | 'cash'
  | 'pipe'
  | 'paintRoller'
  | 'box'
  | 'mapPin'
  | 'chevronLeft'
  | 'cart'
  | 'user'
  | 'receipt'
  | 'logout'
  | 'search'
  | 'home'
  | 'plus'
  | 'minus'
  | 'trash';

function iconChildren(name: IconName) {
  switch (name) {
    case 'truck':
      return (
        <>
          <Rect x={1.5} y={7} width={11} height={9} rx={1} />
          <Path d="M12.5 10h4l3 3.2V16h-2" />
          <Circle cx={6} cy={18} r={1.8} />
          <Circle cx={16} cy={18} r={1.8} />
          <Path d="M8 18h6" />
        </>
      );
    case 'badgeCheck':
      return (
        <>
          <Path d="M12 2.5l2.2 1.3 2.5-.3 1 2.3 2.3 1-.3 2.5 1.3 2.2-1.3 2.2.3 2.5-2.3 1-1 2.3-2.5-.3L12 21.5l-2.2-1.3-2.5.3-1-2.3-2.3-1 .3-2.5L3 12l1.3-2.2-.3-2.5 2.3-1 1-2.3 2.5.3z" />
          <Path d="M8.5 12.2l2.2 2.2 4.3-4.6" />
        </>
      );
    case 'package':
      return (
        <>
          <Path d="M3 7.5l9-4.5 9 4.5-9 4.5-9-4.5z" />
          <Path d="M3 7.5V16l9 4.5 9-4.5V7.5" />
          <Path d="M12 12v8.5" />
        </>
      );
    case 'cash':
      return (
        <>
          <Rect x={2} y={6} width={20} height={12} rx={1.5} />
          <Circle cx={12} cy={12} r={3} />
        </>
      );
    case 'pipe':
      return (
        <>
          <Rect x={2} y={9} width={9} height={6} rx={1} />
          <Rect x={13} y={4} width={9} height={6} rx={1} />
          <Path d="M6.5 9V6a1 1 0 011-1h4M17.5 10v3a1 1 0 01-1 1h-4" />
        </>
      );
    case 'paintRoller':
      return (
        <>
          <Rect x={3} y={4} width={14} height={6} rx={1.5} />
          <Path d="M8 10v3a1.5 1.5 0 001.5 1.5H10a1.5 1.5 0 011.5 1.5V21" />
          <Rect x={9.5} y={14.5} width={4} height={3} rx={0.8} />
        </>
      );
    case 'box':
      return (
        <>
          <Path d="M3 7.5l9-4.5 9 4.5-9 4.5-9-4.5z" />
          <Path d="M3 7.5V16l9 4.5 9-4.5V7.5" />
          <Path d="M12 12v8.5" />
        </>
      );
    case 'mapPin':
      return (
        <>
          <Path d="M12 21s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12z" />
          <Circle cx={12} cy={9} r={2.4} />
        </>
      );
    case 'chevronLeft':
      return <Path d="M14.5 4.5L7 12l7.5 7.5" />;
    case 'cart':
      return (
        <>
          <Circle cx={9} cy={20} r={1.4} />
          <Circle cx={17} cy={20} r={1.4} />
          <Path d="M2.5 3h2l2.3 11.4a1.8 1.8 0 001.8 1.5h7.6a1.8 1.8 0 001.75-1.4L20 7.5H6" />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={3.5} />
          <Path d="M4.5 20.5a7.5 7.5 0 0115 0" />
        </>
      );
    case 'receipt':
      return (
        <>
          <Path d="M6 2.5h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V2.5z" />
          <Path d="M9 7h6M9 10.5h6M9 14h4" />
        </>
      );
    case 'logout':
      return (
        <>
          <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <Path d="M16 17l5-5-5-5" />
          <Path d="M21 12H9" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx={10.5} cy={10.5} r={6.5} />
          <Path d="M20 20l-5-5" />
        </>
      );
    case 'home':
      return (
        <>
          <Path d="M3.5 10.5L12 3.5l8.5 7" />
          <Path d="M5.5 9v10.5a1 1 0 001 1h11a1 1 0 001-1V9" />
          <Path d="M9.5 20.5V14a1 1 0 011-1h3a1 1 0 011 1v6.5" />
        </>
      );
    case 'plus':
      return <Path d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path d="M5 12h14" />;
    case 'trash':
      return (
        <>
          <Path d="M4 7h16" />
          <Path d="M9 7V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V7" />
          <Path d="M6.5 7l1 12.5A2 2 0 009.5 21h5a2 2 0 002-1.5L17.5 7" />
        </>
      );
  }
}

// No default color: react-native-svg has no CSS cascade, so unlike the web
// version's `currentColor` default this must always be passed explicitly —
// silently defaulting would risk an invisible icon that doesn't render.
export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {iconChildren(name)}
    </Svg>
  );
}

// Category slug -> icon, matching apps/web's mapping.
export function categoryIcon(slug: string): IconName {
  if (slug === 'upvc' || slug === 'cpvc') return 'pipe';
  if (slug === 'paints') return 'paintRoller';
  return 'box';
}
