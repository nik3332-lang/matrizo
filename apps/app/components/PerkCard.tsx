import { View, Text } from 'react-native';

export function PerkCard({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="w-[47%] rounded-2xl border-t-4 border-orange bg-white p-4 shadow shadow-ink/10">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-purple">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <Text className="font-extrabold text-ink">{label}</Text>
    </View>
  );
}
