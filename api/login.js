// api/login.js
//
// Verifica a senha da área administrativa (a mesma ADMIN_PASSWORD usada para
// salvar/remover conteúdo). Não cria sessão nem cookie — o admin.html guarda
// a senha em sessionStorage (só nesta aba, some ao fechar) e a reenvia em
// cada ação, exatamente como já acontecia antes; isso só evita ter que
// digitá-la em cada formulário.
//
//   GET /api/login?senha=XXXX  -> { ok: true } ou { ok: false }

export default function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const senha = url.searchParams.get('senha') || '';
    const ok = Boolean(process.env.ADMIN_PASSWORD) && senha === process.env.ADMIN_PASSWORD;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok });
  } catch (erro) {
    return res.status(500).json({ ok: false, erro: 'Erro interno: ' + erro.message });
  }
}
