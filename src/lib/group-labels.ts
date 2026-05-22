export const phase1GroupTitles: Record<string, string> = {
  'group e': 'Grand huit 1',
  "group g": "break'hub 3",
  'group a': 'Emperor 1',
  "group f": "break'hub 2",
  'group c': 'Grand huit 2',
  "group d": "break'hub 1",
  'group b': 'FriendZone',
  'group h': 'Emperor 2',
};

export const phase1GroupOrder: string[] = ['Group C', 'Group A', 'Group F', 'Group H', 'Group B', 'Group G', 'Group E', 'Group D'];

export function getPhase1Label(groupName: string): string | undefined {
  const normalized = groupName.trim().toLowerCase();
  return phase1GroupTitles[normalized];
}

export function getPhase1DisplayTitle(groupName: string): string {
  const label = getPhase1Label(groupName);
  return label ? `${label} : ${groupName}` : groupName;
}

const phase2GroupAffiliations = [
  { label: "Friend Zone", groups: ['Group F'] },
  { label: "Break'hub", groups: ['Group N', 'Group E', 'Group G'] },
  { label: 'Grand Huit', groups: ['Group C', 'Group A'] },
  { label: 'Emperor', groups: ['Group D', 'Group B'] },
] as const;

export function getPhase2Label(groupName: string): string {
  const normalized = groupName.trim().toLowerCase();
  const affiliation = phase2GroupAffiliations.find((entry) =>
    entry.groups.some((group) => group.toLowerCase() === normalized)
  );

  return affiliation ? `${affiliation.label} : ${groupName}` : groupName;
}

const groupLabels = {
  phase1GroupTitles,
  phase1GroupOrder,
  getPhase1Label,
  getPhase1DisplayTitle,
  getPhase2Label,
};

export default groupLabels;
