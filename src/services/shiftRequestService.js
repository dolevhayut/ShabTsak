import { supabase } from "./supabaseClient";
import { toast } from "@/services/notificationService";
import { getCredentials } from "./authCredentials";

export async function createShiftRequest(payload) {
  try {
    const creds = getCredentials();
    const { data, error } = await supabase.rpc("rpc_create_shift_request", {
      ...creds,
      p_camp_id: payload.campId,
      p_requester_guard_id: payload.requesterGuardId || null,
      p_target_shibuts_id: payload.targetShibutsId || null,
      p_request_type: payload.requestType,
      p_reason: payload.reason,
      p_requested_payload: payload.requestedPayload || {},
    });
    if (error) throw error;
    toast.success("הבקשה נשלחה למפקד");
    return { id: data, ...payload };
  } catch (error) {
    console.error(error);
    toast.error("נכשל בשליחת הבקשה");
    throw error;
  }
}

export async function getShiftRequestsByCamp(campId, status = "pending") {
  try {
    let query = supabase
      .from("shift_requests")
      .select("*")
      .eq("campId", campId)
      .order("createdAt", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(error);
    toast.error("נכשל בטעינת בקשות משמרת");
    return [];
  }
}

export async function getShiftRequestsByUser(requesterUserId) {
  try {
    const { data, error } = await supabase
      .from("shift_requests")
      .select("*")
      .eq("requesterUserId", requesterUserId)
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(error);
    toast.error("נכשל בטעינת בקשות החייל");
    return [];
  }
}

export async function getShiftRequestsByGuardId(guardId) {
  try {
    const { data, error } = await supabase
      .from("shift_requests")
      .select("*")
      .eq("requesterGuardId", guardId)
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(error);
    toast.error("נכשל בטעינת היסטוריית הבקשות");
    return [];
  }
}

export async function updateShiftRequestStatus(requestId, nextStatus, reviewerUserId, reviewNote) {
  try {
    const creds = getCredentials();
    const { error } = await supabase.rpc("rpc_review_shift_request", {
      ...creds,
      p_request_id: requestId,
      p_status: nextStatus,
      p_review_note: reviewNote || null,
    });
    if (error) throw error;
    toast.success(nextStatus === "approved" ? "הבקשה אושרה" : "הבקשה נדחתה");
    return { id: requestId, status: nextStatus };
  } catch (error) {
    console.error(error);
    toast.error("נכשל בעדכון סטטוס הבקשה");
    throw error;
  }
}
