import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { Wordmark } from '../../components/Wordmark';
import { CategoryPill } from '../../components/CategoryPill';
import { PerkCard } from '../../components/PerkCard';

const CATEGORIES = ['🎨 Paints', '🚿 Sanitary & Plumbing', '🔨 Hardware'];

const PERKS = [
  { icon: '🚚', label: 'Free Home Delivery' },
  { icon: '💰', label: 'Competitive Prices' },
  { icon: '👨‍💼', label: 'Personalized Sales Advisor' },
  { icon: '🔧', label: '1-Year Free Repair Service' },
  { icon: '🏠', label: 'Free Engineer Visit' },
  { icon: '🎁', label: 'Refer & Earn Rewards' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="items-center px-5 pb-12 pt-16">
      <Wordmark />

      <View className="mt-4 rounded-full bg-purple px-4 py-2">
        <Text className="text-sm font-bold text-white">🚀 The New Matrizo App</Text>
      </View>

      <Text className="mt-5 text-center text-3xl font-black text-ink">
        Building Trust, Delivering Convenience Since 1956
      </Text>

      <View className="mt-6 w-full flex-row overflow-hidden rounded-full">
        <View className="flex-1 items-center bg-orange py-2">
          <Text className="text-xs font-extrabold text-white">70 YEARS OF LEGACY</Text>
        </View>
        <View className="flex-1 items-center bg-purple py-2">
          <Text className="text-xs font-extrabold text-white">TECH-ENABLED MODERN MARKETPLACE</Text>
        </View>
      </View>

      <View className="mt-6 flex-row flex-wrap justify-center gap-3">
        {CATEGORIES.map((label) => (
          <CategoryPill key={label} label={label} onPress={() => router.push('/categories')} />
        ))}
      </View>

      <Text className="mt-10 text-xl font-black text-ink">Why Choose Matrizo?</Text>
      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3" style={{ width: '100%' }}>
        {PERKS.map((perk) => (
          <PerkCard key={perk.label} icon={perk.icon} label={perk.label} />
        ))}
      </View>
    </ScrollView>
  );
}
