import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';

import clientesRouter from './routes/clientes.js';
import servicosRouter from './routes/servicos.js';
import agendamentosRouter from './routes/agendamentos.js';
import pagamentosRouter from './routes/pagamentos.js';
import dashboardRouter from './routes/dashboard.js';
import financeiroRouter from './routes/financeiro.js';
import cobrancasRouter from './routes/cobrancas.js';
import configuracoesRouter from './routes/configuracoes.js';
import mensagensRouter from './routes/mensagens.js';
import relatoriosRouter from './routes/relatorios.js';
import exportarRouter from './routes/exportar.js';
import fotosRouter from './routes/fotos.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(compression());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', servico: 'API Sistema Manicure' });
});

app.use('/api/clientes', clientesRouter);
app.use('/api/servicos', servicosRouter);
app.use('/api/agendamentos', agendamentosRouter);
app.use('/api/pagamentos', pagamentosRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/financeiro', financeiroRouter);
app.use('/api/cobrancas', cobrancasRouter);
app.use('/api/configuracoes', configuracoesRouter);
app.use('/api/mensagens', mensagensRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/exportar', exportarRouter);
app.use('/api/fotos', fotosRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});