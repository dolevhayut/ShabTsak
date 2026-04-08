import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export const deleteTimeLimit = async (timeLimitId) => {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_time_limit", {
            ...creds,
            p_limit_id: timeLimitId,
        });
        if (error) throw error;
        toast.success("מחיקת הגבלה בוצעה בהצלחה");
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה במחיקה נסה מאוחר יותר");
    }
};

export const createTimeLimit = async (timeLimit) => {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_create_time_limit", {
            ...creds,
            p_guard_id: timeLimit.guardId,
            p_day_id: timeLimit.dayId,
            p_from_hour: timeLimit.fromHour,
            p_to_hour: timeLimit.toHour,
        });
        if (error) throw error;
        toast.success("הגבלת זמן נוספה בהצלחה!");
        return { data: { id: data }, status: 201 };
    } catch (err) {
        console.error("An error occurred", err);
        toast.error("יש בעיה, בבקשה נסה מאוחר יותר");
        throw err;
    }
};

export const getGuardTimeLimits = async (guardId) => {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_guard_limits", {
            ...creds,
            p_guard_id: Number(guardId),
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return row?.time_limits || [];
    } catch (error) {
        console.log(error);
        toast.error("נכשל בטעינת מגבלות הזמן של החייל");
        return [];
    }
};
