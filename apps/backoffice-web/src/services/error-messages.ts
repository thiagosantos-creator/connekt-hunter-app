/** Maps backend error codes to user-friendly Portuguese messages. */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const text = err.message;
    if (text.includes('user_not_member_of_org')) {
      return 'Você não tem acesso a essa organização. Verifique se seu usuário está vinculado à empresa selecionada.';
    }
    if (text.includes('candidate_vacancy_cross_tenant_mismatch')) {
      return 'O candidato e a vaga pertencem a organizações diferentes. Selecione um candidato e uma vaga da mesma empresa.';
    }
    if (text.includes('vacancy_not_found')) return 'Vaga não encontrada. Selecione uma vaga válida.';
    if (text.includes('candidate_not_found')) return 'Candidato não encontrado. Selecione um candidato válido.';
    if (text.includes('application_not_found')) return 'Candidatura não encontrada. Selecione uma candidatura válida.';
    return text;
  }
  return 'Erro inesperado. Tente novamente.';
}
