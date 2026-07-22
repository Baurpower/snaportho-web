import { MyCasesWorkspace } from "@/components/mycases/MyCasesWorkspace";
import { requireWorkspaceAccess } from "@/lib/workspace/access-control";
import { listCases, listLearningItems } from "@/lib/mycases/repository";
import { MYCASES_CASE_FIXTURES, MYCASES_LEARNING_FIXTURES, MYCASES_MEDIA_FIXTURES } from "@/lib/mycases/fixtures";
export default async function ResidentMyCasesPage({searchParams}:{searchParams?:Promise<{preview?:string}>}) {
  const preview=process.env.NODE_ENV!=="production"&&(await searchParams)?.preview==="1";
  if(preview)return <MyCasesWorkspace initialCases={MYCASES_CASE_FIXTURES} initialItems={MYCASES_LEARNING_FIXTURES} initialMedia={MYCASES_MEDIA_FIXTURES} audience="resident"/>;
  const { user } = await requireWorkspaceAccess();
  const [cases, items] = await Promise.all([listCases(user.id, undefined, true), listLearningItems(user.id, { includeArchived:true })]);
  return <MyCasesWorkspace initialCases={cases} initialItems={items} audience="resident"/>;
}
