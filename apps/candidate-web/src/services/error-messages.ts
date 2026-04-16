/** Maps API errors to user-friendly Portuguese messages for the candidate portal. */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const text = err.message;
    if (text.includes('token_not_found') || text.includes('Token não encontrado') || text.includes('guest_session_not_found')) {
      return 'Código de acesso não encontrado. Verifique se você copiou o código completo do e-mail ou SMS recebido.';
    }
    if (text.includes('token_expired') || text.includes('guest_session_expired')) {
      return 'Este código de acesso expirou. Entre em contato com o recrutador para receber um novo convite.';
    }
    if (text.includes('candidate_not_found')) {
      return 'Candidato não encontrado. Verifique se o código de acesso está correto.';
    }
    if (text.includes('vacancy_not_found') || text.includes('vacancy_disabled') || text.includes('vacancy_expired')) {
      return 'Esta vaga não está mais disponível ou foi encerrada.';
    }
    if (text.includes('onboarding_already_completed')) {
      return 'Seu cadastro já foi concluído anteriormente. Você pode acessar o portal usando o mesmo código de acesso.';
    }
    if (text.includes('rate_limit') || text.includes('Too Many Requests') || text.includes('429')) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
    }
    if (text.includes('email_already_registered')) {
      return 'Este e-mail já está registrado nesta vaga. Use o link de acesso recebido anteriormente.';
    }
    if (text.includes('Network') || text.includes('fetch') || text.includes('Failed to fetch')) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
    }
    // Return the raw message only if it is reasonably presentable (no stack trace markers)
    if (!text.includes('at ') && !text.includes('Error:') && text.length < 300) {
      return text;
    }
    return 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.';
  }
  return 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.';
}
