const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CHAVE_TOKEN = 'manicure_token';

function getToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

function setToken(token) {
  localStorage.setItem(CHAVE_TOKEN, token);
}

function limparToken() {
  localStorage.removeItem(CHAVE_TOKEN);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = options.semJson ? {} : { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, { ...options, headers: { ...headers, ...options.headers } });

  // Sessão expirada/inválida — limpa o token e manda pra tela de login.
  if (res.status === 401 && path !== '/auth/login') {
    limparToken();
    window.location.reload();
    return new Promise(() => {}); // trava aqui, a página já vai recarregar
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // resposta sem corpo (ex: 204)
  }

  if (!res.ok) {
    const mensagem = data?.erro || 'Ocorreu um erro inesperado.';
    throw new Error(mensagem);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  // Envia FormData (upload de arquivo) sem forçar Content-Type — o navegador
  // define o boundary do multipart sozinho.
  upload: (path, formData) => request(path, { method: 'POST', body: formData, semJson: true }),
  urlCompleta: (path) => `${API_URL}/api${path}`,

  async login(usuario, senha) {
    const { token } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ usuario, senha }) });
    setToken(token);
  },
  logout: () => {
    limparToken();
    window.location.reload();
  },
  estaLogado: () => !!getToken(),
};
