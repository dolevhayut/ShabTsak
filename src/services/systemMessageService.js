import { supabase } from "./supabaseClient";
import { toast } from "@/services/notificationService";
import { getCredentials } from "./authCredentials";

export async function getSystemMessages(campId, { includeInactive = false } = {}) {
  try {
    const creds = getCredentials();
    const { data, error } = await supabase.rpc("rpc_get_system_messages", {
      ...creds,
      p_camp_id: campId,
      p_include_inactive: includeInactive,
    });
    if (error) throw error;

    const now = Date.now();
    return (data || []).filter(
      (m) => !m.expiresAt || Number(m.expiresAt) > now
    );
  } catch (err) {
    console.error(err);
    toast.error("נכשל בטעינת הודעות המערכת");
    return [];
  }
}

export async function createSystemMessage(payload) {
  try {
    const creds = getCredentials();
    const { data, error } = await supabase.rpc("rpc_create_system_message", {
      ...creds,
      p_camp_id:    payload.campId,
      p_outpost_id: payload.outpostId || null,
      p_title:      payload.title,
      p_content:    payload.content || null,
      p_priority:   payload.priority || "info",
      p_expires_at: payload.expiresAt || null,
    });
    if (error) throw error;
    toast.success("ההודעה פורסמה");
    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.error(err);
    toast.error("נכשל בפרסום ההודעה");
    throw err;
  }
}

export async function updateSystemMessage(id, payload) {
  try {
    const creds = getCredentials();
    const { data, error } = await supabase.rpc("rpc_update_system_message", {
      ...creds,
      p_id:         id,
      p_title:      payload.title      ?? null,
      p_content:    payload.content    ?? null,
      p_priority:   payload.priority   ?? null,
      p_expires_at: payload.expiresAt  ?? null,
      p_is_active:  payload.isActive   ?? null,
    });
    if (error) throw error;
    toast.success("ההודעה עודכנה");
    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.error(err);
    toast.error("נכשל בעדכון ההודעה");
    throw err;
  }
}

export async function deleteSystemMessage(id) {
  try {
    const creds = getCredentials();
    const { error } = await supabase.rpc("rpc_delete_system_message", {
      ...creds,
      p_id: id,
    });
    if (error) throw error;
    toast.success("ההודעה נמחקה");
  } catch (err) {
    console.error(err);
    toast.error("נכשל במחיקת ההודעה");
    throw err;
  }
}
