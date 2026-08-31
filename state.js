// Estado global da aplicação admin.
// Centralizamos dados estáticos de exemplo para manter a lógica de UI e regras de revisão
// em um único ponto de verdade enquanto o protótipo ainda está em estado local.
export const state = {
  isLoggedIn: false,
  currentView: 'login',
  currentUser: null,
  sidebarCollapsed: false,
  activeCompanyId: null,
  activeEventId: null,
  users: [
    {
      id: 'u-admin-1',
      name: 'Admin Plataforma',
      email: 'admin@galharufa.com',
      password: '123456',
      role: 'platform_admin'
    },
    {
      id: 'u-company-1',
      name: 'Marcos Almeida',
      email: 'companhia@galharufa.com',
      password: '123456',
      role: 'company_admin',
      companyName: 'Antropofágica'
    },
    {
      id: 'u-institution-1',
      name: 'Patrícia Souza',
      email: 'instituicao@galharufa.com',
      password: '123456',
      role: 'institution_rep',
      institution: 'Escola de Artes da USP'
    },
    {
      id: 'u-public-1',
      name: 'Leitor Galharufa',
      email: 'publico@galharufa.com',
      password: '123456',
      role: 'general_public'
    }
  ],
  companies: [
    {
      id: 'cmp-1',
      name: 'Antropofágica',
      category: 'Teatro de grupo',
      city: 'São Paulo',
      region: 'Centro',
      status: 'active',
      verificationStatus: 'verified',
      website: 'https://www.antropofagica.com/',
      instagram: '@antropofagica',
      description: 'Companhia com foco em dramaturgias contemporâneas e teatro coletivo.',
      notes: 'Companhia ativa e com histórico relevante na cena contemporânea.',
      isHistorical: true
    },
    {
      id: 'cmp-2',
      name: 'Cia. Mungunzá de Teatro',
      category: 'Teatro de grupo',
      city: 'São Paulo',
      region: 'Leste',
      status: 'pending',
      verificationStatus: 'pending',
      website: '',
      instagram: '',
      description: 'Baseada em práticas populares e formações coletivas.',
      notes: 'Aguardando confirmação de contato oficial e status de validação.',
      isHistorical: false
    },
    {
      id: 'cmp-3',
      name: 'Coletivo Acuenda',
      category: 'Coletivo',
      city: 'São Paulo',
      region: 'Sul',
      status: 'rejected',
      verificationStatus: 'rejected',
      website: '',
      instagram: '@coletivoacuenda',
      description: 'Trabalhos de cena e experimentação coletiva.',
      notes: 'Registro rejeitado por dados incompletos; pode voltar a ser revisado.',
      isHistorical: true
    }
  ],
  companyMembers: [
    { id: 'cm-1', name: 'Ana Costa', companyName: 'Coletivo Acuenda', role: 'Diretora e atriz', status: 'pending', profileType: 'theater_company' },
    { id: 'cm-2', name: 'Ricardo Nunes', companyName: 'Cia. Mungunzá de Teatro', role: 'Diretor e dramaturgo', status: 'pending', profileType: 'theater_company' },
    { id: 'cm-3', name: 'Lia Martins', companyName: 'Antropofágica', role: 'Atriz e produtora', status: 'active', profileType: 'theater_company' },
    { id: 'cm-4', name: 'Thiago Ferreira', companyName: 'Coletivo Acuenda', role: 'Técnico de iluminação', status: 'pending', profileType: 'theater_company' },
    { id: 'cm-5', name: 'Marina Prado', companyName: 'Cia. Mungunzá de Teatro', role: 'Colaboradora histórica', status: 'inactive', profileType: 'theater_company' },
    { id: 'cm-6', name: 'Bruno Leite', companyName: 'Antropofágica', role: 'Estudante de Artes Cênicas', status: 'active', profileType: 'student', institution: 'Escola de Artes da USP' },
    { id: 'cm-7', name: 'Julia Amaral', companyName: 'Antropofágica', role: 'Estudante de dramaturgia', status: 'pending', profileType: 'student', institution: 'Escola de Artes da USP' }
  ],
  events: [
    {
      id: 'evt-1',
      title: 'A Última Noite do Verão',
      companyName: 'Antropofágica',
      venue: 'Espaço Detalhe',
      location: 'Rua da Consolação, 325 - São Paulo/SP',
      date: '2026-09-18',
      status: 'active',
      cast: 'Lia Martins, Rafael Costa, Marina Prado',
      photos: ['Foto 01', 'Foto 02', 'Foto 03'],
      description: 'Peça de repertório em temporada recente com foco em memória, ritual e cidade.',
      historical: 'A montagem voltará em repertório após uma temporada anterior em 2024, com ajustes na encenação e novas imagens.',
      returningSeason: true
    },
    {
      id: 'evt-2',
      title: 'Circuito de Teatro de Rua',
      companyName: 'Cia. Mungunzá de Teatro',
      venue: 'Praça do Sol',
      location: 'Avenida do Estado, 58 - São Paulo/SP',
      date: '2026-10-02',
      status: 'pending',
      cast: 'Ricardo Nunes, Sofia Brum, Alan Reis',
      photos: ['Foto 01'],
      description: 'Espetáculo de rua com foco em memória popular e linguagem corporal.',
      historical: 'Produção em desenvolvimento com reaproveitamento de material de temporadas antigas e novos textos.',
      returningSeason: false
    },
    {
      id: 'evt-3',
      title: 'Noite de Performance Coletiva',
      companyName: 'Coletivo Acuenda',
      venue: 'Sarau do Bairro',
      location: 'Rua José Bonifácio, 112 - São Paulo/SP',
      date: '2026-11-07',
      status: 'rejected',
      cast: 'Ana Costa, Thiago Ferreira, Carla Mota',
      photos: [],
      description: 'Evento de performance e interação com público em espaço comunitário.',
      historical: 'A atividade foi reavaliada e está em revisão por falta de informações fundamentais de logística.',
      returningSeason: false
    }
  ],
  currentProfile: {
    profileType: 'student',
    name: 'Ana Costa',
    ageRange: '25_34',
    gender: 'woman',
    region: 'Centro',
    profession: 'Atriz',
    secondaryProfession: 'Farmacêutica',
    bio: 'Atuo em teatro contemporâneo e também trabalho com formação e produção cultural.',
    institution: 'Escola de Artes da USP',
    course: 'Artes Cênicas',
    semester: '7º semestre',
    interests: 'Teatro contemporâneo, performance, dramaturgia, trabalho coletivo',
    companyName: 'Coletivo Acuenda',
    companyRole: 'Diretora e atriz',
    companyAffiliationLevel: 'diretora',
    verificationStatus: 'verified',
    visibility: 'public'
  }
};
