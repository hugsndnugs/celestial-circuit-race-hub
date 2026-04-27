export type DocsSection = {
  title: string;
  description: string;
  href: string;
};

export const docsSections: DocsSection[] = [
  { title: "System Overview", description: "Repository map, architecture, and cross-system operational flow.", href: "/docs/system-overview/" },
  { title: "Local Development", description: "Prerequisites, bootstrap steps, and local validation workflow.", href: "/docs/local-development/" },
  { title: "Environment", description: "Consolidated environment variable matrix across all race repos.", href: "/docs/environment/" },
  { title: "Deployments", description: "GitHub Pages and Supabase deployment workflows and checklists.", href: "/docs/deployments/" },
  { title: "Operations Runbook", description: "Pre-race checks, live race operations, incidents, and post-race closure.", href: "/docs/operations-runbook/" },
  { title: "Controller Guide", description: "Admin, marshal, leaderboard workflows and correction handling.", href: "/docs/controller-guide/" },
  { title: "Signups Guide", description: "Public intake, duplicate controls, moderation, and promotion to teams.", href: "/docs/signups-guide/" },
  { title: "Status Guide", description: "Status site setup, publishing guidance, and operational linkage.", href: "/docs/status-guide/" },
  { title: "Contributing", description: "Documentation ownership, update process, and contribution standards.", href: "/docs/contributing/" },
];
