import { Text, View } from "react-native";
import { Link } from "expo-router";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@matrizo/shared";
import { styles as s } from "@/lib/theme";
import { Screen } from "@/components/ui";
export default function Privacy() {
  return (
    <Screen>
      <Text style={s.eyebrow}>YOUR INFORMATION, WITH CARE</Text>
      <Text style={s.title}>Privacy at Matrizo</Text>
      <Text style={s.small}>Updated {PRIVACY_UPDATED}</Text>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.title} style={{ gap: 8 }}>
          <Text style={s.heading}>{section.title}</Text>
          <Text style={s.body}>{section.body}</Text>
        </View>
      ))}
      <Link href="/delete-account" style={s.link}>
        Manage account deletion →
      </Link>
      <Link href="/support" style={s.link}>
        Contact & support →
      </Link>
    </Screen>
  );
}
