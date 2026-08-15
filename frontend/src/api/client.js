const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: options.semJson ? undefined : { 'Content-Type': 'application/json' },
    ...options,
  });

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
};
