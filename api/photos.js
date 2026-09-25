// api/photos.js
//
// Uma única rota que serve de "banco de dados" das memórias do álbum:
//   GET    /api/photos            -> lista todas as memórias (usado pelo site principal)
//   POST   /api/photos            -> adiciona uma nova memória (usado pela página /admin.html)
//   DELETE /api/photos?id=xxxxx   -> remove uma memória (usado pela página /admin.html)
//
// As fotos em si ficam guardadas no Vercel Blob (arquivo binário).
// A lista de memórias (título, data, local, frase, tags, link da foto)
// fica guardada em um único arquivo JSON, também no Vercel Blob, funcionando
// como um "manifesto". Isso evita precisar configurar um banco de dados à parte.
//
// Requer a variável de ambiente ADMIN_PASSWORD (definida no painel da Vercel)
// para autorizar quem pode adicionar ou apagar memórias. A leitura (GET) é livre,
// assim como o próprio site.

import { put, del, list } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false }, // precisamos ler o formulário (multipart) manualmente
};

const MANIFESTO = 'memorias/manifesto.json';

async function lerManifesto() {
  try {
    const { blobs } = await list({ prefix: MANIFESTO });
    const encontrado = blobs.find((b) => b.pathname === MANIFESTO);
    if (!encontrado) return [];
    const resposta = await fetch(encontrado.url, { cache: 'no-store' });
    if (!resposta.ok) return [];
    return await resposta.json();
  } catch (erro) {
    console.error('Erro ao ler manifesto:', erro);
    return [];
  }
}

async function salvarManifesto(memorias) {
  await put(MANIFESTO, JSON.stringify(memorias, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function campoTexto(fields, nome) {
  const valor = fields[nome];
  if (Array.isArray(valor)) return (valor[0] || '').toString().trim();
  return (valor || '').toString().trim();
}

export default async function handler(req, res) {
  // ---------------------------------------------------------------------
  // GET — lista as memórias para o site principal
  // ---------------------------------------------------------------------
  if (req.method === 'GET') {
    const memorias = await lerManifesto();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(memorias);
  }

  // ---------------------------------------------------------------------
  // POST — adiciona uma nova memória (foto + descrição)
  // ---------------------------------------------------------------------
  if (req.method === 'POST') {
    const form = formidable({ maxFileSize: 15 * 1024 * 1024 }); // até 15MB por foto

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (erro) {
      return res.status(400).json({ erro: 'Não consegui ler o formulário enviado.' });
    }

    const senha = campoTexto(fields, 'senha');
    if (!process.env.ADMIN_PASSWORD || senha !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }

    const arquivo = Array.isArray(files.foto) ? files.foto[0] : files.foto;
    if (!arquivo) {
      return res.status(400).json({ erro: 'Nenhuma foto foi enviada.' });
    }

    const titulo = campoTexto(fields, 'titulo') || 'Sem título';
    const data = campoTexto(fields, 'data');
    const local = campoTexto(fields, 'local');
    const frase = campoTexto(fields, 'frase');
    const tags = campoTexto(fields, 'tags')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const buffer = fs.readFileSync(arquivo.filepath);
    const nomeArquivo = `fotos/${Date.now()}-${(arquivo.originalFilename || 'foto').replace(/[^a-zA-Z0-9._-]/g, '-')}`;

    let blob;
    try {
      blob = await put(nomeArquivo, buffer, {
        access: 'public',
        contentType: arquivo.mimetype || 'image/jpeg',
      });
    } catch (erro) {
      console.error('Erro ao enviar foto para o Blob:', erro);
      return res.status(500).json({ erro: 'Não consegui salvar a foto.' });
    }

    const memorias = await lerManifesto();
    const novaMemoria = {
      id: Date.now().toString(),
      titulo,
      data,
      local,
      frase,
      tags,
      img: blob.url,
      criadoEm: new Date().toISOString(),
    };
    memorias.unshift(novaMemoria);
    await salvarManifesto(memorias);

    return res.status(200).json({ ok: true, memoria: novaMemoria });
  }

  // ---------------------------------------------------------------------
  // DELETE — remove uma memória e a foto correspondente
  // ---------------------------------------------------------------------
  if (req.method === 'DELETE') {
    const { id, senha } = req.query;
    if (!process.env.ADMIN_PASSWORD || senha !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }
    if (!id) {
      return res.status(400).json({ erro: 'Informe o id da memória a remover.' });
    }

    const memorias = await lerManifesto();
    const memoria = memorias.find((m) => m.id === id);
    if (!memoria) {
      return res.status(404).json({ erro: 'Memória não encontrada.' });
    }

    try {
      if (memoria.img) await del(memoria.img);
    } catch (erro) {
      console.error('Aviso: não consegui apagar o arquivo da foto:', erro);
    }

    const restantes = memorias.filter((m) => m.id !== id);
    await salvarManifesto(restantes);

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ erro: 'Método não permitido.' });
}
