import React, { useState } from "react";
import WikiApiExplorer from "@/pages/WikiApiExplorer";
import { Sparkles, Database, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminWikiDataStudio: React.FC = () => {
  return <WikiApiExplorer embedded={true} />;
};

export default AdminWikiDataStudio;
