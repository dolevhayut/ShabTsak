import { supabase } from "./supabaseClient";
import { toast } from "./notificationService";

/**
 * אנליטיקס ברמת חיילים ועמדות
 * @param {number} campId
 * @param {Date} fromDate
 * @param {Date} toDate
 */
export async function getAnalyticsData(campId, fromDate, toDate) {
  try {
    const fromTs = fromDate.getTime();
    const toTs = toDate.getTime();

    // שיבוצים בטווח
    const { data: shibutsim, error: sErr } = await supabase
      .from("shibuts")
      .select("guardId, outpostId")
      .eq("campId", campId)
      .gte("theDate", fromTs)
      .lte("theDate", toTs);
    if (sErr) throw sErr;

    // שומרים
    const { data: guards, error: gErr } = await supabase
      .from("guards")
      .select("id, name, color")
      .eq("campId", campId)
      .order("id");
    if (gErr) throw gErr;

    // עמדות
    const { data: outposts, error: oErr } = await supabase
      .from("outposts")
      .select("id, name")
      .eq("campId", campId)
      .order("id");
    if (oErr) throw oErr;

    const guardMap  = Object.fromEntries(guards.map((g) => [g.id, g]));
    const outpostMap = Object.fromEntries(outposts.map((o) => [o.id, o]));
    const total = shibutsim.length;

    /* ── שיבוצים לפי חייל ── */
    const byGuard = {};
    guards.forEach((g) => {
      byGuard[g.id] = {
        id: g.id, name: g.name, color: g.color,
        count: 0,
        outpostsSet: new Set(), // כמה עמדות שונות
      };
    });
    shibutsim.forEach((s) => {
      if (!byGuard[s.guardId]) return;
      byGuard[s.guardId].count++;
      byGuard[s.guardId].outpostsSet.add(s.outpostId);
    });
    const guardStats = Object.values(byGuard)
      .filter((g) => g.count > 0)
      .map((g) => ({ ...g, outpostCount: g.outpostsSet.size }))
      .sort((a, b) => b.count - a.count);

    /* ── שיבוצים לפי עמדה ── */
    const byOutpost = {};
    outposts.forEach((o) => {
      byOutpost[o.id] = {
        id: o.id, name: o.name,
        count: 0,
        guardsSet: new Set(),
      };
    });
    shibutsim.forEach((s) => {
      if (!byOutpost[s.outpostId]) return;
      byOutpost[s.outpostId].count++;
      byOutpost[s.outpostId].guardsSet.add(s.guardId);
    });
    const outpostStats = Object.values(byOutpost)
      .filter((o) => o.count > 0)
      .map((o) => ({ ...o, guardCount: o.guardsSet.size }))
      .sort((a, b) => b.count - a.count);

    /* ── מטריצת חייל × עמדה ── */
    // key = `${guardId}_${outpostId}`, value = count
    const crossCount = {};
    shibutsim.forEach((s) => {
      const key = `${s.guardId}_${s.outpostId}`;
      crossCount[key] = (crossCount[key] || 0) + 1;
    });

    // לכל עמדה: רשימת חיילים ממוינת לפי כמות
    const outpostGuardBreakdown = outpostStats.map((o) => {
      const assignees = Object.entries(crossCount)
        .filter(([k]) => k.endsWith(`_${o.id}`))
        .map(([k, cnt]) => {
          const gId = Number(k.split("_")[0]);
          return { ...guardMap[gId], count: cnt };
        })
        .filter((g) => g.id)
        .sort((a, b) => b.count - a.count);
      return { ...o, topGuards: assignees.slice(0, 3) };
    });

    // לכל חייל: רשימת עמדות ממוינת לפי כמות
    const guardOutpostBreakdown = guardStats.map((g) => {
      const posts = Object.entries(crossCount)
        .filter(([k]) => k.startsWith(`${g.id}_`))
        .map(([k, cnt]) => {
          const oId = Number(k.split("_")[1]);
          return { ...outpostMap[oId], count: cnt };
        })
        .filter((o) => o.id)
        .sort((a, b) => b.count - a.count);
      return { ...g, topOutposts: posts };
    });

    /* ── Top combos (חייל + עמדה) ── */
    const topCombos = Object.entries(crossCount)
      .map(([key, count]) => {
        const [gId, oId] = key.split("_").map(Number);
        const guard  = guardMap[gId];
        const outpost = outpostMap[oId];
        if (!guard || !outpost) return null;
        return { guardName: guard.name, guardColor: guard.color, outpostName: outpost.name, count };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    /* ── סיכום ── */
    const uniqueGuards   = guardStats.length;
    const activeOutposts = outpostStats.length;
    const avgPerGuard    = uniqueGuards ? +(total / uniqueGuards).toFixed(1) : 0;
    const mostActive     = guardStats[0] ?? null;
    const leastActive    = guardStats.length > 1 ? guardStats[guardStats.length - 1] : null;

    return {
      total, uniqueGuards, activeOutposts, avgPerGuard,
      mostActive, leastActive,
      guardStats,
      outpostStats,
      outpostGuardBreakdown,
      guardOutpostBreakdown,
      topCombos,
    };
  } catch (err) {
    console.error(err);
    toast.error("שגיאה בטעינת נתוני האנליטיקס");
    return null;
  }
}
