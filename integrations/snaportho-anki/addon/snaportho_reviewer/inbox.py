def summarize(assignment,local_drafts):
    items=assignment.get("items",[]);return{"assignmentId":assignment["id"],"status":assignment["status"],"total":len(items),"pending":sum(x["status"]=="pending" for x in items),"conflicts":sum(x["status"]=="conflict" for x in items),"drafts":len(local_drafts),"riskTiers":{tier:sum(x["riskTier"]==tier for x in items) for tier in "ABCD"}}
def assignment_complete(items):return bool(items) and all(x["status"] in{"decision_saved","change_proposed","submitted","skipped_with_reason"} for x in items)
