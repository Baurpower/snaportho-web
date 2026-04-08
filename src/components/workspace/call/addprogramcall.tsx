"use client";

import React from "react";
import ProgramCallManager from "@/components/workspace/call/programcallmanager";
import ProgramCallUploadPanel from "@/components/workspace/call/programcalluploadpanel";

export default function AddProgramCall() {
  return (
    <div className="space-y-6">
      <ProgramCallManager />
      <ProgramCallUploadPanel />
    </div>
  );
}