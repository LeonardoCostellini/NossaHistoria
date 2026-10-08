// api/dados.js
//
// Uma rota genérica que serve de "banco de dados" para várias coleções.
// Duas formas de coleção:
//   "lista"  -> vários itens com id (fotos, momentos, eventos, coisas, planos)
//   "unico"  -> um único objeto, sem lista (config, carta)
//
//   GET    /api/dados?colecao=X                    -> lista tudo (ou o objeto, se "unico")
//   POST   /api/dados            (multipart/form-data, campo "colecao")      -> adiciona
//   PUT    /api/dados            (multipart/form-data, campos "colecao" e "id") -> edita
//   DELETE /api/dados?colecao=X&id=Y&senha=Z       (ou &tudo=1 para apagar tudo)
//
// Cada coleção vira um arquivo JSON ("manifesto") guardado no Vercel Blob.
// As fotos são enviadas antes, uma a uma, por /api/upload (Blob); aqui só
// guardamos os links delas junto com os textos.
//
// Requer a variável de ambiente ADMIN_PASSWORD para autorizar escrita/remoção.
// Leitura (GET) é livre, assim como o próprio site.

import { put, del, list } from '@vercel/blob';
import formidable from 'formidable';

export const config = {
  api: { bodyParser: false },
};

const COLECOES = {
  fotos: {
    tipo: 'lista',
    manifesto: 'memorias/fotos.json',
    novosNo: 'inicio',
    permiteFoto: true,
    obrigatorioFoto: true,
    padrao: [
      { id: 'padrao-1', titulo: 'Nosso primeiro passeio', data: '15/10/2024', local: 'em algum lugar especial', frase: 'Foi aqui que começamos a perceber que viver momentos juntos era uma das melhores coisas.', tags: ['primeiro passeio', '2024'] },
      { id: 'padrao-2', titulo: 'Aquele pôr do sol', data: '02/2025', local: '', frase: 'Ficamos calados só para aproveitar.', tags: ['viagem'] },
      { id: 'padrao-3', titulo: 'Noite de pizza e filme', data: '05/2025', local: 'em casa', frase: 'As noites mais simples são sempre as melhores.', tags: ['em casa'] },
      { id: 'padrao-4', titulo: 'Um ano juntos', data: '07/10/2025', local: '', frase: 'Comemorando o primeiro de muitos.', tags: ['aniversário'] },
      { id: 'padrao-5', titulo: 'Passeio no parque', data: '09/2025', local: '', frase: 'Um domingo qualquer que virou memória.', tags: ['passeio'] },
      { id: 'padrao-6', titulo: 'Aquela viagem inesquecível', data: '12/2025', local: '', frase: 'Se pudesse, viveria de novo cada segundo.', tags: ['viagem'] },
    ],
    montar: (fields) => ({
      titulo: campoTexto(fields, 'titulo') || 'Sem título',
      data: campoTexto(fields, 'data'),
      local: campoTexto(fields, 'local'),
      frase: campoTexto(fields, 'frase'),
      tags: campoTexto(fields, 'tags').split(',').map((t) => t.trim()).filter(Boolean),
    }),
  },
  momentos: {
    tipo: 'lista',
    manifesto: 'memorias/momentos.json',
    novosNo: 'fim',   // a linha do tempo segue a ordem da lista: o que você adiciona entra no final
    permiteFoto: true,
    obrigatorioFoto: false,
    padrao: [
      { id: 'padrao-1', data: '07/10/2024', emoji: '❤️', titulo: 'O começo', texto: 'O dia em que decidimos escrever essa história juntos.' },
      { id: 'padrao-2', data: 'outubro/2024', emoji: '☕', titulo: 'Primeiro encontro de verdade', texto: 'Ainda lembro exatamente do que você vestia.' },
      { id: 'padrao-3', data: '2025', emoji: '🌎', titulo: 'Nossa primeira viagem', texto: 'Descobrimos que viajar junto também é um jeito de se conhecer.' },
      { id: 'padrao-4', data: '07/10/2025', emoji: '🎂', titulo: 'Primeiro aniversário de namoro', texto: 'Um ano se sentindo como o primeiro dia.' },
      { id: 'padrao-5', data: '07/10/2026', emoji: '❤️', titulo: '2 anos de nós', texto: 'E a história continua sendo escrita.' },
    ],
    montar: (fields) => ({
      titulo: campoTexto(fields, 'titulo') || 'Sem título',
      data: campoTexto(fields, 'data'),
      emoji: campoTexto(fields, 'emoji') || '❤️',
      texto: campoTexto(fields, 'texto'),
    }),
  },
  eventos: {
    tipo: 'lista',
    manifesto: 'memorias/eventos.json',
    novosNo: 'fim',
    permiteFoto: false,
    obrigatorioFoto: false,
    padrao: [
      { id: 'padrao-1', dataISO: '2026-10-12', emoji: '🎬', titulo: 'Noite de filme', texto: 'Escolher um filme e ficar juntinhos.', status: 'marcado' },
      { id: 'padrao-2', dataISO: '2026-10-20', emoji: '🍕', titulo: 'Pedir aquela pizza', texto: 'Do jeitinho que a gente gosta.', status: 'queremos' },
      { id: 'padrao-3', dataISO: '2026-11-07', emoji: '🌸', titulo: 'Passear no parque', texto: 'Tarde livre só nossa.', status: 'queremos' },
      { id: 'padrao-4', dataISO: '2026-12-25', emoji: '🎄', titulo: 'Natal juntos', texto: 'Comemorar mais uma data no nosso jeito.', status: 'marcado' },
    ],
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
  coisas: {
    tipo: 'lista',
    manifesto: 'memorias/coisas.json',
    novosNo: 'fim',
    permiteFoto: false,
    obrigatorioFoto: false,
    padrao: [
      { id: 'padrao-1', emoji: '💗', frente: 'Seu sorriso', verso: 'Ele consegue mudar completamente o meu dia.' },
      { id: 'padrao-2', emoji: '🧸', frente: 'Seu jeito carinhoso', verso: 'Você cuida de mim de um jeito que eu nunca tinha sentido.' },
      { id: 'padrao-3', emoji: '😂', frente: 'Quando você começa a rir', verso: 'E não consegue mais parar — é a minha coisa favorita.' },
      { id: 'padrao-4', emoji: '❤️', frente: 'Os momentos simples', verso: 'Com você, até o silêncio é bom.' },
      { id: 'padrao-5', emoji: '🌷', frente: 'Seu cuidado com os detalhes', verso: 'Você percebe coisas que ninguém mais percebe.' },
      { id: 'padrao-6', emoji: '🫶', frente: 'O jeito que você me escuta', verso: 'Sinto que posso ser eu mesmo, sempre.' },
    ],
    montar: (fields) => ({
      emoji: campoTexto(fields, 'emoji') || '❤️',
      frente: campoTexto(fields, 'frente') || 'Sem título',
      verso: campoTexto(fields, 'verso'),
    }),
  },
  planos: {
    tipo: 'lista',
    manifesto: 'memorias/planos.json',
    novosNo: 'fim',
    permiteFoto: false,
    obrigatorioFoto: false,
    padrao: [
      { id: 'padrao-1', titulo: 'Viajar juntos para um lugar novo', texto: 'Ainda não decidimos onde, e tá tudo bem.', status: 'queremos' },
      { id: 'padrao-2', titulo: 'Assistir aquela série que todo mundo fala', texto: 'Maratona no fim de semana.', status: 'queremos' },
      { id: 'padrao-3', titulo: 'Jantar de aniversário', texto: 'Já reservamos o lugar.', status: 'marcado' },
      { id: 'padrao-4', titulo: 'Primeira viagem juntos', texto: 'E foi incrível.', status: 'feito' },
    ],
    montar: (fields) => ({
      titulo: campoTexto(fields, 'titulo') || 'Sem título',
      texto: campoTexto(fields, 'texto'),
      status: campoTexto(fields, 'status') || 'queremos',
    }),
  },
  config: {
    tipo: 'unico',
    manifesto: 'memorias/config.json',
    padrao: {
      nomeDela: 'Roberta Hikaru Miyazaki',
      meuNome: 'Leonardo Barreiro Costellini',
      inicioRelacionamento: '2024-10-07',
    },
    montar: (fields) => ({
      nomeDela: campoTexto(fields, 'nomeDela'),
      meuNome: campoTexto(fields, 'meuNome'),
      inicioRelacionamento: campoTexto(fields, 'inicioRelacionamento'),
    }),
  },
  carta: {
    tipo: 'unico',
    manifesto: 'memorias/carta.json',
    padrao: {
      texto: 'Meu amor,\n\nSe alguém me perguntasse, há dois anos, onde eu estaria hoje, eu jamais imaginaria uma resposta tão boa quanto essa: aqui, ao seu lado, escrevendo mais um capítulo da nossa história.\n\nVocê trouxe leveza pros meus dias difíceis e fez os dias bons ficarem ainda melhores. Cada memória que guardamos juntos nesses dois anos vale mais do que eu conseguiria colocar em palavras — mas vou continuar tentando, todos os dias.\n\nObrigado por escrever essa história comigo. Ainda temos muitas páginas em branco pela frente, e eu não quero vivê-las com mais ninguém.',
      assinatura: 'com todo o meu amor',
    },
    montar: (fields) => ({
      texto: campoTexto(fields, 'texto'),
      assinatura: campoTexto(fields, 'assinatura') || 'com todo o meu amor',
    }),
  },
};

function campoTexto(fields, nome) {
  const valor = fields[nome];
  if (Array.isArray(valor)) return (valor[0] || '').toString().trim();
  return (valor || '').toString().trim();
}

// ---------------------------------------------------------------------------
// Armazenamento versionado
//
// O Vercel Blob guarda o arquivo numa CDN com cache: se um arquivo é regravado
// NO MESMO CAMINHO, quem lê pode receber a versão antiga por até ~60 segundos.
// Isso fazia o "remover" parecer não funcionar (a lista recarregava com o item
// ainda lá) e, pior, a remoção seguinte partia da lista velha e trazia de volta
// itens já apagados.
//
// Solução: cada gravação cria um arquivo NOVO  (memorias/<coleção>/<hora>-<id>.json),
// que nunca tem cache antigo, e a leitura sempre pega o mais recente.
// As versões mais antigas são apagadas depois (guardamos as 3 últimas).
// ---------------------------------------------------------------------------
const pastaDe = (caminho) => caminho.replace(/\.json$/, '/');
const horaDaVersao = (pathname, pasta) => parseInt(pathname.slice(pasta.length), 10) || 0;

async function lerManifesto(caminho, padrao) {
  const clonePadrao = () => JSON.parse(JSON.stringify(padrao));
  const pasta = pastaDe(caminho);

  // 1) versão mais recente
  const { blobs } = await list({ prefix: pasta });
  const versoes = blobs
    .filter((b) => b.pathname.endsWith('.json'))
    .sort((x, y) => horaDaVersao(y.pathname, pasta) - horaDaVersao(x.pathname, pasta));
  if (versoes.length > 0) {
    const resposta = await fetch(versoes[0].url, { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Não consegui ler os dados salvos (HTTP ' + resposta.status + ').');
    return await resposta.json();
  }

  // 2) arquivo do formato antigo (um único arquivo por coleção), se existir
  const legado = (await list({ prefix: caminho })).blobs.find((b) => b.pathname === caminho);
  if (legado) {
    const resposta = await fetch(legado.url, { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Não consegui ler os dados salvos (HTTP ' + resposta.status + ').');
    return await resposta.json();
  }

  // 3) nada salvo ainda: usa o conteúdo padrão
  return clonePadrao();
}

async function salvarManifesto(caminho, dados) {
  const pasta = pastaDe(caminho);
  const nome = `${pasta}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await put(nome, JSON.stringify(dados, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  // limpeza (não é crítica): mantém as 3 versões mais recentes e remove o arquivo do formato antigo
  try {
    const minha = horaDaVersao(nome, pasta);
    const { blobs } = await list({ prefix: pasta });
    const anteriores = blobs
      .filter((b) => b.pathname.endsWith('.json') && horaDaVersao(b.pathname, pasta) < minha)
      .sort((x, y) => horaDaVersao(y.pathname, pasta) - horaDaVersao(x.pathname, pasta));
    const apagar = anteriores.slice(2).map((b) => b.url);
    const legado = (await list({ prefix: caminho })).blobs.filter((b) => b.pathname === caminho).map((b) => b.url);
    if (apagar.length + legado.length > 0) await del([...apagar, ...legado]);
  } catch (erro) {
    console.error('Aviso: não consegui limpar versões antigas:', erro);
  }
}

function senhaValida(valor) {
  return Boolean(process.env.ADMIN_PASSWORD) && valor === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  try {
    // Não dependemos de req.query (pode não estar disponível dependendo do
    // runtime); lemos a query string diretamente da URL, o que funciona sempre.
    const url = new URL(req.url, 'http://localhost');
    const parametros = url.searchParams;

    if (req.method === 'GET') {
      const colecao = parametros.get('colecao') || '';
      const config = COLECOES[colecao];
      if (!config) return res.status(400).json({ erro: 'Coleção inválida: ' + colecao });

      const padrao = config.tipo === 'unico' ? (config.padrao || null) : (config.padrao || []);
      const dados = await lerManifesto(config.manifesto, padrao);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(dados);
    }

    if (req.method === 'POST') {
      // O formulário chega como multipart só com texto; as fotos já foram
      // enviadas antes, uma a uma, por /api/upload — aqui chega só a lista de links.
      const form = formidable({ maxFileSize: 1024 * 1024, allowEmptyFiles: true, minFileSize: 0 });

      let fields;
      try {
        [fields] = await form.parse(req);
      } catch (erro) {
        console.error('Erro ao ler formulário:', erro);
        return res.status(400).json({ erro: 'Não consegui ler o formulário enviado: ' + erro.message });
      }

      const colecao = campoTexto(fields, 'colecao');
      const config = COLECOES[colecao];
      if (!config) return res.status(400).json({ erro: 'Coleção inválida: ' + colecao });

      const senha = campoTexto(fields, 'senha');
      if (!senhaValida(senha)) {
        return res.status(401).json({ erro: 'Senha incorreta.' });
      }

      // ---- Coleção "única" (config / carta): substitui o objeto inteiro ----
      if (config.tipo === 'unico') {
        const item = { ...config.montar(fields), atualizadoEm: new Date().toISOString() };
        await salvarManifesto(config.manifesto, item);
        return res.status(200).json({ ok: true, item });
      }

      // ---- Fotos já enviadas (lista de links vinda do admin) ----
      let urls = [];
      try {
        const bruto = JSON.parse(campoTexto(fields, 'imagens') || '[]');
        if (Array.isArray(bruto)) {
          urls = bruto.filter((u) => typeof u === 'string' && u.startsWith('https://')).slice(0, 40);
        }
      } catch (erro) {
        return res.status(400).json({ erro: 'Lista de fotos inválida.' });
      }

      if (config.obrigatorioFoto && urls.length === 0) {
        return res.status(400).json({ erro: 'Esta seção exige pelo menos uma foto.' });
      }
      if (!config.permiteFoto) urls = [];

      const agora = Date.now();
      const criadoEm = new Date().toISOString();
      const base = (extra, i, total) => ({
        id: total > 1 ? `${agora}-${i}` : String(agora),
        ...config.montar(fields),
        ...extra,
        criadoEm,
      });

      let novosItens;
      const separadas = colecao === 'fotos' && (campoTexto(fields, 'modo') || 'separadas') === 'separadas';
      if (separadas && urls.length > 1) {
        // uma memória para cada foto (mesmo título/data/local/frase)
        novosItens = urls.map((u, i) => base({ img: u, imgs: [u] }, i, urls.length));
      } else if (urls.length > 0) {
        // uma memória com todas as fotos juntas
        novosItens = [base({ img: urls[0], imgs: urls }, 0, 1)];
      } else {
        novosItens = [base({}, 0, 1)];
      }

      const lista = await lerManifesto(config.manifesto, config.padrao || []);
      if (config.novosNo === 'fim') lista.push(...novosItens); else lista.unshift(...novosItens);
      await salvarManifesto(config.manifesto, lista);

      return res.status(200).json({ ok: true, itens: novosItens, item: novosItens[0], lista });
    }

    if (req.method === 'PUT') {
      // Editar um item existente (textos e/ou fotos). Fotos novas já foram enviadas
      // por /api/upload; o campo "imagens" traz a lista FINAL de links (as que ficam + as novas).
      const form = formidable({ maxFileSize: 1024 * 1024, allowEmptyFiles: true, minFileSize: 0 });
      let fields;
      try {
        [fields] = await form.parse(req);
      } catch (erro) {
        return res.status(400).json({ erro: 'Não consegui ler o formulário enviado: ' + erro.message });
      }

      const colecao = campoTexto(fields, 'colecao');
      const config = COLECOES[colecao];
      if (!config) return res.status(400).json({ erro: 'Coleção inválida: ' + colecao });
      if (config.tipo === 'unico') return res.status(400).json({ erro: 'Esta seção é editada salvando o formulário diretamente.' });
      if (!senhaValida(campoTexto(fields, 'senha'))) return res.status(401).json({ erro: 'Senha incorreta.' });

      const id = campoTexto(fields, 'id');
      if (!id) return res.status(400).json({ erro: 'Informe o id do item a editar.' });

      const lista = await lerManifesto(config.manifesto, config.padrao || []);
      const posicao = lista.findIndex((m) => m.id === id);
      if (posicao === -1) return res.status(404).json({ erro: 'Item não encontrado.' });
      const antigo = lista[posicao];
      const fotosAntigas = [...new Set([antigo.img, ...(Array.isArray(antigo.imgs) ? antigo.imgs : [])].filter(Boolean))];

      let urls = fotosAntigas;
      if (config.permiteFoto && fields.imagens !== undefined) {
        try {
          const bruto = JSON.parse(campoTexto(fields, 'imagens') || '[]');
          if (!Array.isArray(bruto)) throw new Error('formato');
          urls = bruto.filter((u) => typeof u === 'string' && u.startsWith('https://')).slice(0, 40);
        } catch (erro) {
          return res.status(400).json({ erro: 'Lista de fotos inválida.' });
        }
      }
      if (!config.permiteFoto) urls = [];

      const atualizado = {
        id: antigo.id,
        ...config.montar(fields),
        ...(urls.length > 0 ? { img: urls[0], imgs: urls } : {}),
        criadoEm: antigo.criadoEm,
        atualizadoEm: new Date().toISOString(),
      };
      lista[posicao] = atualizado;
      await salvarManifesto(config.manifesto, lista);

      // fotos que saíram da memória são apagadas do armazenamento
      const removidas = fotosAntigas.filter((u) => !urls.includes(u));
      if (removidas.length > 0) {
        try { await del(removidas); } catch (erro) { console.error('Aviso: não consegui apagar fotos removidas:', erro); }
      }

      return res.status(200).json({ ok: true, item: atualizado, lista });
    }

    if (req.method === 'DELETE') {
      const id = parametros.get('id');
      const senha = parametros.get('senha');
      const colecao = parametros.get('colecao');
      const apagarTudo = parametros.get('tudo') === '1';
      const config = COLECOES[colecao];
      if (!config) return res.status(400).json({ erro: 'Coleção inválida: ' + colecao });
      if (config.tipo === 'unico') return res.status(400).json({ erro: 'Esta seção não tem itens para remover individualmente.' });
      if (!senhaValida(senha)) return res.status(401).json({ erro: 'Senha incorreta.' });
      if (!id && !apagarTudo) return res.status(400).json({ erro: 'Informe o id do item a remover.' });

      const lista = await lerManifesto(config.manifesto, config.padrao || []);
      const alvos = apagarTudo ? lista : lista.filter((m) => m.id === id);
      if (!apagarTudo && alvos.length === 0) return res.status(404).json({ erro: 'Item não encontrado.' });

      // apaga todas as fotos dos itens removidos (a principal + as extras)
      const arquivos = [...new Set(alvos.flatMap((it) => [it.img, ...(Array.isArray(it.imgs) ? it.imgs : [])]).filter(Boolean))];
      if (arquivos.length > 0) {
        try { await del(arquivos); } catch (erro) { console.error('Aviso: não consegui apagar as fotos:', erro); }
      }

      const restantes = apagarTudo ? [] : lista.filter((m) => m.id !== id);
      await salvarManifesto(config.manifesto, restantes);

      return res.status(200).json({ ok: true, lista: restantes });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (erroInesperado) {
    // Rede de segurança: qualquer erro que escapou dos blocos acima agora
    // volta como um JSON legível, em vez de um 500 mudo no navegador.
    console.error('Erro inesperado em /api/dados:', erroInesperado);
    return res.status(500).json({ erro: 'Erro interno: ' + (erroInesperado && erroInesperado.message ? erroInesperado.message : 'desconhecido') });
  }
}
