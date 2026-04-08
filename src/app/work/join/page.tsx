import { redirect } from "next/navigation";
import JoinInviteClient from "./joininviteclient";

type JoinPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    redirect("/work/welcome");
  }

  return <JoinInviteClient token={token} />;
}