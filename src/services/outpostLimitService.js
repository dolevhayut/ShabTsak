import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export const getGuardOutpostLimitByGuardId = async (guardId, _campId) => {
    try {
        const { data, error } = await supabase
            .from("guard_outpost_limits")
            .select("*")
            .eq("guardId", guardId);
        if (error) throw error;
        return data;
    } catch (error) {
        throw new Error("Unable to fetch outpost limit");
    }
};

export const createGuardOutpostLimit = async (guardId, campId, outpostId) => {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_create_outpost_limit", {
            ...creds,
            p_guard_id: guardId,
            p_outpost_id: outpostId,
            p_camp_id: campId,
        });
        if (error) throw error;
        return { data: { id: data }, status: 201 };
    } catch (error) {
        console.error("Error creating guard outpost limit:", error);
        throw error;
    }
};

export const deleteOutpostLimit = async (outpostLimitId) => {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_outpost_limit", {
            ...creds,
            p_limit_id: outpostLimitId,
        });
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting outpost limit:", error);
        throw error;
    }
};
