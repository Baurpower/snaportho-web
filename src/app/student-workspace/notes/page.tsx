import { redirect } from "next/navigation";

export default async function StudentWorkspaceNotesRoute() {
  redirect("/student-workspace/mycases?view=notes");
}
