import { useEffect, useState, createContext, useMemo } from 'react';

export const TimeContext = createContext(null);

export function TimeProvider({ children }) {
  const [timeNow, setTimeNow] = useState(() => Date.now());

  useEffect(() => {
    // Usamos um intervalo de 1000ms para precisão de segundos
    const timer = setInterval(() => {
      setTimeNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Otimização Sênior: Memoizamos o valor do provider.
  // Isso evita que todos os consumidores do contexto (como centenas de bolhas)
  // forcem uma re-renderização se o objeto do valor não tiver mudado.
  const value = useMemo(() => ({ timeNow }), [timeNow]);

  return (
    <TimeContext.Provider value={value}>
      {children}
    </TimeContext.Provider>
  );
}