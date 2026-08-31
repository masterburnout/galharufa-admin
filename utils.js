// Utilitários de texto e tradução usados em vários pontos do painel admin.
// Eles centralizam o mapeamento de estados e papéis para evitar repetição no código.

export function formatStatus(status) {
  const labels = {
    active: 'Ativa',
    pending: 'Pendente',
    rejected: 'Rejeitada',
    inactive: 'Inativa',
    draft: 'Rascunho'
  };
  return labels[status] || status;
}

export function formatRole(role) {
  const labels = {
    public_user: 'Público',
    general_public: 'Público geral',
    student: 'Estudante',
    theater_company: 'Companhia de teatro',
    company_admin: 'Admin de companhia',
    company_member: 'Membro',
    institution_rep: 'Representante de instituição',
    platform_admin: 'Admin da plataforma'
  };
  return labels[role] || role;
}

export function formatVerification(status) {
  const labels = {
    verified: 'Verificado',
    pending: 'Pendente',
    rejected: 'Rejeitado'
  };
  return labels[status] || 'Pendente';
}

export function getCompanyMembers(companyName, members) {
  if (!companyName) return [];
  return members.filter(member => member.companyName && member.companyName.toLowerCase() === companyName.toLowerCase());
}
