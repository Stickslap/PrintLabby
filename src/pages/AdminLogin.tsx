import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle, auth, logout, signInAnonymouslyWithFirebase, db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "motion/react";
import { Shield, ArrowLeft, Lock } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

const ADMIN_EMAILS = [
  "support@printlabby.com",
  "Arlington.A.Teheran@gmail.com",
  "arlington.a.teheran@gmail.com"
];

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Verify credentials via secure server route
      const response = await axios.post("/api/admin/staff-login", { username, password });
      
      if (response.data.success) {
        // 2. Try to establish a Firebase session (optional — fails gracefully if Firebase Anonymous Auth is not enabled)
        try {
          await signInAnonymouslyWithFirebase();
        } catch (firebaseErr) {
          console.warn("Firebase anonymous auth unavailable — using localStorage session only.", firebaseErr);
        }
        
        try {
          await addDoc(collection(db, "admin_login_logs"), {
            email: username,
            success: true,
            method: "STAFF_LOGIN",
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to log admin login", logErr);
        }

        localStorage.setItem("staff_authenticated", "true");
        localStorage.setItem("staff_session_time", Date.now().toString());
        toast.success("Staff Authentication Successful");
        navigate("/admin");
      }
    } catch (err: any) {
      try {
        await addDoc(collection(db, "admin_login_logs"), {
          email: username,
          success: false,
          method: "STAFF_LOGIN",
          errorMessage: err.response?.data?.error || "Invalid Security Credentials",
          createdAt: serverTimestamp()
        });
      } catch (logErr) {
        console.error("Failed to log admin login", logErr);
      }
      toast.error(err.response?.data?.error || "Invalid Security Credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      
      if (user && user.email && (ADMIN_EMAILS.includes(user.email) || user.email.toLowerCase().includes("arlington.a.teheran"))) {
        try {
          await addDoc(collection(db, "admin_login_logs"), {
            email: user.email,
            success: true,
            method: "GOOGLE_LOGIN",
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to log admin login", logErr);
        }

        localStorage.setItem("staff_authenticated", "true");
        localStorage.setItem("staff_session_time", Date.now().toString());
        toast.success("Identity Verified");
        navigate("/admin");
      } else {
        try {
          await addDoc(collection(db, "admin_login_logs"), {
            email: user?.email || "Unknown",
            success: false,
            method: "GOOGLE_LOGIN",
            errorMessage: "Unauthorized: Credentials rejected by security protocol.",
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to log admin login", logErr);
        }

        await logout();
        toast.error("Unauthorized: Credentials rejected by security protocol.");
      }
    } catch (err: any) {
      console.error(err);
      try {
        await addDoc(collection(db, "admin_login_logs"), {
          email: "Auth_Error",
          success: false,
          method: "GOOGLE_LOGIN",
          errorMessage: err.message || "Authentication handshake failed.",
          createdAt: serverTimestamp()
        });
      } catch (logErr) {
        console.error("Failed to log admin login", logErr);
      }
      
      let msg = "Authentication handshake failed.";
      if (err?.code === 'auth/operation-not-allowed') {
        msg = "Google sign-in is not enabled in Firebase. Enable it in your Firebase console.";
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        msg = "Sign-in popup was closed or cancelled. Please try again.";
      } else if (err?.code === 'auth/popup-blocked') {
        msg = "Sign-in popup was blocked by your browser. Please allow popups for this site.";
      }
      
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[320px] w-full relative z-10"
      >
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-12"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Public Registry
        </button>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 rounded-[1.5rem] shadow-2xl">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 mx-auto border border-primary/30">
            <Shield className="w-6 h-6 text-primary" />
          </div>

          <div className="text-center space-y-2 mb-6">
            <h1 className="text-xl font-headline font-black uppercase italic text-white tracking-tighter">RESTRICTED<br />WORKSTATION</h1>
            <p className="text-white/40 text-[8px] font-bold uppercase tracking-[0.2em] max-w-[180px] mx-auto leading-relaxed">
              Administrative credentials required for terminal access.
            </p>
          </div>

          <form onSubmit={handleStaffLogin} className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="USERNAME"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[9px] font-black uppercase tracking-widest focus:border-primary/50 focus:ring-0 outline-none transition-all placeholder:text-white/20"
                  required
                />
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[9px] font-black uppercase tracking-widest focus:border-primary/50 focus:ring-0 outline-none transition-all placeholder:text-white/20"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 rounded-xl font-headline font-black uppercase tracking-[0.2em] italic text-[11px] hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 mt-2"
            >
              <Lock className="w-3.5 h-3.5" /> {loading ? "VERIFYING..." : "ENTER TERMINAL —"}
            </button>
            
            <div className="relative flex items-center gap-3 py-2">
              <div className="flex-1 h-[1px] bg-white/10"></div>
              <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em]">OR</span>
              <div className="flex-1 h-[1px] bg-white/10"></div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleLogin}
              className="w-full bg-transparent border border-white/10 text-white py-3 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all text-center"
            >
              Google Identity
            </button>
            
            <p className="text-center text-[8px] font-bold text-white/10 uppercase tracking-widest mt-6">
              Encrypted Session Management Active
            </p>
          </form>
        </div>

        <div className="mt-12 text-center text-white/10 uppercase font-black text-xs tracking-[0.5em]">
          SECURITY MODULE v1.4.0
        </div>
      </motion.div>
    </div>
  );
}
