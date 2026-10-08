// api/upload.js
//
// Recebe UMA foto por vez, guarda no Vercel Blob e devolve o link.
//
// Por que uma de cada vez? As funções da Vercel aceitam no máximo ~4,5 MB por
// requisição. Se várias fotos fossem enviadas juntas, o limite estouraria
// rápido. O admin.html reduz cada foto no navegador e envia uma por requisição;
// depois salva a memória (via /api/dados) com a lista de links.
//
//   POST /api/upload   (multipart/form-data: campos "senha" e arquivo "foto")
//   -> { ok: true, url: "https://..." }

import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

function campoTexto(fields, nome) {
  const valor = fields[nome];
  if (Array.isArray(valor)) return (valor[0] || '').toString().trim();
  return (valor || '').toString().trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ erro: 'Método não permitido.' });
    }

    const form = formidable({ maxFileSize: 5 * 1024 * 1024, allowEmptyFiles: true, minFileSize: 0 });
    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (erro) {
      console.error('Erro ao ler upload:', erro);
      return res.status(400).json({ erro: 'Não consegui ler a foto enviada: ' + erro.message });
    }

    const senha = campoTexto(fields, 'senha');
    if (!process.env.ADMIN_PASSWORD || senha !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }

    const arquivo = Array.isArray(files.foto) ? files.foto[0] : files.foto;
    if (!arquivo || !arquivo.size) {
      return res.status(400).json({ erro: 'Nenhuma foto foi enviada.' });
    }
    if (!(arquivo.mimetype || '').startsWith('image/')) {
      return res.status(400).json({ erro: 'O arquivo precisa ser uma imagem.' });
    }

    const nomeSeguro = (arquivo.originalFilename || 'foto').replace(/[^a-zA-Z0-9._-]/g, '-');
    const nomeArquivo = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguro}`;

    try {
      const buffer = fs.readFileSync(arquivo.filepath);
      const blob = await put(nomeArquivo, buffer, {
        access: 'public',
        contentType: arquivo.mimetype || 'image/jpeg',
      });
      return res.status(200).json({ ok: true, url: blob.url });
    } catch (erro) {
      console.error('Erro ao enviar foto para o Blob:', erro);
      return res.status(500).json({ erro: 'Não consegui salvar a foto: ' + erro.message });
    }
  } catch (erroInesperado) {
    console.error('Erro inesperado em /api/upload:', erroInesperado);
    return res.status(500).json({ erro: 'Erro interno: ' + (erroInesperado && erroInesperado.message ? erroInesperado.message : 'desconhecido') });
  }
}
