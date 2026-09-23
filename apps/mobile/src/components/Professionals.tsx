import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { Professional } from "@matrizo/shared";
import { useResource } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import { Screen, ErrorState, Loading } from "./ui";
export function Professionals({
  kind,
  id,
}: {
  kind: Professional["kind"];
  id?: string;
}) {
  const result = useResource<{
    professionals?: Professional[];
    profile?: Professional;
  }>(
    id
      ? `/professionals/${encodeURIComponent(id)}`
      : `/professionals?kind=${kind}`,
  );
  const profiles = (
    result.data?.profile
      ? [result.data.profile]
      : (result.data?.professionals ?? [])
  ).filter((p) => p.kind === kind);
  return (
    <Screen onRefresh={result.reload} refreshing={result.loading}>
      {result.loading && !result.data && <Loading />}
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      {!result.loading && !result.error && !profiles.length && (
        <Text style={s.body}>
          {id ? "Profile not found." : `No ${kind}s listed yet.`}
        </Text>
      )}
      {profiles.map((profile) => (
        <View key={profile.id} style={{ gap: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${profile.name}`}
            onPress={() =>
              router.push({
                pathname: "/professionals/[kind]",
                params: { kind, id: profile.id },
              })
            }
          >
            <Image
              source={{ uri: profile.photoUrl }}
              style={{ width: "100%", height: 260, borderRadius: 4 }}
              contentFit="cover"
              accessibilityLabel={profile.name}
            />
            <Text style={s.heading}>{profile.name}</Text>
          </Pressable>
          <Text style={s.body}>
            {profile.yearsExperience} years of experience
          </Text>
          {id && (
            <>
              <Text style={s.heading}>Past work</Text>
              {!profile.workPhotos.length && (
                <Text style={s.small}>No work photos added yet.</Text>
              )}
              {profile.workPhotos.map((url, i) => (
                <Image
                  key={`${url}-${i}`}
                  source={{ uri: url }}
                  style={{ width: "100%", height: 260, borderRadius: 4 }}
                  contentFit="contain"
                  accessibilityLabel={`${profile.name}: completed work ${i + 1}`}
                />
              ))}
            </>
          )}
        </View>
      ))}
    </Screen>
  );
}
