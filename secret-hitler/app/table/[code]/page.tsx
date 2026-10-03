import { TableClient } from "@/client/Table";

export default async function TablePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TableClient code={code.toUpperCase()} />;
}
