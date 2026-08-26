import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// Lê ADMIN_USERNAME/ADMIN_PASSWORD_HASH, ADMIN2_USERNAME/ADMIN2_PASSWORD_HASH,
// ADMIN3_... e assim por diante — cada conta é só um par de variáveis, sem
// tabela no banco. Pra adicionar mais gente, é só criar o próximo par no .env.
function contasAdmin() {
  const contas = [];
  const primeira = { usuario: process.env.ADMIN_USERNAME, hash: process.env.ADMIN_PASSWORD_HASH };
  if (primeira.usuario && primeira.hash) contas.push(primeira);

  for (let i = 2; ; i++) {
    const usuario = process.env[`ADMIN${i}_USERNAME`];
    const hash = process.env[`ADMIN${i}_PASSWORD_HASH`];
    if (!usuario || !hash) break;
    contas.push({ usuario, hash });
  }
  return contas;
}

// POST /api/auth/login -> { usuario, senha } -> { token }
// Usuário não diferencia maiúscula/minúscula; senha diferencia.
router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) return res.status(400).json({ erro: 'Informe usuário e senha.' });

  const conta = contasAdmin().find((c) => c.usuario.toLowerCase() === usuario.trim().toLowerCase());
  const senhaValida = conta ? await bcrypt.compare(senha, conta.hash) : false;

  if (!conta || !senhaValida) {
    return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
  }

  const token = jwt.sign({ usuario: conta.usuario }, process.env.JWT_SECRET, { expiresIn: '365d' });
  res.json({ token });
});

export default router;
