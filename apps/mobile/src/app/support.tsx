import { Linking, Text, View } from "react-native";
import { Link } from "expo-router";
import { useState } from "react";
import { styles as s } from "@/lib/theme";
import { Button, Notice, Screen } from "@/components/ui";
const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
export default function Support() {
  const [error, setError] = useState("");
  return (
    <Screen>
      <Text style={s.eyebrow}>HERE FOR YOUR NEXT PROJECT</Text>
      <Text style={s.title}>How can we help?</Text>
      <View style={s.card}>
        <Text style={s.heading}>An existing order</Text>
        <Text style={s.body}>
          Open Your orders to see its latest status. You can cancel an order
          while it is placed or confirmed; cancellation becomes unavailable
          after packing begins.
        </Text>
        <Link href="/orders" style={s.link}>
          View your orders →
        </Link>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Account access</Text>
        <Text style={s.body}>
          Sign in with your email or mobile number and password. Email recovery
          is available once Matrizo’s email service is enabled.
        </Text>
        <Link href="/forgot-password" style={s.link}>
          Reset your password →
        </Link>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Contact Matrizo</Text>
        <Text style={s.body}>
          {email
            ? `Email ${email} with your order reference and a description of the issue. Never send your password or a reset code.`
            : "Support contact details will be published before the app launches."}
        </Text>
        {email && (
          <Button
            title="Email support"
            onPress={() => {
              void Linking.openURL(
                `mailto:${encodeURIComponent(email)}?subject=Matrizo%20support`,
              ).catch(() =>
                setError(`Please email ${email} from your email app.`),
              );
            }}
          />
        )}
      </View>
      <Notice text={error} error />
      <Link href="/privacy" style={s.link}>
        Privacy policy →
      </Link>
      <Link href="/delete-account" style={s.link}>
        Delete account & personal data →
      </Link>
    </Screen>
  );
}
