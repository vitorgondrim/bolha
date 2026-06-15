import React, { useState, useEffect, useRef, useContext, memo } from "react";
import { TimeContext } from "../contexts/TimeContext";

// Definições constantes fora do componente para não recriar na memória
const CORES = [
  { bg: "from-cyan-400/90 to-blue-500/90" },
  { bg: "from-lime-400/90 to-emerald-500/90" },
];

export default function BubbleMap({ bubbles, onBubbleClick }) {
  const { timeNow } = useContext(TimeContext);
  const containerRef = useRef(null);
  
  // Refs para física (acesso direto, sem re-render)
  const posRefs = useRef(new Map());
  const requestRef = useRef();
  // Ref para rastrear se a animação está ativa (evita loops concorrentes)
  const animationActiveRef = useRef(false);
  // Ref para armazenar bubbles atual sem causar re-render no loop RAF
  const bubblesRef = useRef(bubbles);

  // Mantém bubblesRef sincronizado sem reexecutar o hook de animação
  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  // Estado apenas para controle de zoom/offset (UI externa)
  const [zoom] = useState(1);
  const [offset] = useState({ x: 0, y: 0 });

  // Inicializa posições iniciais
  useEffect(() => {
    bubbles.forEach((b) => {
      if (!posRefs.current.has(b._id)) {
        posRefs.current.set(b._id, {
          x: Math.random() * 800,
          y: Math.random() * 600,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2
        });
      }
    });
  }, [bubbles]);

  // Loop de física: Isolado do ciclo de render do React
  // Otimizado com Page Visibility API para pausar em abas ocultas
  useEffect(() => {
    const animate = () => {
      // ─── CHECK 1: Aba oculta? Pausa o loop ─────────────────
      if (document.hidden) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      // ─── CHECK 2: Feed vazio? Mata o loop ──────────────────
      const entries = posRefs.current.entries();
      const bArray = Array.from(entries);
      
      if (bArray.length === 0) {
        animationActiveRef.current = false;
        return; // Não agenda próximo frame — loop morto
      }
      
      bArray.forEach(([, p]) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99; 
        p.vy *= 0.99;
        
        if (p.x < 0 || p.x > 2000) p.vx *= -1;
        if (p.y < 0 || p.y > 2000) p.vy *= -1;
      });

      // Atualização direta do DOM (A mágica da performance)
      bArray.forEach(([id, p]) => {
        const el = document.getElementById(`bubble-${id}`);
        if (el) {
          el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    // ─── HANDLER: Page Visibility API ────────────────────────────
    // Quando a aba volta a ficar visível e o loop não está ativo,
    // reativa a animação (desde que haja bubbles)
    const handleVisibilityChange = () => {
      if (!document.hidden && !animationActiveRef.current && bubblesRef.current.length > 0) {
        animationActiveRef.current = true;
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    // Registra listener de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Inicia o loop apenas se houver bubbles
    if (bubbles.length > 0) {
      animationActiveRef.current = true;
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      animationActiveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden cursor-move bg-slate-950">
      <div style={{ transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)` }}>
        {bubbles.map((bubble) => (
          <div
            id={`bubble-${bubble._id}`}
            key={bubble._id}
            className="absolute will-change-transform"
          >
            <BubbleNode 
               bubble={bubble} 
               onClick={() => onBubbleClick(bubble._id)} 
               timeNow={timeNow}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const BubbleNode = memo(({ bubble, onClick }) => {
  const conexoes = (bubble.likes?.length || 0) + (bubble.sopros?.length || 0);
  const size = Math.sqrt(conexoes + 1) * 20 + 30;

  return (
    <button 
      onClick={onClick}
      className="rounded-full bg-cyan-500 shadow-xl hover:scale-110 transition-transform duration-300"
      style={{ width: size, height: size }}
    >
      <span className="text-[10px] font-bold text-black">{bubble.title}</span>
    </button>
  );
});

BubbleNode.displayName = "BubbleNode";