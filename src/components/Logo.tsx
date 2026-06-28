import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 40 }: LogoProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={className}
      style={{ filter: 'drop-shadow(0px 0px 8px rgba(0, 229, 255, 0.35))' }}
    >
      {/* Outer Hexagon in Electric Cyan */}
      <polygon 
        points="50,8 87,29 87,71 50,92 13,71 13,29" 
        fill="none" 
        stroke="#00e5ff" 
        strokeWidth="6.5" 
        strokeLinejoin="round" 
      />
      {/* Stylized isometric N inside the Hexagon */}
      {/* Left Vertical Bar (with a slight isometric angle / shape) */}
      <path 
        d="M32,32 L32,68" 
        stroke="#ffffff" 
        strokeWidth="8" 
        strokeLinecap="round" 
      />
      {/* Right Vertical Bar */}
      <path 
        d="M68,32 L68,68" 
        stroke="#ffffff" 
        strokeWidth="8" 
        strokeLinecap="round" 
      />
      {/* Diagonal Cyan Connective Bar */}
      <path 
        d="M32,34 L68,66" 
        stroke="#00e5ff" 
        strokeWidth="9" 
        strokeLinecap="round" 
      />
    </svg>
  );
}
