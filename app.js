import { state } from './state.js';
import {
  formatStatus as formatStatusLabel,
  formatRole as formatRoleLabel,
  formatVerification as formatVerificationLabel,
  getCompanyMembers as findCompanyMembers
} from './utils.js';

const app = document.getElementById('app');

// render(): ponto de entrada global da UI do admin.
// Sempre que o estado muda, reconstruímos a interface para manter a lógica visual
// em sincronismo com a navegação e os formulários.
function isManagementRole(role) {
  return ['platform_admin', 'company_admin', 'institution_rep'].includes(role);
}

function canAccessCsv(role) {
  return isManagementRole(role);
}

function canDeleteProfile(role) {
  return role !== 'platform_admin';
}

function isConsumerDashboardRole(role) {
  return ['general_public', 'student', 'company_member', 'theater_company'].includes(role);
}

function isCompanyManagerRole(role) {
  return ['platform_admin', 'company_admin'].includes(role);
}

function canManageCompany(companyName) {
  const currentUser = state.currentUser;
  if (!currentUser || !companyName) return false;

  if (currentUser.role === 'platform_admin') return true;
  if (currentUser.role === 'company_admin') {
    return currentUser.companyName && currentUser.companyName.toLowerCase() === companyName.toLowerCase();
  }

  return false;
}

function getCompanyAccessText(companyName) {
  if (canManageCompany(companyName)) {
    return 'Você tem acesso gerencial para editar os dados públicos, a verificação e o status da companhia vinculada.';
  }

  return 'Você está visualizando a versão pública da companhia. Apenas cargos gerenciais com vínculo verificado podem editar o registro.';
}

function getUserRoleDisplay(role) {
  const labels = {
    platform_admin: 'Administrador',
    company_admin: 'Admin de companhia',
    institution_rep: 'Representante de instituição',
    student: 'Estudante',
    teacher: 'Professor',
    company_member: 'Membro da companhia',
    theater_company: 'Companhia de teatro',
    general_public: ''
  };

  return labels[role] || formatRoleLabel(role);
}

function getUserPillLabel(user) {
  if (!user) return 'Administrador';
  const roleLabel = getUserRoleDisplay(user.role);
  return roleLabel ? `${user.name} • ${roleLabel}` : user.name;
}

function render() {
  if (!state.isLoggedIn) {
    app.innerHTML = renderAuth();
    bindAuthHandlers();
    return;
  }

  const current = state.currentView;
  const currentRole = state.currentUser?.role || 'platform_admin';

  if (current === 'members' && !isManagementRole(currentRole)) {
    state.currentView = 'dashboard';
  }

  const nextView = state.currentView;
  const canShowCsvItem = canAccessCsv(currentRole);

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
          <div class="brand ${state.sidebarCollapsed ? 'hidden' : ''}">Galharufa</div>
          <button class="collapse-btn" data-action="toggle-sidebar" aria-label="Recolher menu">
            ${state.sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        <nav class="nav-list">
          <button class="nav-link ${nextView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
            <span class="nav-icon">▣</span>
            <span class="nav-label">Painel</span>
          </button>
          <button class="nav-link ${nextView === 'companies' ? 'active' : ''}" data-view="companies">
            <span class="nav-icon">▤</span>
            <span class="nav-label">Companhias</span>
          </button>
          <button class="nav-link ${nextView === 'events' ? 'active' : ''}" data-view="events">
            <span class="nav-icon">◫</span>
            <span class="nav-label">Eventos</span>
          </button>
          ${isManagementRole(currentRole) ? `
            <button class="nav-link ${nextView === 'members' ? 'active' : ''}" data-view="members">
              <span class="nav-icon">◍</span>
              <span class="nav-label">Membros</span>
            </button>
          ` : ''}
          <button class="nav-link ${nextView === 'profiles' ? 'active' : ''}" data-view="profiles">
            <span class="nav-icon">◌</span>
            <span class="nav-label">Perfis</span>
          </button>
          ${canShowCsvItem ? `
            <button class="nav-link ${nextView === 'import' ? 'active' : ''}" data-view="import">
              <span class="nav-icon">⇩</span>
              <span class="nav-label">CSV</span>
            </button>
          ` : ''}
          <button class="nav-link logout-btn" data-action="logout">
            <span class="nav-icon">⎋</span>
            <span class="nav-label">Sair</span>
          </button>
        </nav>
      </aside>

      <main class="main">
        <div class="topbar">
          <h1 class="page-title">${pageTitle(nextView)}</h1>
          <div class="user-pill">${getUserPillLabel(state.currentUser)}</div>
        </div>

        ${renderView(nextView)}
      </main>
    </div>
  `;

  bindNavHandlers();
  bindImportHandler();
  bindAddCompanyHandler();
  bindCompanyHandlers();
  bindEventHandlers();
  bindProfileHandlers();
  bindDashboardQuickActions();
}

// renderAuth(): monta a tela de autenticação e cadastro.
// A estrutura do formulário separa fluxo de login e fluxo de registro para manter
// a validação de perfil e companhia em um único lugar.
function renderAuth() {
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand small">Galharufa</div>
          <h2>Admin / Cadastro</h2>
        </div>

        <div class="auth-tabs">
          <button class="tab-btn active" data-mode="login">Entrar</button>
          <button class="tab-btn" data-mode="register">Cadastrar</button>
        </div>

        <form id="authForm">
          <div class="field hidden" id="nameField">
            <label>Nome completo</label>
            <input id="nameInput" type="text" placeholder="Seu nome" />
          </div>

          <div class="field">
            <label>Email</label>
            <input id="emailInput" type="email" placeholder="admin@galharufa.com" />
          </div>

          <div class="field">
            <label>Senha</label>
            <input id="passwordInput" type="password" placeholder="********" />
          </div>

          <div class="field hidden" id="roleField">
            <label>Tipo de perfil</label>
            <select id="roleSelect">
              <option value="">Selecione um tipo de perfil</option>
              <option value="theater_company">Companhia de teatro</option>
              <option value="student">Estudante</option>
              <option value="general_public">Público geral</option>
            </select>
          </div>

          <div class="field hidden" id="companyDetails">
            <div class="field-note">
              Para confirmar a ligação com a companhia, informe o contato oficial da organização. A validação pode ser feita por site, e-mail ou Instagram.
            </div>
            <div class="field">
              <label>Nome da companhia</label>
              <input id="companyNameInput" type="text" placeholder="Nome da companhia" />
            </div>
            <div class="field">
              <label>Função na companhia</label>
              <input id="companyRoleInput" type="text" placeholder="Diretor(a), ator(a), produtor(a)..." />
            </div>
            <div class="field">
              <label>Contato oficial</label>
              <input id="companyContactInput" type="text" placeholder="Site, e-mail ou Instagram" />
            </div>
          </div>

          <button class="primary-btn auth-submit" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  `;
}

function bindAuthHandlers() {
  const authForm = document.getElementById('authForm');
  const roleField = document.getElementById('roleField');
  const nameField = document.getElementById('nameField');
  const companyDetails = document.getElementById('companyDetails');
  const roleSelect = document.getElementById('roleSelect');
  const authSubmitButton = document.querySelector('.auth-submit');
  const authModeButtons = document.querySelectorAll('.tab-btn');
  let currentAuthMode = 'login';

  const validateAuthButton = () => {
    const isRegister = currentAuthMode === 'register';
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!authSubmitButton) return;

    if (!isRegister) {
      authSubmitButton.disabled = !(email && password);
      return;
    }

    const name = document.getElementById('nameInput').value.trim();
    const role = roleSelect?.value || '';
    const companyName = document.getElementById('companyNameInput')?.value.trim() || '';
    const companyRole = document.getElementById('companyRoleInput')?.value.trim() || '';
    const companyContact = document.getElementById('companyContactInput')?.value.trim() || '';

    const hasCompanyFields = !role || role !== 'theater_company' || (companyName && companyRole && companyContact);
    authSubmitButton.disabled = !(name && email && password && role && hasCompanyFields);
  };

  const syncAuthMode = (mode) => {
    currentAuthMode = mode;
    const isRegister = mode === 'register';
    roleField.classList.toggle('hidden', !isRegister);
    nameField.classList.toggle('hidden', !isRegister);
    authSubmitButton.textContent = isRegister ? 'Cadastrar' : 'Entrar';
    authModeButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
    if (!isRegister) {
      companyDetails.classList.add('hidden');
    } else {
      const shouldShowCompanyDetails = roleSelect.value === 'theater_company';
      companyDetails.classList.toggle('hidden', !shouldShowCompanyDetails);
    }
    validateAuthButton();
  };

  roleSelect?.addEventListener('change', () => {
    if (currentAuthMode === 'register') {
      const shouldShowCompanyDetails = roleSelect.value === 'theater_company';
      companyDetails.classList.toggle('hidden', !shouldShowCompanyDetails);
    }
    validateAuthButton();
  });

  ['input', 'change'].forEach(eventName => {
    authForm.querySelectorAll('input, select').forEach(field => {
      field.addEventListener(eventName, validateAuthButton);
    });
  });

  authModeButtons.forEach(button => {
    button.addEventListener('click', () => syncAuthMode(button.dataset.mode));
  });

  authForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!email || !password) {
      alert('Preencha email e senha.');
      return;
    }

    if (currentAuthMode === 'register') {
      const name = document.getElementById('nameInput').value.trim();
      const role = document.getElementById('roleSelect').value;
      if (!name) {
        alert('Informe seu nome para continuar.');
        return;
      }
      if (!role) {
        alert('Selecione um tipo de perfil.');
        return;
      }

      const existing = state.users.find(user => user.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        alert('Este e-mail já está cadastrado.');
        return;
      }

      if (role === 'theater_company') {
        const companyName = document.getElementById('companyNameInput').value.trim();
        const companyRole = document.getElementById('companyRoleInput').value.trim();
        const companyContact = document.getElementById('companyContactInput').value.trim();

        if (!companyName || !companyRole || !companyContact) {
          alert('Para companhia de teatro, informe o nome da companhia, sua função e um contato oficial para validação.');
          return;
        }
      }

      const newUser = {
        id: `user-${Date.now()}`,
        name,
        email,
        password,
        role,
        companyProfile: role === 'theater_company' ? {
          name: document.getElementById('companyNameInput').value.trim(),
          roleTitle: document.getElementById('companyRoleInput').value.trim(),
          contact: document.getElementById('companyContactInput').value.trim()
        } : null
      };

      state.users.push(newUser);
      state.currentUser = newUser;
      state.isLoggedIn = true;
      state.currentView = 'dashboard';
      render();
      return;
    }

    const user = state.users.find(item => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!user) {
      alert('Credenciais incorretas.');
      return;
    }

    state.currentUser = user;
    state.isLoggedIn = true;
    state.currentView = 'dashboard';
    render();
  });

  syncAuthMode(currentAuthMode);
}

function pageTitle(view) {
  const titles = {
    dashboard: 'Painel',
    companies: 'Companhias',
    events: 'Eventos',
    members: 'Membros',
    profiles: 'Estrutura de perfis',
    import: 'Importar CSV'
  };
  return titles[view] || 'Painel';
}

// renderView(): centraliza a seleção de qual painel será exibido.
// Isso facilita a leitura da navegação e evita repetição de ifs espalhados na UI.
function renderView(view) {
  if (view === 'dashboard') return renderDashboard();
  if (view === 'companies') return renderCompanies();
  if (view === 'events') return renderEvents();
  if (view === 'members') {
    if (!isManagementRole(state.currentUser?.role)) return renderDashboard();
    return renderMembers();
  }
  if (view === 'profiles') return renderProfiles();
  if (view === 'import') return renderImport();
  return renderDashboard();
}

function renderRoleDashboard(role) {
  const cards = role === 'general_public'
    ? [
        { title: 'Meu perfil', description: 'Dados cadastrais, visibilidade e links de contato.', view: 'profiles' },
        { title: 'Companhias seguidas', description: 'Lista das companhias que você acompanha e acompanha no app.', view: 'companies' },
        { title: 'Eventos salvos', description: 'Peças e temporadas que você salvou para acompanhar.', view: 'events' },
        { title: 'Perfil do usuário', description: 'Acesso apenas ao seu cadastro, sem visualização de outros perfis.', view: 'profiles' }
      ]
    : role === 'student'
      ? [
          { title: 'Meu perfil acadêmico', description: 'Curso, semestre, instituição e área de interesse.', view: 'profiles' },
          { title: 'Peças assistidas', description: 'Histórico de espetáculos, gêneros e temporadas relevantes.', view: 'events' },
          { title: 'Companhias de interesse', description: 'Coletivos e grupos que aparecem nas suas buscas e interações.', view: 'companies' },
          { title: 'Interesses culturais', description: 'Gêneros, regiões e temas que mais aparecem para você.', view: 'profiles' }
        ]
      : [
          { title: 'Meu perfil da companhia', description: 'Dados públicos, histórico e vínculo com a organização.', view: 'profiles' },
          { title: 'Eventos ativos', description: 'Peças, temporadas e registros em andamento.', view: 'events' },
          { title: 'Interações', description: 'Comentários, acessos, seguidores e engajamento do coletivo.', view: 'profiles' },
          { title: 'Perfis vinculados', description: 'Membros, gestão, administração e público relacionado ao grupo.', view: 'members' }
        ];

  return `
    <div class="section-card">
      <h3>Meu painel</h3>
      <div class="role-access-grid">
        ${cards.map(card => `
          <button type="button" class="role-access-card" data-view="${card.view}">
            <strong>${card.title}</strong>
            <p>${card.description}</p>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDashboard() {
  const currentRole = state.currentUser?.role || 'platform_admin';

  if (isConsumerDashboardRole(currentRole)) {
    return renderRoleDashboard(currentRole);
  }

  const total = state.companies.length;
  const active = state.companies.filter(c => c.status === 'active').length;
  const pending = state.companies.filter(c => c.status === 'pending').length;
  const rejected = state.companies.filter(c => c.status === 'rejected').length;
  const events = 12;
  const members = 18;
  const accesses = 1842;

  const canSeeMembersReview = isManagementRole(state.currentUser?.role);

  const pendingReview = [
    { label: 'Companhias aguardando aprovação', value: `${pending}`, view: 'companies' },
    { label: 'Eventos em revisão', value: '3', view: 'events' },
    ...(canSeeMembersReview ? [{ label: 'Perfis de membros pendentes', value: '5', view: 'members' }] : []),
    { label: 'Contatos para validação', value: '7', view: 'profiles' }
  ];

  const regionSummary = [
    { label: 'Centro', value: 5 },
    { label: 'Leste', value: 3 },
    { label: 'Sul', value: 2 },
    { label: 'Norte', value: 1 },
    { label: 'Oeste', value: 1 }
  ];

  const recentActivity = [
    'Nova companhia cadastrada: Coletivo Acuenda',
    'Evento em análise: Circuito de Teatro de Rua',
    'Membro validado: Tiago Neves',
    'Importação CSV concluída com 12 registros',
    'Companhia rejeitada por dados incompletos'
  ];

  const reviewList = state.companies.filter(company => company.status === 'pending' || company.status === 'rejected').slice(0, 5);
  const roleAccessMatrix = [
    {
      title: 'Membros da companhia',
      access: 'Podem ver o perfil da companhia, peças, comentários, seguidores, métricas de engajamento e interações.',
      scope: 'Foco em gestão interna e compartilhamento de conteúdo.'
    },
    {
      title: 'Gestores da companhia',
      access: 'Podem editar dados da companhia, adicionar/remover membros, revisar interações e acompanhar visitas e acessos.',
      scope: 'Controle administrativo do coletivo.'
    },
    {
      title: 'Estudantes',
      access: 'Veem histórico de peças assistidas, gêneros preferidos, regiões, e podem entrar em contato para materiais de aula.',
      scope: 'Perfil de formação e interesse cultural.'
    },
    {
      title: 'Público geral',
      access: 'Veem perfis, companhias, eventos e filtros por região, gênero e interesses, com foco em descoberta.',
      scope: 'Acesso principal para descoberta e navegação.'
    }
  ];

  return `
    <div class="stats-grid dashboard-grid">
      <button type="button" class="stat-box" data-view="companies">
        <div class="stat-label">Companhias</div>
        <div class="stat-value">${total}</div>
        <div class="stat-foot">Total cadastrado</div>
      </button>
      <button type="button" class="stat-box" data-view="companies">
        <div class="stat-label">Ativas</div>
        <div class="stat-value">${active}</div>
        <div class="stat-foot">Publicadas no app</div>
      </button>
      <button type="button" class="stat-box" data-view="companies">
        <div class="stat-label">Pendentes</div>
        <div class="stat-value">${pending}</div>
        <div class="stat-foot">Aguardando revisão</div>
      </button>
      <button type="button" class="stat-box" data-view="events">
        <div class="stat-label">Eventos</div>
        <div class="stat-value">${events}</div>
        <div class="stat-foot">Cadastrados no sistema</div>
      </button>
      <button type="button" class="stat-box" data-view="members">
        <div class="stat-label">Membros</div>
        <div class="stat-value">${members}</div>
        <div class="stat-foot">Perfis registrados</div>
      </button>
      <button type="button" class="stat-box" data-view="profiles">
        <div class="stat-label">Acessos</div>
        <div class="stat-value">${accesses}</div>
        <div class="stat-foot">Últimos 7 dias</div>
      </button>
    </div>

    <div class="grid-three">
      <section class="section-card">
        <h3>Pendências de revisão</h3>
        <ul class="pending-list">
          ${pendingReview.map(item => `
            <li data-view="${item.view}">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
            </li>
          `).join('')}
        </ul>
      </section>

      <section class="section-card">
        <h3>Ações rápidas</h3>
        <div class="quick-action-list">
          <button class="secondary-btn" data-view="companies">Aprovar companhia</button>
          <button class="secondary-btn" data-view="events">Revisar evento</button>
          ${isManagementRole(state.currentUser?.role) ? '<button class="secondary-btn" data-view="members">Validar membro</button>' : ''}
        </div>
      </section>

      <section class="section-card">
        <h3>Atividade recente</h3>
        <ul class="activity-list">
          ${recentActivity.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </section>
    </div>

    <div class="grid-two">
      <section class="section-card">
        <h3>Distribuição por região</h3>
        <div class="region-list">
          ${regionSummary.map(item => `
            <div class="region-item">
              <div class="region-meta">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
              </div>
              <div class="mini-bar">
                <span style="width: ${(item.value / 5) * 100}%"></span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="section-card">
        <h3>Companhias em revisão</h3>
        <div class="table-wrap">
          <table class="company-table compact-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Região</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reviewList.length ? reviewList.map(company => `
                <tr>
                  <td>${company.name}</td>
                  <td>${company.region}</td>
                  <td><span class="badge ${company.status}">${formatStatusLabel(company.status)}</span></td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="3">Nenhuma companhia em revisão no momento.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div class="section-card" style="margin-top: 20px;">
      <div class="panel-header">
        <h3 style="margin: 0;">Visão geral por perfil</h3>
      </div>
      <div class="role-access-grid">
        ${roleAccessMatrix.map(role => `
          <div class="role-access-card">
            <strong>${role.title}</strong>
            <p>${role.access}</p>
            <small>${role.scope}</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// getCompanyMembers(): busca membros por nome da companhia.
// Mantém a lógica de relacionamento entre companhia e pessoas em um único helper.
function getCompanyMembers(companyName) {
  return findCompanyMembers(companyName, state.companyMembers);
}

function renderCompanies() {
  const activeCompany = state.activeCompanyId
    ? state.companies.find(company => company.id === state.activeCompanyId) || null
    : state.currentUser?.companyName
      ? state.companies.find(company => company.name === state.currentUser.companyName) || null
      : null;
  const members = activeCompany ? getCompanyMembers(activeCompany.name) : [];
  const canEditCompany = activeCompany ? canManageCompany(activeCompany.name) : false;

  return `
    <section class="section-card">
      <div class="toolbar">
        <h3 style="margin:0;">Companhias e validações</h3>
        <button class="primary-btn" id="newCompanyBtn">+ Nova companhia</button>
      </div>

      <div class="company-review-layout">
        ${activeCompany ? `
          <div class="company-editor">
            <form id="companyForm">
              <div class="permission-box" style="margin-bottom: 16px;">
                <strong>${canEditCompany ? 'Acesso gerencial ativo' : 'Acesso público da companhia'}</strong>
                <p>${getCompanyAccessText(activeCompany.name)}</p>
              </div>

              <div class="field">
                <label>Nome da companhia</label>
                <input name="companyName" value="${activeCompany.name}" required ${canEditCompany ? '' : 'disabled'} />
              </div>

              <div class="form-row">
                <div class="field">
                  <label>Categoria</label>
                  <input name="companyCategory" value="${activeCompany.category || 'Teatro de grupo'}" ${canEditCompany ? '' : 'disabled'} />
                </div>
                <div class="field">
                  <label>Status</label>
                  <select name="companyStatus" ${canEditCompany ? '' : 'disabled'}>
                    <option value="pending" ${activeCompany.status === 'pending' ? 'selected' : ''}>Pendente</option>
                    <option value="active" ${activeCompany.status === 'active' ? 'selected' : ''}>Ativa</option>
                    <option value="inactive" ${activeCompany.status === 'inactive' ? 'selected' : ''}>Inativa</option>
                    <option value="rejected" ${activeCompany.status === 'rejected' ? 'selected' : ''}>Rejeitada</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="field">
                  <label>Verificação</label>
                  <select name="companyVerificationStatus" ${canEditCompany ? '' : 'disabled'}>
                    <option value="verified" ${activeCompany.verificationStatus === 'verified' ? 'selected' : ''}>Verificada</option>
                    <option value="pending" ${activeCompany.verificationStatus === 'pending' ? 'selected' : ''}>Pendente</option>
                    <option value="rejected" ${activeCompany.verificationStatus === 'rejected' ? 'selected' : ''}>Rejeitada</option>
                  </select>
                </div>
                <div class="field">
                  <label>Região</label>
                  <input name="companyRegion" value="${activeCompany.region || 'Centro'}" ${canEditCompany ? '' : 'disabled'} />
                </div>
              </div>

              <div class="form-row">
                <div class="field">
                  <label>Cidade</label>
                  <input name="companyCity" value="${activeCompany.city || 'São Paulo'}" ${canEditCompany ? '' : 'disabled'} />
                </div>
                <div class="field">
                  <label>Site / perfil oficial</label>
                  <input name="companyWebsite" value="${activeCompany.website || ''}" placeholder="https://" ${canEditCompany ? '' : 'disabled'} />
                </div>
              </div>

              <div class="field">
                <label>Instagram</label>
                <input name="companyInstagram" value="${activeCompany.instagram || ''}" placeholder="@nome" ${canEditCompany ? '' : 'disabled'} />
              </div>

              <div class="field">
                <label>Descrição / histórico</label>
                <textarea name="companyDescription" ${canEditCompany ? '' : 'disabled'}>${activeCompany.description || ''}</textarea>
              </div>

              <div class="field">
                <label>Observações da revisão</label>
                <textarea name="companyNotes" ${canEditCompany ? '' : 'disabled'}>${activeCompany.notes || ''}</textarea>
              </div>

              <div class="field-note">
                A lógica de cadastro é: ao ser registrada por nome em perfil, a companhia entra em status pendente; somente após confirmação da gestão da companhia ou da plataforma ela pode virar ativa ou histórica.
              </div>

              <button class="primary-btn" type="submit" ${canEditCompany ? '' : 'disabled'}>Salvar revisão</button>
            </form>
          </div>

          <div class="company-members">
            <h4>Pessoas vinculadas a esta companhia</h4>
            ${members.length ? `
              <ul class="member-list">
                ${members.map(member => `
                  <li>
                    <div>
                      <strong>${member.name}</strong>
                      <span>${member.role}</span>
                    </div>
                    <span class="badge ${member.status || 'pending'}">${formatStatusLabel(member.status || 'pending')}</span>
                  </li>
                `).join('')}
              </ul>
            ` : `
              <div class="empty-state">Nenhuma pessoa vinculada a esta companhia foi encontrada ainda.</div>
            `}

            <div class="metric-panel" style="margin-top: 18px;">
              <div class="metric-title">Visibilidade da companhia</div>
              <div class="metric-grid">
                <div class="metric-box"><span>Seguidores</span><strong>184</strong></div>
                <div class="metric-box"><span>Peças</span><strong>12</strong></div>
                <div class="metric-box"><span>Comentários</span><strong>29</strong></div>
                <div class="metric-box"><span>Visitas</span><strong>1438</strong></div>
              </div>
            </div>
          </div>
        ` : `
          <div class="company-editor empty-company-state">
            <h4>Selecione uma companhia</h4>
            <p>Ao escolher uma companhia na tabela abaixo, a ficha completa aparece aqui com dados, histórico, público e validação.</p>
            <p>Ao clicar em <strong>+ Nova companhia</strong>, você inicia um cadastro em branco, que fica pendente até revisão administrativa.</p>
          </div>
          <div class="company-members">
            <h4>Resumo</h4>
            <div class="empty-state">Acompanhe aqui pessoas vinculadas, públicos, comentários e métricas após selecionar uma companhia.</div>
          </div>
        `}
      </div>

      <div class="table-wrap" style="margin-top: 20px;">
        <table class="company-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Cidade</th>
              <th>Região</th>
              <th>Status</th>
              <th>Vínculo</th>
              <th>Site</th>
            </tr>
          </thead>
          <tbody>
            ${state.companies.map(company => {
              const isSelected = company.id === (activeCompany ? activeCompany.id : '');
              const memberCount = getCompanyMembers(company.name).length;
              return `
                <tr class="company-row ${isSelected ? 'selected' : ''}">
                  <td>${company.name}</td>
                  <td>${company.category}</td>
                  <td>${company.city}</td>
                  <td>${company.region}</td>
                  <td><span class="badge ${company.status}">${formatStatusLabel(company.status)}</span></td>
                  <td>${memberCount} perfil${memberCount !== 1 ? 's' : ''}</td>
                  <td>
                    <button class="secondary-btn small-btn" data-company-select="${company.id}">${isSelected ? 'Selecionada' : 'Selecionar'}</button>
                    ${isSelected && company.website ? `<a href="${company.website}" target="_blank" rel="noopener noreferrer">Abrir</a>` : '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getVisibleEventsForCurrentUser() {
  const role = state.currentUser?.role || 'platform_admin';

  if (role === 'platform_admin') {
    return state.events;
  }

  if (role === 'company_admin') {
    const companyName = state.currentUser?.companyName || '';
    return state.events.filter(event => event.companyName && event.companyName.toLowerCase() === companyName.toLowerCase());
  }

  return [];
}

function getVisibleMembersForCurrentUser() {
  const role = state.currentUser?.role || 'platform_admin';

  if (role === 'platform_admin') {
    return state.companyMembers;
  }

  if (role === 'company_admin') {
    const companyName = state.currentUser?.companyName || '';
    return state.companyMembers.filter(member => member.companyName && member.companyName.toLowerCase() === companyName.toLowerCase());
  }

  if (role === 'institution_rep') {
    return state.companyMembers.filter(member => member.profileType === 'student' || member.institution);
  }

  return [];
}

function renderEvents() {
  const visibleEvents = getVisibleEventsForCurrentUser();
  const selectedEvent = state.activeEventId
    ? visibleEvents.find(event => event.id === state.activeEventId) || visibleEvents[0] || null
    : visibleEvents[0] || null;
  const isPlatformOrCompanyAdmin = ['platform_admin', 'company_admin'].includes(state.currentUser?.role || 'platform_admin');

  return `
    <section class="section-card">
      <div class="toolbar">
        <h3 style="margin:0;">Eventos</h3>
        ${isPlatformOrCompanyAdmin ? '<button class="primary-btn" id="newEventBtn">+ Novo evento</button>' : ''}
      </div>

      <div class="event-layout">
        ${selectedEvent ? `
          <div class="event-editor">
            <form id="eventForm">
              <div class="form-row">
                <div class="field">
                  <label>Nome do evento</label>
                  <input name="eventTitle" value="${selectedEvent.title}" required />
                </div>
                <div class="field">
                  <label>Status</label>
                  <select name="eventStatus">
                    <option value="active" ${selectedEvent.status === 'active' ? 'selected' : ''}>Ativo</option>
                    <option value="pending" ${selectedEvent.status === 'pending' ? 'selected' : ''}>Pendente</option>
                    <option value="rejected" ${selectedEvent.status === 'rejected' ? 'selected' : ''}>Rejeitado</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="field">
                  <label>Companhia</label>
                  <input name="eventCompany" value="${selectedEvent.companyName}" required />
                </div>
                <div class="field">
                  <label>Teatro / espaço</label>
                  <input name="eventVenue" value="${selectedEvent.venue || ''}" />
                </div>
              </div>

              <div class="field">
                <label>Localização</label>
                <input name="eventLocation" value="${selectedEvent.location || ''}" />
              </div>

              <div class="form-row">
                <div class="field">
                  <label>Data</label>
                  <input name="eventDate" type="date" value="${selectedEvent.date || ''}" />
                </div>
                <div class="field">
                  <label>Retorno de temporada</label>
                  <select name="eventReturningSeason">
                    <option value="true" ${selectedEvent.returningSeason ? 'selected' : ''}>Sim</option>
                    <option value="false" ${!selectedEvent.returningSeason ? 'selected' : ''}>Não</option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label>Elenco / casting</label>
                <input name="eventCast" value="${selectedEvent.cast || ''}" />
              </div>

              <div class="field">
                <label>Fotos</label>
                <input name="eventPhotos" value="${(selectedEvent.photos || []).join(', ')}" placeholder="Separadas por vírgula" />
              </div>

              <div class="field">
                <label>Descrição</label>
                <textarea name="eventDescription">${selectedEvent.description || ''}</textarea>
              </div>

              <div class="field">
                <label>Histórico da peça / temporada</label>
                <textarea name="eventHistorical">${selectedEvent.historical || ''}</textarea>
              </div>

              <button class="primary-btn" type="submit">Salvar evento</button>
            </form>
          </div>
        ` : `
          <div class="company-editor empty-company-state">
            <h4>Nenhum evento disponível</h4>
            <p>Este perfil não tem acesso a eventos cadastrados neste momento.</p>
          </div>
        `}

        <div class="company-members">
          <h4>Permissões e visibilidade</h4>
          <div class="permission-box">
            <strong>${formatRoleLabel(state.currentUser?.role || 'platform_admin')}</strong>
            <p>${state.currentUser?.role === 'company_admin'
              ? 'Pode visualizar e editar eventos da própria companhia, incluindo casting, local e informações de temporada.'
              : state.currentUser?.role === 'platform_admin'
                ? 'Pode gerenciar todos os eventos, histórico, espaço, temporada e análise da plataforma.'
                : 'Acesso restrito: apenas administradores da plataforma e da companhia podem manipular eventos.'}</p>
          </div>
        </div>
      </div>

      <div class="table-wrap" style="margin-top: 20px;">
        <table class="company-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Companhia</th>
              <th>Teatro / espaço</th>
              <th>Data</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${visibleEvents.length ? visibleEvents.map(event => `
              <tr class="company-row ${selectedEvent && selectedEvent.id === event.id ? 'selected' : ''}">
                <td>${event.title}</td>
                <td>${event.companyName}</td>
                <td>${event.venue || '—'}</td>
                <td>${event.date || '—'}</td>
                <td>
                  <div class="status-stack">
                    <span class="badge ${event.status}">${formatStatusLabel(event.status)}</span>
                    <button class="secondary-btn small-btn" data-event-select="${event.id}">${selectedEvent && selectedEvent.id === event.id ? 'Selecionado' : 'Selecionar'}</button>
                  </div>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5">Nenhum evento disponível para este perfil.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMembers() {
  const visibleMembers = getVisibleMembersForCurrentUser();
  const currentRole = state.currentUser?.role || 'platform_admin';
  const canManageMembers = ['platform_admin', 'company_admin', 'institution_rep'].includes(currentRole);

  return `
    <section class="section-card">
      <div class="toolbar">
        <h3 style="margin:0;">Membros</h3>
        ${canManageMembers && currentRole !== 'general_public' ? '<button class="primary-btn">+ Novo membro</button>' : ''}
      </div>

      ${currentRole === 'general_public' ? `
        <div class="permission-box">
          <strong>Acesso restrito</strong>
          <p>O público geral não possui gestão de membros. Apenas o administrador da plataforma pode visualizar e moderar este registro.</p>
        </div>
      ` : ''}

      <div class="table-wrap">
        <table class="company-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cargo</th>
              <th>Companhia</th>
              <th>Tipo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${visibleMembers.length ? visibleMembers.map(member => `
              <tr>
                <td>${member.name}</td>
                <td>${member.role}</td>
                <td>${member.companyName || '—'}</td>
                <td>${member.profileType === 'student' ? 'Estudante' : member.profileType === 'theater_company' ? 'Companhia' : 'Perfil'}</td>
                <td><span class="badge ${member.status || 'pending'}">${formatStatusLabel(member.status || 'pending')}</span></td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5">Nenhum membro disponível para visualização neste perfil.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getRequiredProfileFields(profileType) {
  if (profileType === 'student') {
    return ['name', 'ageRange', 'gender', 'region', 'profession', 'institution', 'course', 'semester'];
  }

  if (profileType === 'theater_company') {
    return ['name', 'ageRange', 'gender', 'region', 'profession', 'companyName', 'companyRole', 'companyAffiliationLevel'];
  }

  if (profileType === 'platform_admin') {
    return ['name', 'ageRange', 'gender', 'region', 'profession'];
  }

  return ['name', 'ageRange', 'gender', 'region', 'profession'];
}

function renderProfiles() {
  const profile = state.currentProfile;
  const isStudent = profile.profileType === 'student';
  const isGeneralPublic = profile.profileType === 'general_public';
  const isTheaterCompany = profile.profileType === 'theater_company';
  const isPlatformAdmin = profile.profileType === 'platform_admin';
  const requiredFields = getRequiredProfileFields(profile.profileType);
  const requiredDescription = requiredFields.map(field => {
    if (field === 'name') return 'nome';
    if (field === 'ageRange') return 'faixa etária';
    if (field === 'gender') return 'gênero';
    if (field === 'region') return 'região';
    if (field === 'profession') return 'profissão';
    if (field === 'institution') return 'instituição';
    if (field === 'course') return 'curso';
    if (field === 'semester') return 'semestre';
    if (field === 'companyName') return 'nome da companhia';
    if (field === 'companyRole') return 'cargo/função';
    if (field === 'companyAffiliationLevel') return 'nível de filiação';
    return field;
  }).join(', ');

  return `
    <section class="section-card">
      <div class="profile-header-row">
        <h3 style="margin:0;">Perfil do usuário</h3>
        <span class="verification-badge ${profile.verificationStatus}">${formatVerificationLabel(profile.verificationStatus)}</span>
      </div>

      <form id="profileForm" class="profile-form">
        <div class="profile-grid form-grid">
          <div class="profile-card">
            <div class="profile-title">Tipo de perfil</div>
            <div class="field">
              <label>Tipo principal</label>
              <select name="profileType">
                <option value="general_public" ${profile.profileType === 'general_public' ? 'selected' : ''}>Público geral</option>
                <option value="student" ${profile.profileType === 'student' ? 'selected' : ''}>Estudante</option>
                <option value="theater_company" ${profile.profileType === 'theater_company' ? 'selected' : ''}>Companhia de teatro</option>
                <option value="platform_admin" ${profile.profileType === 'platform_admin' ? 'selected' : ''}>Administração da plataforma</option>
              </select>
            </div>
            <div class="field-note">
              Campos obrigatórios para este tipo: ${requiredDescription}.
            </div>
          </div>

          <div class="profile-card">
            <div class="profile-title">Dados pessoais e demográficos</div>
            <div class="field">
              <label>Nome</label>
              <input name="name" value="${profile.name}" ${requiredFields.includes('name') ? 'required' : ''} />
            </div>
            <div class="form-row">
              <div class="field">
                <label>Faixa etária</label>
                <select name="ageRange" ${requiredFields.includes('ageRange') ? 'required' : ''}>
                  <option value="18_24" ${profile.ageRange === '18_24' ? 'selected' : ''}>18–24</option>
                  <option value="25_34" ${profile.ageRange === '25_34' ? 'selected' : ''}>25–34</option>
                  <option value="35_44" ${profile.ageRange === '35_44' ? 'selected' : ''}>35–44</option>
                  <option value="45_54" ${profile.ageRange === '45_54' ? 'selected' : ''}>45–54</option>
                  <option value="55_plus" ${profile.ageRange === '55_plus' ? 'selected' : ''}>55+</option>
                  <option value="prefer_not_to_say" ${profile.ageRange === 'prefer_not_to_say' ? 'selected' : ''}>Prefiro não informar</option>
                </select>
              </div>
              <div class="field">
                <label>Gênero</label>
                <select name="gender" ${requiredFields.includes('gender') ? 'required' : ''}>
                  <option value="woman" ${profile.gender === 'woman' ? 'selected' : ''}>Mulher</option>
                  <option value="man" ${profile.gender === 'man' ? 'selected' : ''}>Homem</option>
                  <option value="non_binary" ${profile.gender === 'non_binary' ? 'selected' : ''}>Não binário</option>
                  <option value="prefer_not_to_say" ${profile.gender === 'prefer_not_to_say' ? 'selected' : ''}>Prefiro não informar</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Região</label>
              <input name="region" value="${profile.region}" ${requiredFields.includes('region') ? 'required' : ''} />
            </div>
            <div class="field">
              <label>Profissão principal</label>
              <input name="profession" value="${profile.profession}" ${requiredFields.includes('profession') ? 'required' : ''} />
            </div>
            <div class="field">
              <label>Profissão secundária</label>
              <input name="secondaryProfession" value="${profile.secondaryProfession}" />
            </div>
            <div class="field">
              <label>Links sociais</label>
              <input name="socialLinks" value="${profile.socialLinks || ''}" placeholder="Instagram, TikTok, LinkedIn, site pessoal" />
            </div>
          </div>

          ${isStudent ? `
            <div class="profile-card">
              <div class="profile-title">Dados acadêmicos</div>
              <div class="field">
                <label>Instituição</label>
                <input name="institution" value="${profile.institution || ''}" ${requiredFields.includes('institution') ? 'required' : ''} />
              </div>
              <div class="field">
                <label>Curso</label>
                <input name="course" value="${profile.course || ''}" ${requiredFields.includes('course') ? 'required' : ''} />
              </div>
              <div class="field">
                <label>Semestre</label>
                <input name="semester" value="${profile.semester || ''}" ${requiredFields.includes('semester') ? 'required' : ''} />
              </div>
            </div>
          ` : ''}

          ${isGeneralPublic || isTheaterCompany ? `
            <div class="profile-card">
              <div class="profile-title">Perfil público e interesses</div>
              <div class="field">
                <label>Interesses</label>
                <textarea name="interests">${profile.interests || ''}</textarea>
              </div>
              <div class="field">
                <label>Bio</label>
                <textarea name="bio">${profile.bio || ''}</textarea>
              </div>
            </div>
          ` : ''}

          ${isTheaterCompany ? `
            <div class="profile-card">
              <div class="profile-title">Vínculo com companhia</div>
              <div class="field">
                <label>Nome da companhia</label>
                <input name="companyName" value="${profile.companyName || ''}" ${requiredFields.includes('companyName') ? 'required' : ''} />
              </div>
              <div class="field">
                <label>Cargo / função</label>
                <input name="companyRole" value="${profile.companyRole || ''}" ${requiredFields.includes('companyRole') ? 'required' : ''} />
              </div>
              <div class="field">
                <label>Nível de filiação</label>
                <select name="companyAffiliationLevel" ${requiredFields.includes('companyAffiliationLevel') ? 'required' : ''}>
                  <option value="">Selecione</option>
                  <option value="membro" ${profile.companyAffiliationLevel === 'membro' ? 'selected' : ''}>Membro</option>
                  <option value="diretor" ${profile.companyAffiliationLevel === 'diretor' ? 'selected' : ''}>Diretor(a)</option>
                  <option value="ator" ${profile.companyAffiliationLevel === 'ator' ? 'selected' : ''}>Ator(a)</option>
                  <option value="tecnico" ${profile.companyAffiliationLevel === 'tecnico' ? 'selected' : ''}>Técnico(a)</option>
                  <option value="produtor" ${profile.companyAffiliationLevel === 'produtor' ? 'selected' : ''}>Produtor(a)</option>
                  <option value="administrativo" ${profile.companyAffiliationLevel === 'administrativo' ? 'selected' : ''}>Administrativo</option>
                </select>
              </div>
            </div>
          ` : ''}

          ${isPlatformAdmin ? `
            <div class="profile-card">
              <div class="profile-title">Administração da plataforma</div>
              <div class="field">
                <label>Permissões</label>
                <input name="adminPermissions" value="Aprovação de companhias, moderação de usuários, revisão de eventos" />
              </div>
              <div class="field">
                <label>Status da conta</label>
                <select name="verificationStatus">
                  <option value="verified" ${profile.verificationStatus === 'verified' ? 'selected' : ''}>Verificada</option>
                  <option value="pending" ${profile.verificationStatus === 'pending' ? 'selected' : ''}>Pendente</option>
                  <option value="rejected" ${profile.verificationStatus === 'rejected' ? 'selected' : ''}>Suspensa</option>
                </select>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="field" style="margin-top: 14px;">
          <label>Visibilidade do perfil</label>
          <select name="visibility">
            <option value="public" ${profile.visibility === 'public' ? 'selected' : ''}>Público</option>
            <option value="company" ${profile.visibility === 'company' ? 'selected' : ''}>Companhia</option>
            <option value="private" ${profile.visibility === 'private' ? 'selected' : ''}>Privado</option>
          </select>
        </div>

        <div class="field" style="margin-top: 14px;">
          <label>Status de verificação</label>
          <select name="verificationStatus">
            <option value="verified" ${profile.verificationStatus === 'verified' ? 'selected' : ''}>Verificado</option>
            <option value="pending" ${profile.verificationStatus === 'pending' ? 'selected' : ''}>Pendente</option>
            <option value="rejected" ${profile.verificationStatus === 'rejected' ? 'selected' : ''}>Rejeitado</option>
          </select>
        </div>

        <div class="profile-actions">
          <button class="primary-btn" type="submit">Salvar perfil</button>
          ${canDeleteProfile(state.currentUser?.role) ? '<button class="secondary-btn danger-btn" type="button" data-action="delete-profile">Apagar perfil</button>' : ''}
          <button class="secondary-btn" type="button" data-action="logout">Sair</button>
        </div>
      </form>
    </section>
  `;
}

function renderImport() {
  return `
    <section class="section-card">
      <h3 style="margin-top: 0;">Importar companhias a partir de CSV</h3>

      <div class="import-box">
        <input type="file" id="csvFileInput" accept=".csv,text/csv" />
        <div style="margin-top: 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <button class="primary-btn" id="importBtn">Importar</button>
          <button class="secondary-btn" id="useSampleBtn">Usar exemplo</button>
        </div>
      </div>

      <div class="field">
        <label>Pré-visualização</label>
        <ul class="preview-list" id="previewList"></ul>
      </div>
    </section>
  `;
}

function bindNavHandlers() {
  const collapseButton = document.querySelector('.collapse-btn');
  collapseButton?.addEventListener('click', () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    render();
  });

  document.querySelectorAll('.nav-link').forEach(button => {
    const action = button.dataset.action;

    if (action === 'logout') {
      button.addEventListener('click', () => {
        state.isLoggedIn = false;
        state.currentUser = null;
        state.currentView = 'login';
        render();
      });
      return;
    }

    button.addEventListener('click', () => {
      state.currentView = button.dataset.view;
      render();
    });
  });
}

function bindCompanyHandlers() {
  const form = document.getElementById('companyForm');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedCompany = state.companies.find(company => company.id === state.activeCompanyId) || state.companies[0] || null;
    if (selectedCompany && !canManageCompany(selectedCompany.name)) {
      alert('Você não tem permissão para editar esta companhia. Apenas gestores com vínculo verificado podem alterar o cadastro.');
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get('companyName') || '').trim();

    if (!name) {
      alert('Informe o nome da companhia antes de salvar.');
      return;
    }

    const company = selectedCompany || {
      id: `manual-${Date.now()}`,
      name,
      category: 'Teatro de grupo',
      city: 'São Paulo',
      region: 'Centro',
      status: 'pending',
      website: '',
      instagram: '',
      description: 'Companhia recém-cadastrada para revisão.',
      notes: 'Cadastro identificado por perfil do usuário; pendente até validação.'
    };

    company.name = name;
    company.category = String(formData.get('companyCategory') || company.category || 'Teatro de grupo');
    company.city = String(formData.get('companyCity') || company.city || 'São Paulo');
    company.region = String(formData.get('companyRegion') || company.region || 'Centro');
    company.status = String(formData.get('companyStatus') || company.status || 'pending');
    company.verificationStatus = String(formData.get('companyVerificationStatus') || company.verificationStatus || 'pending');
    company.website = String(formData.get('companyWebsite') || company.website || '');
    company.instagram = String(formData.get('companyInstagram') || company.instagram || '');
    company.description = String(formData.get('companyDescription') || company.description || '');
    company.notes = String(formData.get('companyNotes') || company.notes || '');

    if (!selectedCompany) {
      state.companies.unshift(company);
    }

    state.activeCompanyId = company.id;
    state.currentView = 'companies';
    render();
    alert('Revisão da companhia salva com sucesso.');
  });

  document.querySelectorAll('[data-company-select]').forEach(button => {
    button.addEventListener('click', () => {
      state.activeCompanyId = button.dataset.companySelect;
      state.currentView = 'companies';
      render();
    });
  });
}

function bindEventHandlers() {
  const form = document.getElementById('eventForm');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get('eventTitle') || '').trim();

    if (!title) {
      alert('Informe o nome do evento antes de salvar.');
      return;
    }

    const selected = state.events.find(event => event.id === state.activeEventId) || state.events[0] || null;
    const nextEvent = selected || {
      id: `evt-${Date.now()}`,
      title,
      companyName: 'Nova companhia',
      venue: '',
      location: '',
      date: '',
      status: 'pending',
      cast: '',
      photos: [],
      description: '',
      historical: '',
      returningSeason: false
    };

    nextEvent.title = title;
    nextEvent.companyName = String(formData.get('eventCompany') || nextEvent.companyName || '');
    nextEvent.venue = String(formData.get('eventVenue') || nextEvent.venue || '');
    nextEvent.location = String(formData.get('eventLocation') || nextEvent.location || '');
    nextEvent.date = String(formData.get('eventDate') || nextEvent.date || '');
    nextEvent.status = String(formData.get('eventStatus') || nextEvent.status || 'pending');
    nextEvent.returningSeason = String(formData.get('eventReturningSeason')) === 'true';
    nextEvent.cast = String(formData.get('eventCast') || nextEvent.cast || '');
    nextEvent.photos = String(formData.get('eventPhotos') || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    nextEvent.description = String(formData.get('eventDescription') || nextEvent.description || '');
    nextEvent.historical = String(formData.get('eventHistorical') || nextEvent.historical || '');

    if (!selected) {
      state.events.unshift(nextEvent);
    }

    state.activeEventId = nextEvent.id;
    state.currentView = 'events';
    render();
    alert('Evento salvo com sucesso.');
  });

  const newEventBtn = document.getElementById('newEventBtn');
  newEventBtn?.addEventListener('click', () => {
    const newEvent = {
      id: `evt-${Date.now()}`,
      title: 'Novo evento',
      companyName: state.currentUser?.companyName || 'Antropofágica',
      venue: 'Novo teatro',
      location: 'Cidade e região',
      date: '',
      status: 'pending',
      cast: '',
      photos: [],
      description: 'Descreva a peça, o local e o contexto da temporada.',
      historical: 'Informe o histórico da peça, retorno de temporada ou produção anterior.',
      returningSeason: false
    };

    state.events.unshift(newEvent);
    state.activeEventId = newEvent.id;
    state.currentView = 'events';
    render();
  });

  document.querySelectorAll('[data-event-select]').forEach(button => {
    button.addEventListener('click', () => {
      state.activeEventId = button.dataset.eventSelect;
      state.currentView = 'events';
      render();
    });
  });
}

function bindAddCompanyHandler() {
  const btn = document.getElementById('newCompanyBtn');
  btn?.addEventListener('click', () => {
    const newCompany = {
      id: `manual-${Date.now()}`,
      name: 'Nova companhia',
      category: 'Teatro de grupo',
      city: 'São Paulo',
      region: 'Centro',
      status: 'pending',
      website: '',
      instagram: '',
      description: 'Companhia recém-cadastrada por perfil e aguardando revisão da plataforma.',
      notes: 'Cadastro identificado por tag de perfil; a companhia fica pendente até confirmação de gestão ou validação administrativa.',
      isHistorical: false
    };

    state.companies.unshift(newCompany);
    state.activeCompanyId = newCompany.id;
    state.currentView = 'companies';
    render();
  });
}

function readProfileFormState(form) {
  const formData = new FormData(form);
  const profileType = formData.get('profileType') || state.currentProfile.profileType;

  return {
    profileType,
    name: formData.get('name') || state.currentProfile.name,
    ageRange: formData.get('ageRange') || state.currentProfile.ageRange,
    gender: formData.get('gender') || state.currentProfile.gender,
    region: formData.get('region') || state.currentProfile.region,
    profession: formData.get('profession') || state.currentProfile.profession,
    secondaryProfession: formData.get('secondaryProfession') || state.currentProfile.secondaryProfession,
    socialLinks: formData.get('socialLinks') || state.currentProfile.socialLinks,
    bio: formData.get('bio') || state.currentProfile.bio,
    institution: formData.get('institution') || state.currentProfile.institution,
    course: formData.get('course') || state.currentProfile.course,
    semester: formData.get('semester') || state.currentProfile.semester,
    interests: formData.get('interests') || state.currentProfile.interests,
    companyName: formData.get('companyName') || state.currentProfile.companyName,
    companyRole: formData.get('companyRole') || state.currentProfile.companyRole,
    companyAffiliationLevel: formData.get('companyAffiliationLevel') || state.currentProfile.companyAffiliationLevel,
    verificationStatus: formData.get('verificationStatus') || state.currentProfile.verificationStatus,
    visibility: formData.get('visibility') || state.currentProfile.visibility
  };
}

function bindProfileHandlers() {
  bindAddCompanyHandler();

  const form = document.getElementById('profileForm');
  if (!form) return;

  const syncProfileSubmitState = () => {
    const formData = new FormData(form);
    const profileType = formData.get('profileType') || state.currentProfile.profileType;
    const requiredFields = getRequiredProfileFields(profileType);
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    const hasAllRequired = requiredFields.every(field => {
      const value = formData.get(field);
      return value !== null && String(value).trim() !== '';
    });

    submitButton.disabled = !hasAllRequired;
  };

  const profileTypeSelect = form.querySelector('select[name="profileType"]');
  profileTypeSelect?.addEventListener('change', (event) => {
    const nextProfileType = event.target.value;
    state.currentProfile = {
      ...state.currentProfile,
      ...readProfileFormState(form),
      profileType: nextProfileType
    };
    render();
  });

  form.addEventListener('input', syncProfileSubmitState);
  form.addEventListener('change', syncProfileSubmitState);

  form.querySelectorAll('[data-action="delete-profile"]').forEach(button => {
    button.addEventListener('click', () => {
      if (state.currentUser?.role === 'platform_admin') {
        alert('O administrador da plataforma não pode apagar o próprio perfil.');
        return;
      }

      const confirmed = window.confirm('Deseja apagar este perfil? Esta ação remove o acesso local do usuário.');
      if (!confirmed) return;

      state.isLoggedIn = false;
      state.currentUser = null;
      state.currentView = 'login';
      render();
    });
  });

  form.querySelectorAll('[data-action="logout"]').forEach(button => {
    button.addEventListener('click', () => {
      state.isLoggedIn = false;
      state.currentUser = null;
      state.currentView = 'login';
      render();
    });
  });

  syncProfileSubmitState();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const profileType = formData.get('profileType') || state.currentProfile.profileType;
    const requiredFields = getRequiredProfileFields(profileType);
    const missing = requiredFields.filter(field => {
      const value = formData.get(field);
      return value === null || String(value).trim() === '';
    });

    if (missing.length) {
      const labels = {
        name: 'nome',
        ageRange: 'faixa etária',
        gender: 'gênero',
        region: 'região',
        profession: 'profissão principal',
        institution: 'instituição',
        course: 'curso',
        semester: 'semestre',
        companyName: 'nome da companhia',
        companyRole: 'cargo/função',
        companyAffiliationLevel: 'nível de filiação'
      };

      alert(`Preencha os campos obrigatórios para este tipo de perfil: ${missing.map(field => labels[field] || field).join(', ')}.`);
      return;
    }

    state.currentProfile = {
      ...state.currentProfile,
      ...readProfileFormState(form)
    };

    render();
    alert('Perfil salvo com sucesso.');
  });
}

function bindDashboardQuickActions() {
  document.querySelectorAll('[data-view]').forEach(element => {
    const view = element.dataset.view;
    if (!view || element.closest('.nav-link')) return;

    const isPendingItem = element.classList.contains('pending-item');
    const isClickable = element.tagName === 'LI' || element.tagName === 'BUTTON';

    if (!isClickable || !view) return;

    element.addEventListener('click', () => {
      state.currentView = view;
      render();
    });
  });

  document.querySelectorAll('.pending-list li').forEach(item => {
    item.classList.add('pending-item');
  });
}

function bindImportHandler() {
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('csvFileInput');
  const previewList = document.getElementById('previewList');
  const useSampleBtn = document.getElementById('useSampleBtn');

  const sampleCsv = [
    'nome,tipo,cidade,regiao,endereco,site,instagram,observacoes,fonte,verificado',
    'A Digna Coletivo Teatral,teatro de grupo,São Paulo,Centro,,, ,Extraído do livro, Livro Teatro de Grupo,false',
    'Agrupamento Andar 7,teatro de grupo,São Paulo,Leste,,, ,Extraído do livro, Livro Teatro de Grupo,false',
    'Brava Companhia,teatro de grupo,São Paulo,Sul,,, ,Extraído do livro, Livro Teatro de Grupo,false'
  ].join('\n');

  useSampleBtn?.addEventListener('click', () => {
    previewList.innerHTML = '';
    const rows = parseCsv(sampleCsv);
    rows.slice(0, 5).forEach(row => {
      const item = document.createElement('li');
      item.textContent = `${row.nome} • ${row.cidade} • ${row.regiao || 'Sem região'}`;
      previewList.appendChild(item);
    });
  });

  importBtn?.addEventListener('click', async () => {
    const file = fileInput?.files?.[0];
    if (!file) {
      alert('Selecione um arquivo CSV antes de importar.');
      return;
    }

    const text = await file.text();
    const rows = parseCsv(text);

    previewList.innerHTML = '';
    rows.slice(0, 10).forEach(row => {
      const li = document.createElement('li');
      li.textContent = `${row.nome || 'Sem nome'} • ${row.cidade || 'Sem cidade'} • ${row.regiao || 'Sem região'}`;
      previewList.appendChild(li);
    });

    if (rows.length > 0) {
      importRows(rows);
      alert(`${rows.length} registros importados para revisão.`);
      state.currentView = 'companies';
      render();
    }
  });
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim().replace(/^"|"$/g, '');
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function importRows(rows) {
  const imported = rows
    .filter(row => row.nome && row.nome !== 'nome')
    .map((row, index) => ({
      id: `import-${Date.now()}-${index}`,
      name: row.nome || 'Companhia sem nome',
      category: row.tipo || 'Teatro de grupo',
      city: row.cidade || 'São Paulo',
      region: row.regiao || 'Sem região',
      status: row.verificado === 'true' ? 'active' : 'pending',
      website: row.site || '',
      instagram: row.instagram || '',
      description: row.observacoes || 'Importado a partir do CSV inicial.'
    }));

  state.companies = [...imported, ...state.companies];
}

function formatStatus(status) {
  return formatStatusLabel(status);
}

function formatRole(role) {
  return formatRoleLabel(role);
}

function formatVerification(status) {
  return formatVerificationLabel(status);
}

render();
