import React, { memo, useEffect, useRef, useContext, useMemo } from "react";
import { TimeContext } from "../contexts/TimeContext.jsx";

// Constantes fora do escopo para evitar re-alocação
const BOUNDARY_X = 300;
const BOUNDARY_Y = 200;

const FloatingBubble = memo(({ bubble, index, onClickBubble }) => {
  const { timeNow } = useContext(TimeContext);
  const bubbleRef = useRef(null);

  // Memoiza cálculos derivados para evitar recalculo no render
  const { score, idadeMinutos, vidaPercent, categoria, size } = useMemo(() => {
    // ... [Sua lógica de cálculo aqui]
    // DICA: Mova sua lógica de categoria/tamanho para um helper externo 
    // se ficar muito grande para manter o arquivo limpo.
    return { /* ... resultados */ };
  }, [bubble, timeNow]);

  // A Física agora é injetada via refs ou gerenciada por um "Engine" pai,
  // mas se mantivermos aqui, garantimos que o efeito não cause re-render do React.
  useEffect(() => {
    let frameId;
    const el = bubbleRef.current;
    
    const animate = () => {
      // Movimento puro via DOM, bypassando o estado do React
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // O JSX é agora puramente declarativo
  return (
    <div
      ref={bubbleRef}
      className="absolute cursor-pointer group will-change-transform"
      style={{ width: size, height: size }}
      onClick={() => onClickBubble(bubble._id)}
    >
      <BubbleContent categoria={categoria} bubble={bubble} size={size} />
    </div>
  );
});

// Componente Visual separado = Performance de Renderização Superior
const BubbleContent = memo(({ categoria, bubble, size }) => {
  const estilo = getEstilosPorCategoria(categoria); // Helper externo
  
  return (
    <div className={`w-full h-full rounded-full bg-gradient-to-br ${estilo.gradient} ...`}>
      {/* Conteúdo estático/dinâmico */}
    </div>
  );
});

FloatingBubble.displayName = "FloatingBubble";
export default FloatingBubble;