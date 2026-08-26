export interface ScoreComponents {
  [k: string]: number;
}

export function sumScore(c: ScoreComponents): number {
  return Math.max(0, Math.min(100, Object.values(c).reduce((a, b) => a + b, 0)));
}

const OSI = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "GPL-2.0", "GPL-3.0",
  "LGPL-2.1", "LGPL-3.0", "AGPL-3.0", "MPL-2.0", "ISC", "Unlicense", "0BSD", "EPL-2.0"
]);

export function isOsi(spdx: string | null): boolean {
  return !!spdx && OSI.has(spdx);
}

export function scoreGithubRepo(spdx: string | null, pushedAt: string | null): { components: ScoreComponents; total: number } {
  const osi = isOsi(spdx);
  const fresh = pushedAt && Date.now() - new Date(pushedAt).getTime() < 180 * 864e5;
  const components: ScoreComponents = {
    permanence: osi ? 18 : 10,
    commercial: osi ? 13 : 5,
    no_card: 10,
    open_source: osi ? 9 : 0,
    self_host: 6,
    activity: fresh ? 5 : 0,
    allowance: 0,
    ease: 0,
    restrictions: -1
  };
  return { components, total: sumScore(components) };
}

export function scoreDiscoveredPage(hasPricingSignals: boolean): { components: ScoreComponents; total: number } {
  const components: ScoreComponents = {
    permanence: 4,
    commercial: 0,
    no_card: 4,
    open_source: 0,
    self_host: 0,
    activity: 0,
    allowance: hasPricingSignals ? 4 : 2,
    ease: 2,
    restrictions: 0
  };
  return { components, total: sumScore(components) };
}
