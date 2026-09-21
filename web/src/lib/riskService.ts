import { supabase } from "@/lib/supabase";

export interface RiskFactor {
  factor: string;
  points: number;
}

export interface RiskScoreResult {
  score: number;
  risk_band: "LOW" | "MEDIUM" | "HIGH";
  factors: RiskFactor[];
}

/**
 * Computes the transparent, rule-based risk score (0-100) for a given instrument.
 * Strictly non-ML institutional metrology evaluation based on 6 regulatory factors:
 * 1. Certificate expired (+40)
 * 2. Certificate expiring within 30 days (+15)
 * 3. Open citizen complaints (+15 each, max 30)
 * 4. Previous inspection failed calibration (+20)
 * 5. Never re-verified after 2+ years (+15)
 * 6. Serial mismatch / tampering detected (+25)
 */
export async function computeInstrumentRisk(
  instrumentId: string
): Promise<RiskScoreResult> {
  try {
    // 1. Attempt to call the PostgreSQL RPC function
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      "compute_risk_score",
      { p_instrument_id: instrumentId }
    );

    if (!rpcError && rpcData && rpcData.length > 0) {
      const res = rpcData[0];
      return {
        score: res.total_score ?? 0,
        risk_band: res.risk_band ?? "LOW",
        factors: res.factors ?? [],
      };
    }

    // 2. Client-side fallback if RPC is unreachable
    return await computeRiskClientSide(instrumentId);
  } catch (err) {
    console.warn("computeInstrumentRisk falling back to client calculation:", err);
    return await computeRiskClientSide(instrumentId);
  }
}

/**
 * Transparent client-side risk evaluator matching the exact SQL rule matrix
 */
async function computeRiskClientSide(instrumentId: string): Promise<RiskScoreResult> {
  let score = 0;
  const factors: RiskFactor[] = [];
  const now = new Date();

  // A. Certificate Check
  const { data: certs } = await (supabase.from("certificates") as any)
    .select("valid_till, is_revoked")
    .eq("instrument_id", instrumentId)
    .eq("is_revoked", false)
    .order("issued_at", { ascending: false })
    .limit(1);

  const cert = certs && (certs as any[]).length > 0 ? (certs as any[])[0] : null;
  if (cert && cert.valid_till) {
    const validTill = new Date(cert.valid_till);
    const diffMs = validTill.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      score += 40;
      factors.push({ factor: "Certificate expired", points: 40 });
    } else if (diffDays <= 30) {
      score += 15;
      factors.push({ factor: "Certificate expiring within 30 days", points: 15 });
    }
  }

  // B. Open Complaints Check
  const { data: complaints } = await (supabase.from("complaints") as any)
    .select("id, status, description")
    .eq("instrument_id", instrumentId)
    .in("status", ["open", "assigned"]);

  const complaintList = (complaints as any[]) || [];
  const openCount = complaintList.length;
  if (openCount > 0) {
    const complaintPts = Math.min(openCount * 15, 30);
    score += complaintPts;
    factors.push({
      factor: `${openCount} open citizen complaint(s)`,
      points: complaintPts,
    });
  }

  // C. Previous Inspection Result
  const { data: inspections } = await (supabase.from("inspections") as any)
    .select("result, checklist, remarks")
    .eq("instrument_id", instrumentId);

  const inspectionList = (inspections as any[]) || [];
  const hasFailed = inspectionList.some((i) => i.result === "fail");
  if (hasFailed) {
    score += 20;
    factors.push({ factor: "Previous inspection failed calibration", points: 20 });
  }

  // D. Never Re-verified after 2+ Years
  if (!cert) {
    const { data: inst } = await (supabase.from("instruments") as any)
      .select("created_at")
      .eq("id", instrumentId)
      .single();

    if (inst && (inst as any).created_at) {
      const createdDate = new Date((inst as any).created_at);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);

      if (createdDate < twoYearsAgo) {
        score += 15;
        factors.push({ factor: "Never re-verified after 2+ years", points: 15 });
      }
    }
  }

  // E. Serial Mismatch or Tampering Detected
  const hasMismatchInInspection = inspectionList.some((i: any) => {
    const chk = i.checklist || {};
    return (
      chk.serial_match === false ||
      chk.serial_authentic === false ||
      (i.remarks && /mismatch|tamper/i.test(i.remarks))
    );
  });

  const hasMismatchInComplaint = complaintList.some((c: any) =>
    /mismatch|serial|seal broken|tamper/i.test(c.description || "")
  );

  if (hasMismatchInInspection || hasMismatchInComplaint) {
    score += 25;
    factors.push({
      factor: "Serial mismatch / tampering previously detected",
      points: 25,
    });
  }

  const cappedScore = Math.min(score, 100);
  let risk_band: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (cappedScore > 60) {
    risk_band = "HIGH";
  } else if (cappedScore > 30) {
    risk_band = "MEDIUM";
  }

  return {
    score: cappedScore,
    risk_band,
    factors,
  };
}

export function getRiskBadgeStyles(band: "LOW" | "MEDIUM" | "HIGH") {
  switch (band) {
    case "HIGH":
      return {
        badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
        pillClass: "bg-red-500",
        label: "High Risk",
      };
    case "MEDIUM":
      return {
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        pillClass: "bg-amber-500",
        label: "Medium Risk",
      };
    case "LOW":
    default:
      return {
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        pillClass: "bg-emerald-500",
        label: "Low Risk",
      };
  }
}
