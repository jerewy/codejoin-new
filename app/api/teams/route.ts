import { NextResponse } from "next/server";

import { TEAM_DATA } from "@/lib/data/teams";

export const revalidate = 0;

export async function GET() {
  const payload = TEAM_DATA.map((team) => ({
    ...team,
    metrics: {
      memberCount: team.metrics?.memberCount ?? team.members.length,
      projectCount: team.metrics?.projectCount ?? team.projects.length,
      activeProjects:
        team.metrics?.activeProjects ??
        team.projects.filter((project) => project.status === "active").length,
      pendingInvites:
        team.metrics?.pendingInvites ??
        team.invitations.filter((invitation) => invitation.status === "pending").length,
      weeklyActive: team.metrics?.weeklyActive ?? Math.min(team.members.length, 5),
    },
  }));

  return NextResponse.json({ teams: payload });
}
