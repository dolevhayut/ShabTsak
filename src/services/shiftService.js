import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";
import { hasConflictOnDay } from "@/utils/shiftTimeUtils";

export async function getShiftsByOutpostId(outpostId) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_shifts_by_outpost", {
            ...creds,
            p_outpost_id: outpostId,
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה בבקשה נסה מאוחר יותר");
    }
}

export async function deleteShift(shiftId) {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_shift", {
            ...creds,
            p_shift_id: shiftId,
        });
        if (error) throw error;
    } catch (err) {
        console.log(err);
    }
}

/**
 * יוצר משמרות רצופות באותו אורך לכל הימים שנבחרו, בטווח השעות שהוגדר.
 * מדלג על משבצות שחופפות למשמרות קיימות.
 *
 * @param {object} params
 * @param {number} params.outpostId
 * @param {number} params.durationHours אורך כל משמרת בשעות (שלמות)
 * @param {number} params.fromHour שעת התחלה של המחזור (0–23)
 * @param {number} params.toHour שעת סיום הטווח (1–24, חייבת להיות אחרי fromHour)
 * @param {number[]} params.dayIds מזהי ימים 1–7 (ראשון–שבת)
 * @returns {{ created: number, skipped: number }}
 */
export async function generateShiftsForOutpost({
    outpostId,
    durationHours,
    fromHour,
    toHour,
    dayIds,
}) {
    const creds = getCredentials();
    const { data: existing, error: fetchErr } = await supabase.rpc(
        "rpc_get_shifts_by_outpost",
        {
            ...creds,
            p_outpost_id: outpostId,
        },
    );
    if (fetchErr) throw fetchErr;
    const list = existing ?? [];
    const working = list.map((s) => ({
        dayId: s.dayId,
        fromHour: s.fromHour,
        toHour: s.toHour,
    }));

    let created = 0;
    let skipped = 0;

    for (const dayId of dayIds) {
        let t = fromHour;
        while (t + durationHours <= toHour) {
            const from = t;
            const to = t + durationHours;
            if (hasConflictOnDay(dayId, from, to, working)) {
                skipped += 1;
            } else {
                const { error } = await supabase.rpc("rpc_create_shift", {
                    ...creds,
                    p_outpost_id: outpostId,
                    p_day_id: dayId,
                    p_from_hour: from,
                    p_to_hour: to,
                });
                if (error) throw error;
                working.push({ dayId, fromHour: from, toHour: to });
                created += 1;
            }
            t += durationHours;
        }
    }

    return { created, skipped };
}

/**
 * מוחק את כל המשמרות של העמדה (אחת־אחת דרך rpc_delete_shift).
 * @param {number} outpostId
 * @returns {Promise<number>} מספר המשמרות שנמחקו
 */
export async function deleteAllShiftsForOutpost(outpostId) {
    const creds = getCredentials();
    const { data: rows, error: fetchErr } = await supabase.rpc(
        "rpc_get_shifts_by_outpost",
        {
            ...creds,
            p_outpost_id: outpostId,
        },
    );
    if (fetchErr) throw fetchErr;
    const list = rows ?? [];
    let deleted = 0;
    for (const row of list) {
        const { error } = await supabase.rpc("rpc_delete_shift", {
            ...creds,
            p_shift_id: row.id,
        });
        if (error) throw error;
        deleted += 1;
    }
    return deleted;
}

export async function createOrUpdateShift(bodyFormData, method = "POST") {
    try {
        const creds = getCredentials();
        if (method === "POST") {
            const { data, error } = await supabase.rpc("rpc_create_shift", {
                ...creds,
                p_outpost_id: bodyFormData.outpostId,
                p_day_id: bodyFormData.dayId,
                p_from_hour: bodyFormData.fromHour,
                p_to_hour: bodyFormData.toHour,
            });
            if (error) throw error;
            return { id: data, ...bodyFormData };
        } else if (method === "PUT") {
            const { error } = await supabase.rpc("rpc_create_shift", {
                ...creds,
                p_outpost_id: bodyFormData.outpostId,
                p_day_id: bodyFormData.dayId,
                p_from_hour: bodyFormData.fromHour,
                p_to_hour: bodyFormData.toHour,
            });
            if (error) throw error;
            return bodyFormData;
        }
    } catch (err) {
        throw err;
    }
}
