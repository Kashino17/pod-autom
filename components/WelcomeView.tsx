import React from 'react';
import { LayoutGrid, MousePointerClick } from 'lucide-react';

export const WelcomeView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 h-full">
      
      <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
        
        <div className="relative w-20 h-20 mx-auto">
           <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
           <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center shadow-2xl">
              <LayoutGrid className="w-8 h-8 text-white" />
           </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            ReBoss Manager
          </h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Select a shop from the sidebar dropdown to access your automation workspace.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
           <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-dashed border-zinc-700 bg-zinc-900/50 text-xs text-zinc-400">
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>Open the switcher in the top left</span>
           </div>
        </div>

      </div>
      
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
    </div>
  );
};