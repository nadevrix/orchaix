import React from 'react';
import { Bot, TrendingUp } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = '', size = 40, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Navy circle border */}
        <div 
          className="absolute rounded-full border-2 border-[#1e3a8a] flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {/* Green accent arc */}
          <div className="absolute w-full h-full rounded-full border-2 border-transparent border-t-[#0ea5e9] border-r-[#10b981] rotate-45" />
        </div>
        
        {/* Robot inside */}
        <Bot 
          size={size * 0.55} 
          className="text-[#1e3a8a] relative z-10" 
          strokeWidth={2.5}
        />
        
        {/* Trending up small icon */}
        <div className="absolute -bottom-1 -right-2 bg-white rounded-full p-0.5 shadow-sm">
          <TrendingUp size={size * 0.35} className="text-[#10b981]" strokeWidth={3} />
        </div>
      </div>
      
      {showText && (
        <div className="font-extrabold tracking-tight" style={{ fontSize: size * 0.8 }}>
          <span className="text-[#1e3a8a]">Orch</span>
          <span className="text-[#10b981]">aix</span>
        </div>
      )}
    </div>
  );
}
