import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export const getPeerExclusionsByGuardId = async (guardId, campId) => {
    try {
        const { data, error } = await supabase
            .from("guard_peer_exclusions")
            .select("*")
            .eq("guardId", guardId)
            .eq("campId", campId);
        if (error) throw error;
        return data;
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
