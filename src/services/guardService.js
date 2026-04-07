import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

const handleApiError = (error, errorMessage) => {
    console.error(error);
    toast.error(errorMessage);
    throw new Error(errorMessage);
};

export async function getGuardsByCampId(campId) {
    try {
        const { data, error } = await supabase
            .from("guards")
            .select("*")
            .eq("campId", campId)
            .order("id");
        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "Error fetching GuardsPage for the selected camp.");
    }
}

export async function getGuardDetails(guardId) {
    try {
        const { data, error } = await supabase
            .from("guards")
            .select("*")
            .eq("id", guardId)
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "Failed to fetch guard details. Please try again.");
    }
}

export async function deleteGuard(guardId) {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_guard", {
            ...creds,
            p_guard_id: guardId,
        });
        if (error) throw error;
    } catch (error) {
        handleApiError(error, "Failed to delete guard. Please try again.");
    }
}

export async function addNewGuard(newGuardDetails) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_create_guard", {
            ...creds,
            p_name: newGuardDetails.name,
            p_mail: newGuardDetails.mail || null,
            p_guard_phone: newGuardDetails.phone || null,
            p_should_be_allocated: newGuardDetails.shouldBeAllocated ?? true,
            p_camp_id: newGuardDetails.campId,
            p_color: newGuardDetails.color || null,
        });
        if (error) throw error;
        return { data: { id: data }, status: 201 };
    } catch (error) {
        handleApiError(error, "Failed to add a new guard. Please try again.");
    }
}

export async function updateGuard(guardDetails) {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_update_guard", {
            ...creds,
            p_guard_id: guardDetails.id,
            p_name: guardDetails.name,
            p_mail: guardDetails.mail || null,
            p_guard_phone: guardDetails.phone || null,
            p_should_be_allocated: guardDetails.shouldBeAllocated ?? true,
            p_color: guardDetails.color || null,
        });
        if (error) throw error;
        return { data: guardDetails, status: 200 };
    } catch (error) {
        handleApiError(error, "Failed to update guard. Please try again.");
    }
}

export async function getGuardsAndLimitsForCampId(campId) {
    try {
        const { data: guards, error: gErr } = await supabase
            .from("guards")
            .select("*")
            .eq("campId", campId)
            .order("id");
        if (gErr) throw gErr;

        const guardIds = guards.map((g) => g.id);

        let timeLimits = [];
        let outpostLimits = [];
        let dayLimits = [];
        let peerRows = [];

        if (guardIds.length > 0) {
            const { data: tl, error: tlErr } = await supabase
                .from("guard_time_limits")
                .select("*")
                .in("guardId", guardIds);
            if (tlErr) throw tlErr;
            timeLimits = tl;

            const { data: ol, error: olErr } = await supabase
                .from("guard_outpost_limits")
                .select("*")
                .in("guardId", guardIds);
            if (olErr) throw olErr;
            outpostLimits = ol;

            const { data: dl, error: dlErr } = await supabase
                .from("guard_day_limits")
                .select("*")
                .in("guardId", guardIds);
            if (dlErr) throw dlErr;
            dayLimits = dl || [];

            const { data: pr, error: prErr } = await supabase
                .from("guard_peer_exclusions")
                .select("*")
                .eq("campId", campId);
            if (prErr) throw prErr;
            peerRows = pr || [];
        }

        return guards.map((guard) => ({
            guard,
            timeLimits: timeLimits.filter((t) => t.guardId === guard.id),
            outpostLimits: outpostLimits.filter((o) => o.guardId === guard.id),
            dayLimits: dayLimits.filter((d) => d.guardId === guard.id),
            peerExclusions: peerRows.filter((r) => r.guardId === guard.id),
            excludedByPeerIds: peerRows.filter((r) => r.excludedGuardId === guard.id).map((r) => r.guardId),
        }));
    } catch (error) {
        handleApiError(error, "Failed to fetch guard details and Limits. Please try again.");
    }
}

export { handleApiError };
