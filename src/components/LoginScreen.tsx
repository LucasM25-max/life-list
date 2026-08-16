import React from 'react';
import { signInWithGoogle } from '../utils/firebase';
import { Trees, Compass } from 'lucide-react';
import appLogo from '../assets/images/bold_app_logo_1786709233012.jpg';

export const LoginScreen: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to login. Please try again.");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#fdfbf7] p-4 font-sans text-[#1f241d]">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-[#e6dfd3] flex flex-col items-center text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-[#2e4a36] blur-2xl opacity-20 rounded-full"></div>
          <img
            src={appLogo}
            alt="Life Logo"
            className="w-24 h-24 rounded-2xl object-cover shadow-sm border border-[#233a2b]/20 relative z-10"
          />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-serif-species tracking-tight text-[#1f241d]">Life</h1>
          <p className="text-sm text-[#6b7568] max-w-[250px] mx-auto">
            Your personal, cloud-synced field and aquarium life list.
          </p>
        </div>

        <div className="w-full pt-4">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[#e6dfd3] hover:border-[#2e4a36] hover:bg-[#faf9f6] text-[#1f241d] font-bold py-3 px-4 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="pt-2 flex items-center justify-center gap-4 text-[#828d7e]">
          <div className="flex items-center gap-1.5 text-xs">
            <Compass className="w-3.5 h-3.5" />
            <span>Wild</span>
          </div>
          <span className="text-[10px]">·</span>
          <div className="flex items-center gap-1.5 text-xs">
            <Trees className="w-3.5 h-3.5" />
            <span>Captive</span>
          </div>
        </div>
      </div>
    </div>
  );
};
