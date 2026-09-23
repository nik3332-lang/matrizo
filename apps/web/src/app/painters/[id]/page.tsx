import { Professionals } from "@/components/Professionals";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Professionals kind="painter" id={id} />;
}
