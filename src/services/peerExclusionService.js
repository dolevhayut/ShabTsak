import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export const getPeerExclusionsByGuardId = async (guardId, campId) => {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_guards_with_limits", {
            ...creds,
            p_camp_id: Number(campId),
        });
        if (error) throw error;
        const guardsWithLimits = Array.isArray(data) ? data : [];
        const guardEntry = guardsWithLimits.find((row) => row?.guard?.id === Number(guardId));
        const peerExclusions = Array.isArray(guardEntry?.peer_exclusions) ? guardEntry.peer_exclusions : [];
        return peerExclusions.filter((row) => row.guardId === Number(guardId));
    } catch (error) {
        console.error(error);
        throw new Error("Unable to fetch peer exclusions");
    }
};

export const createPeerExclusion = async (guardId, excludedGuardId) => {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_create_peer_exclusion", {
            ...creds,
            p_guard_id: guardId,
            p_excluded_guard_id: excludedGuardId,
        });
        if (error) throw error;
        toast.success("הגבלה נוספה: לא ניתן לשבץ עם השומר הנבחר באותה משמרת");
        return { data: { id: data }, status: 201 };
    } catch (error) {
        console.error("Error creating peer exclusion:", error);
        toast.error("שגיאה בהוספת ההגבלה");
        throw error;
    }
};

export const deletePeerExclusion = async (limitId) => {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_peer_exclusion", {
            ...creds,
            p_limit_id: limitId,
        });
        if (error) throw error;
        toast.success("הגבלה הוסרה");
    } catch (error) {
        console.error("Error deleting peer exclusion:", error);
        toast.error("שגיאה במחיקת ההגבלה");
        throw error;
    }
};
