import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// POST /api/auth/login -> { usuario, senha } -> { token }
router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) return res.status(400).json({ erro: 'Informe usuário e senha.' });

  const usuarioValido = usuario === process.env.ADMIN_USERNAME;
  const senhaValida = process.env.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(senha, process.env.ADMIN_PASSWORD_HASH)
    : false;

  if (!usuarioValido || !senhaValida) {
    return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
  }

  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '365d' });
  res.json({ token });
});

export default router;
