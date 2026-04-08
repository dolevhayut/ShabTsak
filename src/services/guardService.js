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
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_guards_by_camp", {
            ...creds,
            p_camp_id: campId,
        });
        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "Error fetching GuardsPage for the selected camp.");
    }
}

export async function getGuardDetails(guardId) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_guard_by_id", {
            ...creds,
            p_guard_id: guardId,
        });
        if (error) throw error;
        return Array.isArray(data) ? data[0] : data;
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
            p_personal_id: newGuardDetails.personalId || null,
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
            p_personal_id: guardDetails.personalId || null,
        });
        if (error) throw error;
        return { data: guardDetails, status: 200 };
    } catch (error) {
        handleApiError(error, "Failed to update guard. Please try again.");
    }
}

export async function getGuardsAndLimitsForCampId(campId) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_guards_with_limits", {
            ...creds,
            p_camp_id: campId,
        });
        if (error) throw error;
        return (data || []).map((row) => ({
            guard:           row.guard,
            timeLimits:      row.time_limits    || [],
            outpostLimits:   row.outpost_limits || [],
            dayLimits:       row.day_limits     || [],
            peerExclusions:  (row.peer_exclusions || []).filter((r) => r.guardId === row.guard.id),
            excludedByPeerIds: (row.peer_exclusions || [])
                .filter((r) => r.excludedGuardId === row.guard.id)
                .map((r) => r.guardId),
        }));
    } catch (error) {
        handleApiError(error, "Failed to fetch guard details and Limits. Please try again.");
    }
}

export { handleApiError };
