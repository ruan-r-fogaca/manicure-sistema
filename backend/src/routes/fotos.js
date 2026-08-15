import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { supabase } from '../supabaseClient.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// GET /api/fotos?cliente_id=...
router.get('/', async (req, res) => {
  let query = supabase.from('fotos').select('*, clientes(nome)').order('criado_em', { ascending: false });
  if (req.query.cliente_id) query = query.eq('cliente_id', req.query.cliente_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// POST /api/fotos (multipart: campo "foto"; cliente_id e legenda opcionais)
router.post('/', upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Envie uma foto no campo "foto".' });

  const extensao = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const nomeArquivo = `${randomUUID()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from('fotos')
    .upload(nomeArquivo, req.file.buffer, { contentType: req.file.mimetype });
  if (erroUpload) return res.status(500).json({ erro: erroUpload.message });

  const { data: urlPublica } = supabase.storage.from('fotos').getPublicUrl(nomeArquivo);

  const { data, error } = await supabase
    .from('fotos')
    .insert({
      cliente_id: req.body.cliente_id || null,
      url: urlPublica.publicUrl,
      legenda: req.body.legenda || null,
    })
    .select('*, clientes(nome)')
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

// DELETE /api/fotos/:id
router.delete('/:id', async (req, res) => {
  const { data: foto, error: erroBusca } = await supabase.from('fotos').select('url').eq('id', req.params.id).single();
  if (erroBusca) return res.status(404).json({ erro: 'Foto não encontrada.' });

  const nomeArquivo = foto.url.split('/').pop();
  await supabase.storage.from('fotos').remove([nomeArquivo]);

  const { error } = await supabase.from('fotos').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.status(204).send();
});

export default router;
