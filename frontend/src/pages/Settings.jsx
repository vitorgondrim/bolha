// ============================================================
// PÁGINA: CONFIGURAÇÕES
// Rota: /settings
//
// Página placeholder para configurações do usuário.
// Atualmente exibe apenas uma mensagem de "Em breve".
//
// Funcionalidades planejadas:
//   - Personalização de perfil
//   - Preferências de notificação
//   - Privacidade e segurança
//   - Gerenciamento de conta
// ============================================================

import BubbleHUD from '../components/BubbleHUD';

export default function Settings() {
  return (
    <BubbleHUD>
      {/* ============================================================
          CABEÇALHO
          ============================================================ */}
      <section className="glass-card p-6">
        <h1 className="section-heading">
          ⚙️ Configurações
        </h1>
        <p className="section-description mt-2">
          Ajustes da conta, notificações e preferências.
        </p>
      </section>

      {/* ============================================================
          CONTEÚDO PLACEHOLDER
          ============================================================ */}
      <div className="glass-card p-8 text-center text-slate-400">
        <div className="text-5xl mb-4">🔧</div>
        <p className="text-lg font-medium text-slate-300">
          Em breve
        </p>
        <p className="text-sm mt-2 text-slate-500">
          Personalização de perfil, notificações e privacidade.
        </p>
      </div>
    </BubbleHUD>
  );
}