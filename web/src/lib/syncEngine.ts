import { offlineDb } from "@/lib/offlineDb";
import { supabase } from "@/lib/supabase";
import { generateCertificateHmac } from "@/lib/crypto";

// Key for simulated offline state in localStorage
const SIMULATED_OFFLINE_KEY = "legalmet_simulated_offline";

/**
 * Returns whether the app is currently in simulated offline mode
 */
export function isSimulatedOffline(): boolean {
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === "true";
}

/**
 * Toggle simulated offline mode (ideal for hackathon evaluations)
 */
export function setSimulatedOffline(offline: boolean) {
  localStorage.setItem(SIMULATED_OFFLINE_KEY, offline ? "true" : "false");
  window.dispatchEvent(new CustomEvent("legalmet-connectivity-change", { detail: { isOnline: getEffectiveOnlineStatus() } }));
}

/**
 * Evaluates whether the application is effectively online
 */
export function getEffectiveOnlineStatus(): boolean {
  if (isSimulatedOffline()) return false;
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Process all pending offline inspections and synchronize with Supabase
 */
export async function syncPendingInspections(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}> {
  if (!getEffectiveOnlineStatus()) {
    const pendingCount = await offlineDb.inspections.where("sync_status").equals("pending").count();
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [`Device is offline (${pendingCount} inspection(s) queued in IndexedDB)`],
    };
  }

  const pending = await offlineDb.inspections
    .where("sync_status")
    .equals("pending")
    .toArray();

  if (pending.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const item of pending) {
    try {
      if (item.id) {
        await offlineDb.inspections.update(item.id, { sync_status: "syncing" });
      }

      // 1. Upsert inspection record to Supabase
      const { data: insData, error: insError } = await (supabase
        .from("inspections") as any)
        .upsert(
          {
            client_uuid: item.client_uuid,
            application_id: item.application_id,
            instrument_id: item.instrument_id,
            officer_id: item.officer_id,
            checklist: item.checklist,
            readings: item.readings,
            photos: item.photos || [],
            latitude: item.latitude,
            longitude: item.longitude,
            result: item.result,
            remarks: item.remarks,
            inspected_at: item.inspected_at,
            offline_created_at: item.offline_created_at,
            sync_status: "synced",
          },
          { onConflict: "client_uuid" }
        )
        .select()
        .single();

      if (insError) throw insError;

      // 2. Handle Inspection Result (Certification or Rejection)
      if (item.result === "pass") {
        // Calculate 1 year validity from inspection date
        const validTillDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        // Check if certificate already generated for this inspection
        const { data: existingCert } = await supabase
          .from("certificates")
          .select("id")
          .eq("inspection_id", insData.id)
          .maybeSingle();

        if (!existingCert) {
          const initialSignature = await generateCertificateHmac(
            item.instrument_digital_id || item.instrument_id,
            `INSP-${item.client_uuid.slice(0, 8).toUpperCase()}`,
            validTillDate,
            item.officer_id
          );

          // Insert certificate (trigger generate_certificate_no creates certificate_no)
          const { data: certData, error: certError } = await (supabase
            .from("certificates") as any)
            .insert({
              instrument_id: item.instrument_id,
              inspection_id: insData.id,
              issued_by: item.officer_id,
              valid_till: validTillDate,
              signature_hash: initialSignature,
            })
            .select()
            .single();

          if (!certError && certData) {
            // Recompute HMAC with the generated certificate_no
            const finalSignature = await generateCertificateHmac(
              item.instrument_digital_id || item.instrument_id,
              certData.certificate_no,
              validTillDate,
              item.officer_id
            );

            await (supabase.from("certificates") as any)
              .update({ signature_hash: finalSignature })
              .eq("id", certData.id);
          }
        }

        // Update instrument and application status
        await (supabase.from("instruments") as any)
          .update({ status: "verified" })
          .eq("id", item.instrument_id);

        await (supabase.from("applications") as any)
          .update({ status: "approved" })
          .eq("id", item.application_id);
      } else {
        // Inspection failed -> mark rejected
        await (supabase.from("instruments") as any)
          .update({ status: "rejected" })
          .eq("id", item.instrument_id);

        await (supabase.from("applications") as any)
          .update({ status: "rejected" })
          .eq("id", item.application_id);
      }

      // 3. Mark synced in local IndexedDB
      if (item.id) {
        await offlineDb.inspections.update(item.id, {
          sync_status: "synced",
          sync_error: null,
        });
      }

      syncedCount++;
    } catch (err: any) {
      console.error("Sync error for inspection:", item.client_uuid, err);
      failedCount++;
      const msg = err.message || "Network sync failure";
      errors.push(msg);

      if (item.id) {
        await offlineDb.inspections.update(item.id, {
          sync_status: "pending",
          sync_error: msg,
        });
      }
    }
  }

  // Notify components of sync completion
  window.dispatchEvent(
    new CustomEvent("legalmet-sync-complete", {
      detail: { synced: syncedCount, failed: failedCount },
    })
  );

  return {
    success: failedCount === 0,
    synced: syncedCount,
    failed: failedCount,
    errors,
  };
}

// Auto-sync on window online event
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (!isSimulatedOffline()) {
      syncPendingInspections();
    }
  });
}
