import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

// Stand-in for apps/web's `.glass` treatment — React Native has no
// backdrop-filter, so this is a plain elevated white card instead of true
// glassmorphism. Still reads as a clean surface against the cream
// background/blobs used site-wide.
export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn('bg-white/90 rounded-2xl p-4 shadow-sm shadow-black/10', className)} {...props} />;
}

export function PressableCard({ className, ...props }: PressableProps & { className?: string }) {
  return (
    <Pressable
      className={cn('bg-white/90 rounded-2xl p-4 shadow-sm shadow-black/10', className)}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      {...props}
    />
  );
}
