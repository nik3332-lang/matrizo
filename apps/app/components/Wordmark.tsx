import { View, Text } from 'react-native';

type Size = 'sm' | 'lg';

/**
 * The Matrizo house mark + wordmark, ported from the original coming-soon
 * page (index.html) so the brand carries over into the app shell.
 */
export function Wordmark({ size = 'lg' }: { size?: Size }) {
  return (
    <View className="items-center">
      <HouseMark scale={size === 'lg' ? 1 : 0.7} />
      <Text className={size === 'lg' ? 'mt-2 text-5xl font-black' : 'mt-1 text-2xl font-black'}>
        <Text className="text-purple">MATRI</Text>
        <Text className="text-orange">ZO</Text>
      </Text>
    </View>
  );
}

function HouseMark({ scale = 1 }: { scale?: number }) {
  return (
    <View style={{ alignItems: 'center', transform: [{ scale }] }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 26,
          borderRightWidth: 26,
          borderBottomWidth: 24,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: '#E8450A',
        }}
      />
      <View className="h-6 w-10 items-center rounded-b-md bg-purple">
        <View className="mt-auto h-4 w-2.5 rounded-t-sm bg-orange" />
      </View>
    </View>
  );
}
