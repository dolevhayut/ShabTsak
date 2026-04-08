const FALLBACK_TEAM_COLOR = "#90A4AE";

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTeamAccentColor(teamName) {
  const normalized = teamName?.trim();
  if (!normalized) return FALLBACK_TEAM_COLOR;

  const hue = hashString(normalized) % 360;
  return `hsl(${hue} 60% 45%)`;
}

