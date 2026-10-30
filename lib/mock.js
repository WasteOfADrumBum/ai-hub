// Sample data shaped exactly like the AI Hub Sheet, with times relative to now
// so the stale warnings have something to show. Used until the service account
// is set up, and whenever no passcode is configured.

const eastern = (hoursAgo) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(Date.now() - hoursAgo * 3600e3));

export function mockTabs() {
  return {
    Feed: [
      ['Time (ET)', 'Tool', 'Bot', 'Area', 'Summary', 'Link', 'Status'],
      [eastern(0.6), 'ChatGPT', 'MAIN 3', 'News', 'Morning brief: 3 stories flagged, nothing urgent', '', 'ok'],
      [eastern(2.2), 'Grok', 'Bulma', 'Repos', '2 PRs open, CI green on both', 'https://github.com', 'ok'],
      [eastern(3.5), 'Grok', 'Levi', 'Email', 'Inbox at 12, two replies drafted for review', '', 'ok'],
      [eastern(5), 'Claude', 'Claude Code', 'Repos', 'AI Hub v1 scaffold in progress', '', 'ok'],
      [eastern(9), 'ChatGPT', 'MAIN 2', 'Money', 'Budget check done, one bill due Friday', '', 'ok'],
      [eastern(20), 'Grok', 'Gon', 'Jobs', 'Picked 4 roles to apply to, 1 needs a cover letter', '', 'needs review'],
      [eastern(31), 'Muse', 'Muse', 'Family', 'School reminder sent: picture day Thursday', '', 'ok'],
      [eastern(34), 'Muse', 'Muse', 'Tasks', 'Evening check-in: 5 done, 2 rolled to tomorrow', '', 'ok'],
      [eastern(50), 'Codex', 'Codex', 'Repos', 'Refactor branch pushed for review', '', 'ok'],
      [eastern(80), 'Grok', 'Senshi', 'Fitness', 'Weekly check-in logged', '', 'ok'],
    ],
    Handoffs: [
      ['From', 'To', 'Note', 'Needed by', 'Done'],
      ['Grok', 'ChatGPT', 'Gon picked a role that needs a cover letter draft', eastern(-30), ''],
      ['Muse', 'Claude', 'Add picture day to the family calendar view', eastern(4), ''],
      ['ChatGPT', 'Grok', 'Already handled example (hidden because Done)', '', 'TRUE'],
    ],
    Owners: [
      ['Area', 'Owner', 'Tool', 'Expected cadence'],
      ['Jobs', 'Gon', 'Grok', 'Mon/Wed/Fri ~6:10 AM picks · Fri 4 PM funnel review'],
      ['Money', 'ChatGPT MAIN 2', 'ChatGPT', 'Daily 6 AM · Mon deep review · 1st of month'],
      ['Email', 'Levi', 'Grok', 'Daily 6 AM check · Sun 8 AM cleanup'],
      ['Family', 'Muse', 'Muse', 'Daily ~7:16 AM school reminders · otherwise on request'],
      ['Fitness', 'Senshi', 'Grok', '~Weekly, on check-in (no routine)'],
      ['Repos', 'Bulma', 'Grok', 'Daily ~7:30 AM'],
      ['Tasks', 'Muse', 'Muse', 'Daily 8 PM check-in'],
      ['Weekend', 'ChatGPT MAIN 4', 'ChatGPT', 'Daily 6 AM'],
      ['Daily review', 'ChatGPT MAIN 5', 'ChatGPT', 'Daily 8 PM · Sun full review'],
      ['News', 'ChatGPT MAIN 3', 'ChatGPT', 'Daily 6 AM'],
    ],
  };
}
