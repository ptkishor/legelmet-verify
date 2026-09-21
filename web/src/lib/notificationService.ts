import { supabase } from "@/lib/supabase";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "alert";
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface ExpiryCronResult {
  success: boolean;
  expired_status_updated: number;
  notifications_dispatched: number;
  evaluated_at: string;
}

/**
 * Fetch all notifications for the authenticated user, newest first.
 */
export async function fetchUserNotifications(
  userId: string
): Promise<NotificationItem[]> {
  try {
    const { data, error } = await (supabase.from("notifications") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("fetchUserNotifications error:", error.message);
      return [];
    }

    return (data as NotificationItem[]) || [];
  } catch (err) {
    console.error("fetchUserNotifications exception:", err);
    return [];
  }
}

/**
 * Get count of unread notifications for a user.
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  try {
    const { count, error } = await (supabase.from("notifications") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<boolean> {
  try {
    const { error } = await (supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("id", notificationId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read for a given user.
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<boolean> {
  try {
    // Attempt RPC first
    const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)(
      "mark_all_notifications_read",
      { p_user_id: userId }
    );

    if (!rpcErr && rpcRes?.success) {
      return true;
    }

    // Direct update fallback
    const { error } = await (supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Executes the Expiry Alert & Compliance Evaluation Cron.
 * 1. Checks certificates for T-30, T-15, and T-0 expiration thresholds.
 * 2. Marks elapsed instruments as 'expired'.
 * 3. Creates targeted notifications for owners and district officers.
 */
export async function runExpiryAlertsCron(): Promise<ExpiryCronResult> {
  try {
    // 1. Try calling the PostgreSQL stored procedure
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      "process_expiry_alerts"
    );

    if (!rpcError && rpcData) {
      return rpcData as ExpiryCronResult;
    }

    // 2. Client-side cron runner fallback
    return await executeExpiryCronClientSide();
  } catch (err) {
    console.warn("runExpiryAlertsCron falling back to client evaluation:", err);
    return await executeExpiryCronClientSide();
  }
}

/**
 * Client-side cron execution fallback for maximum resilience
 */
async function executeExpiryCronClientSide(): Promise<ExpiryCronResult> {
  const now = new Date();
  let updatedExpired = 0;
  let notificationsSent = 0;

  // Fetch all active certificates joined with instruments
  const { data: certs } = await (supabase.from("certificates") as any)
    .select(`
      id, certificate_no, valid_till, is_revoked,
      instruments (
        id, digital_id, shop_name, district, state, status, owner_id
      )
    `)
    .eq("is_revoked", false);

  if (certs && certs.length > 0) {
    for (const item of certs as any[]) {
      const inst = item.instruments;
      if (!inst) continue;

      const validTill = new Date(item.valid_till);
      const diffDays = (validTill.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // A. T-0 Expired
      if (diffDays < 0) {
        if (inst.status === "verified") {
          await (supabase.from("instruments") as any)
            .update({ status: "expired" })
            .eq("id", inst.id);
          updatedExpired++;
        }

        if (inst.owner_id) {
          const { data: existing } = await (supabase.from("notifications") as any)
            .select("id")
            .eq("user_id", inst.owner_id)
            .eq("title", "Certificate EXPIRED — Reverification Required")
            .limit(1);

          if (!existing || existing.length === 0) {
            await (supabase.from("notifications") as any).insert({
              user_id: inst.owner_id,
              title: "Certificate EXPIRED — Reverification Required",
              message: `Verification certificate ${item.certificate_no} for ${inst.shop_name} (${inst.digital_id}) has expired. Continued commercial use is prohibited under Legal Metrology Act.`,
              type: "alert",
              is_read: false,
              link: "/business/certificates",
            });
            notificationsSent++;
          }
        }
      }
      // B. T-15 Days Expiring Soon
      else if (diffDays <= 15) {
        if (inst.owner_id) {
          const { data: existing } = await (supabase.from("notifications") as any)
            .select("id")
            .eq("user_id", inst.owner_id)
            .eq("title", "Urgent: Certificate Expiring in 15 Days")
            .limit(1);

          if (!existing || existing.length === 0) {
            await (supabase.from("notifications") as any).insert({
              user_id: inst.owner_id,
              title: "Urgent: Certificate Expiring in 15 Days",
              message: `Certificate ${item.certificate_no} for ${inst.shop_name} (${inst.digital_id}) expires in less than 15 days. Submit re-verification now.`,
              type: "warning",
              is_read: false,
              link: "/business/certificates",
            });
            notificationsSent++;
          }
        }
      }
      // C. T-30 Days Notice
      else if (diffDays <= 30) {
        if (inst.owner_id) {
          const { data: existing } = await (supabase.from("notifications") as any)
            .select("id")
            .eq("user_id", inst.owner_id)
            .eq("title", "Certificate Expiring Soon (30 Days)")
            .limit(1);

          if (!existing || existing.length === 0) {
            await (supabase.from("notifications") as any).insert({
              user_id: inst.owner_id,
              title: "Certificate Expiring Soon (30 Days)",
              message: `Certificate ${item.certificate_no} for ${inst.shop_name} (${inst.digital_id}) will expire on ${validTill.toLocaleDateString("en-IN")}. Please schedule verification.`,
              type: "info",
              is_read: false,
              link: "/business/certificates",
            });
            notificationsSent++;
          }
        }
      }
    }
  }

  // D. District Officers summary
  const { data: officers } = await (supabase.from("profiles") as any)
    .select("id, full_name, jurisdiction_district")
    .eq("role", "metrology_officer")
    .eq("is_active", true);

  if (officers && (officers as any[]).length > 0) {
    for (const off of officers as any[]) {
      if (!off.jurisdiction_district) continue;

      const { data: expiringInDistrict } = await (supabase.from("instruments") as any)
        .select(`
          id,
          certificates ( valid_till, is_revoked )
        `)
        .eq("district", off.jurisdiction_district);

      const countExpiring = (expiringInDistrict || []).filter((i: any) => {
        const cert = (i.certificates || [])[0];
        if (!cert || cert.is_revoked) return false;
        const diff = (new Date(cert.valid_till).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      }).length;

      if (countExpiring > 0) {
        const { data: existing } = await (supabase.from("notifications") as any)
          .select("id")
          .eq("user_id", off.id)
          .like("title", "Jurisdiction Expiry Digest%")
          .limit(1);

        if (!existing || existing.length === 0) {
          await (supabase.from("notifications") as any).insert({
            user_id: off.id,
            title: `Jurisdiction Expiry Digest: ${off.jurisdiction_district}`,
            message: `${countExpiring} instrument(s) in ${off.jurisdiction_district} have expired or will expire within 30 days. Review the verification queue.`,
            type: "warning",
            is_read: false,
            link: "/officer/inspections",
          });
          notificationsSent++;
        }
      }
    }
  }

  return {
    success: true,
    expired_status_updated: updatedExpired,
    notifications_dispatched: notificationsSent,
    evaluated_at: now.toISOString(),
  };
}
