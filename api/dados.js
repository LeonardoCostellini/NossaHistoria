// api/dados.js
//
// Uma rota genérica que serve de "banco de dados" para três coleções:
//   fotos     -> álbum de memórias com foto
//   momentos  -> linha do tempo do relacionamento (foto opcional)
//   eventos   -> calendário de próximos momentos (sem foto)
//
//   GET    /api/dados?colecao=fotos|momentos|eventos            -> lista tudo
//   POST   /api/dados            (multipart/form-data, campo "colecao")
//   DELETE /api/dados?colecao=X&id=Y&senha=Z
//
// Cada coleção vira um arquivo JSON ("manifesto") guardado no Vercel Blob.
// As fotos (quando existem) também vão para o Blob, como arquivo binário.
//
// Requer a variável de ambiente ADMIN_PASSWORD para autorizar escrita/remoção.
// Leitura (GET) é livre, assim como o próprio site.

import { put, del, list } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

const COLECOES = {
  fotos: {
    manifesto: 'memorias/fotos.json',
    permiteFoto: true,
    obrigatorioFoto: true,
    montar: (fields) => ({
      titulo: campoTexto(fields, 'titulo') || 'Sem título',
      data: campoTexto(fields, 'data'),
      local: campoTexto(fields, 'local'),
      frase: campoTexto(fields, 'frase'),
      tags: campoTexto(fields, 'tags').split(',').map((t) => t.trim()).filter(Boolean),
    }),
  },
  momentos: {
    manifesto: 'memorias/momentos.json',
    permiteFoto: true,
    obrigatorioFoto: false,
    montar: (fields) => ({
      titulo: campoTexto(fields, 'titulo') || 'Sem título',
      data: campoTexto(fields, 'data'),
      emoji: campoTexto(fields, 'emoji') || '❤️',
      texto: campoTexto(fields, 'texto'),
    }),
  },
  eventos: {
    manifesto: 'memorias/eventos.json',
    permiteFoto: false,
    obrigatorioFoto: false,
    montar: (fields) => ({
      titulo: campoTexto(fields, 'titulo') || 'Sem título',
      dataISO: campoTexto(fields, 'dataISO'),
      emoji: campoTexto(fields, 'emoji') || '❤️',
      texto: campoTexto(fields, 'texto'),
      local: campoTexto(fields, 'local'),
      categoria: campoTexto(fields, 'categoria'),
      status: campoTexto(fields, 'status') || 'queremos',
    }),
  },
};

function campoTexto(fields, nome) {
  const valor = fields[nome];
  if (Array.isArray(valor)) return (valor[0] || '').toString().trim();
  return (valor || '').toString().trim();
}

async function lerManifesto(caminho) {
  try {
    const { blobs } = await list({ prefix: caminho });
    const encontrado = blobs.find((b) => b.pathname === caminho);
    if (!encontrado) return [];
    const resposta = await fetch(encontrado.url, { cache: 'no-store' });
    if (!resposta.ok) return [];
    return await resposta.json();
  } catch (erro) {
    console.error('Erro ao ler manifesto:', erro);
    return [];
  }
}

async function salvarManifesto(caminho, dados) {
  await put(caminho, JSON.stringify(dados, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function senhaValida(valor) {
  return Boolean(process.env.ADMIN_PASSWORD) && valor === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const colecao = (req.query.colecao || '').toString();
    const config = COLECOES[colecao];
    if (!config) return res.status(400).json({ erro: 'Coleção inválida.' });

    const dados = await lerManifesto(config.manifesto);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(dados);
  }

  if (req.method === 'POST') {
    const form = formidable({ maxFileSize: 15 * 1024 * 1024 });

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (erro) {
      return res.status(400).json({ erro: 'Não consegui ler o formulário enviado.' });
    }

    const colecao = campoTexto(fields, 'colecao');
    const config = COLECOES[colecao];
    if (!config) return res.status(400).json({ erro: 'Coleção inválida.' });

    const senha = campoTexto(fields, 'senha');
    if (!senhaValida(senha)) {
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }

    let urlFoto = null;
    const arquivo = Array.isArray(files.foto) ? files.foto[0] : files.foto;

    if (config.obrigatorioFoto && !arquivo) {
      return res.status(400).json({ erro: 'Esta seção exige uma foto.' });
    }

    if (config.permiteFoto && arquivo) {
      try {
        const buffer = fs.readFileSync(arquivo.filepath);
        const nomeArquivo = `fotos/${Date.now()}-${(arquivo.originalFilename || 'foto').replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const blob = await put(nomeArquivo, buffer, {
          access: 'public',
          contentType: arquivo.mimetype || 'image/jpeg',
        });
        urlFoto = blob.url;
      } catch (erro) {
        console.error('Erro ao enviar foto para o Blob:', erro);
        return res.status(500).json({ erro: 'Não consegui salvar a foto.' });
      }
    }

    const item = {
      id: Date.now().toString(),
      ...config.montar(fields),
      ...(urlFoto ? { img: urlFoto } : {}),
      criadoEm: new Date().toISOString(),
    };

    const lista = await lerManifesto(config.manifesto);
    lista.unshift(item);
    await salvarManifesto(config.manifesto, lista);

    return res.status(200).json({ ok: true, item });
  }

  if (req.method === 'DELETE') {
    const { id, senha, colecao } = req.query;
    const config = COLECOES[colecao];
    if (!config) return res.status(400).json({ erro: 'Coleção inválida.' });
    if (!senhaValida(senha)) return res.status(401).json({ erro: 'Senha incorreta.' });
    if (!id) return res.status(400).json({ erro: 'Informe o id do item a remover.' });

    const lista = await lerManifesto(config.manifesto);
    const item = lista.find((m) => m.id === id);
    if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

    if (item.img) {
      try { await del(item.img); } catch (erro) { console.error('Aviso: não consegui apagar a foto:', erro); }
    }

    const restantes = lista.filter((m) => m.id !== id);
    await salvarManifesto(config.manifesto, restantes);

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ erro: 'Método não permitido.' });
}
