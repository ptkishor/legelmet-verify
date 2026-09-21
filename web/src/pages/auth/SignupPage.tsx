import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  ArrowRight,
} from "lucide-react";
import { STATE_DISTRICTS } from "@/lib/constants";
import { toast } from "sonner";

export const SignupPage: React.FC = () => {
  const { signUp, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("Haryana");
  const [district, setDistrict] = useState("Gurugram");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableDistricts = STATE_DISTRICTS[state] || [];

  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    const districts = STATE_DISTRICTS[selectedState] || [];
    if (districts.length > 0) {
      setDistrict(districts[0]);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !shopName || !email || !password) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, phone, {
      jurisdiction_state: state,
      jurisdiction_district: district,
      designation: `Proprietor, ${shopName}`,
    });
    setSubmitting(false);

    if (error) {
      toast.error(`Registration failed: ${error.message}`);
    } else {
      toast.success("Account registered successfully! Please sign in.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Tricolor top border accent */}
      <div className="fixed top-0 left-0 right-0 h-1.5 flex z-50">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-700/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Register Establishment
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Legal Metrology Portal for Traders, Retailers & Scale Manufacturers
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Proprietor / Full Name *
              </Label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Business / Shop Name *
              </Label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <Input
                  type="text"
                  placeholder="e.g. Sharma Sweets & Dairy"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phone Number
                </Label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <Input
                    type="tel"
                    placeholder="+91 98111 88888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email Address *
                </Label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    type="email"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  State *
                </Label>
                <div className="mt-1">
                  <Select value={state} onValueChange={handleStateChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(STATE_DISTRICTS).map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  District *
                </Label>
                <div className="mt-1">
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDistricts.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Create Password *
              </Label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl text-sm transition-colors mt-2"
            >
              {submitting ? "Registering..." : "Complete Registration"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Already have an official account?{" "}
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500">
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
