import CardDetailClient from "./CardDetailClient";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardDetailClient id={id} />;
}
