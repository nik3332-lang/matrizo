import { Pressable, Text } from 'react-native';

export function CategoryPill({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border-2 border-purple bg-white px-4 py-2 active:bg-purple"
    >
      {({ pressed }) => (
        <Text className={pressed ? 'font-bold text-white' : 'font-bold text-purple'}>{label}</Text>
      )}
    </Pressable>
  );
}
