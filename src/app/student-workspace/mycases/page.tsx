import { StudentWorkspaceChrome } from "@/components/student-workspace/shell/StudentWorkspaceChrome";
import { MyCasesWorkspace } from "@/components/mycases/MyCasesWorkspace";
import { getStudentWorkspaceDashboardState } from "@/lib/student-workspace/page-state";
import { listCases, listLearningItems } from "@/lib/mycases/repository";
import { MYCASES_CASE_FIXTURES, MYCASES_LEARNING_FIXTURES, MYCASES_MEDIA_FIXTURES } from "@/lib/mycases/fixtures";
export default async function StudentMyCasesPage({searchParams}:{searchParams?:Promise<{preview?:string}>}) {
  const preview=process.env.NODE_ENV!=="production"&&(await searchParams)?.preview==="1";
  if(preview)return <StudentWorkspaceChrome badge="MyCases" title="MyCases" description="Review cases and turn experience into reusable learning."><MyCasesWorkspace initialCases={MYCASES_CASE_FIXTURES} initialItems={MYCASES_LEARNING_FIXTURES} initialMedia={MYCASES_MEDIA_FIXTURES} audience="student"/></StudentWorkspaceChrome>;
  const state = await getStudentWorkspaceDashboardState("/student-workspace/mycases");
  const [cases, items] = await Promise.all([listCases(state.userId, undefined, true), listLearningItems(state.userId, { includeArchived:true })]);
  return <StudentWorkspaceChrome badge="MyCases" title="MyCases" description="Review cases and turn experience into reusable learning."><MyCasesWorkspace initialCases={cases} initialItems={items} audience="student"/></StudentWorkspaceChrome>;
}
