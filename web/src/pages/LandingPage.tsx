import { Shield, ScanLine, FileCheck, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { useNavigate } from "react-router-dom";

import Navbar from "@/components/layout/Navbar";

/**
 * Public landing page — the first thing anyone sees.
 *
 * Design direction: institutional, credible, government-facing.
 * Not startup-flashy. Deep navy + white, clear hierarchy.
 */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <Navbar />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(216 84% 30% / 0.05) 0%, hsl(211 78% 46% / 0.08) 50%, hsl(216 84% 30% / 0.03) 100%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Department of Legal Metrology — Digital Platform
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight max-w-3xl mx-auto">
            Online Verification System for{" "}
            <span className="text-primary">
              Weighing & Measuring Instruments
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {APP_TAGLINE}. Every instrument gets a unique Digital ID and
            complete lifecycle record — from registration to re-verification.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/verify")}
              className="w-full sm:w-auto"
            >
              <ScanLine className="h-5 w-5 mr-2" />
              Scan & Verify an Instrument
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto"
            >
              Portal Login
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-16 sm:py-20 bg-secondary/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            A transparent, end-to-end digital workflow replacing paper-based
            processes with verifiable digital records.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                className="bg-card border border-border hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>{APP_NAME}</span>
          </div>
          <p>
            Smart India Hackathon 2026 · Team HackSphere · Problem Statement
            25036
          </p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: Shield,
    title: "Digital Instrument ID",
    description:
      "Every instrument gets a unique, nationally formatted Digital ID and a complete lifecycle record.",
  },
  {
    icon: ScanLine,
    title: "QR-Based Verification",
    description:
      "Consumers scan a QR code to instantly verify if an instrument is legally valid — no login needed.",
  },
  {
    icon: FileCheck,
    title: "Tamper-Proof Certificates",
    description:
      "Digital certificates with HMAC signatures and embedded QR codes. No more forged paper certificates.",
  },
  {
    icon: Activity,
    title: "Offline Field Inspections",
    description:
      "Officers complete inspections even without internet. Data syncs automatically when connectivity returns.",
  },
];
