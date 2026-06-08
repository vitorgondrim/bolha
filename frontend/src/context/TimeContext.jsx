/* eslint-disable react-refresh/only-export-components */
// ============================================================
// CONTEXTO: TIME (PROVIDER)
// Fornece um timestamp atualizado a cada 1 segundo para
// todo o aplicativo.
//
// Motivação:
//   As bolhas têm tempo de vida limitado e precisam de um
//   "relógio global" para calcular o tempo restante.
//   Em vez de cada componente criar seu próprio setInterval,
//   centralizamos aqui para ter UMA ÚNICA fonte de tempo.
//
// Performance:
//   - Apenas 1 setInterval para todo o app
//   - Atualiza a cada 1000ms (suficiente para UI de minutos/segundos)
//   - useMemo nos componentes filhos evita re-renders desnecessários
// ============================================================

import { useEffect, useState } from 'react';
import { createContext } from 'react';
export const TimeContext = createContext({});

export function TimeProvider({ children }) {
  // ============================================================
  // ESTADO
  // Inicializa com Date.now() para evitar flicker inicial.
  // ============================================================
  const [timeNow, setTimeNow] = useState(() => Date.now());

  // ============================================================
  // RELÓGIO GLOBAL
  // Um único setInterval atualiza o timestamp a cada segundo.
  // Cleanup: clearInterval ao desmontar.
  // ============================================================
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================================
  // PROVIDER
  // ============================================================
  return (
    <TimeContext.Provider value={{ timeNow }}>
      {children}
    </TimeContext.Provider>
  );
}