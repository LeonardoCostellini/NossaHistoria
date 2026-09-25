# Nossa História

Site de aniversário com álbum de fotos, linha do tempo e calendário — todos
editáveis direto pelo navegador, em `/admin.html`, sem precisar mexer em código.

## O que tem agora

- **Sons**: efeitos sonoros (som de página virando, tilintar ao revelar cada
  memória da timeline, abrir envelope, virar cartão, encontrar um easter egg,
  comemoração no dia 07/10/2026) são gerados na hora, direto no navegador —
  não usam nenhum arquivo de música, então não têm risco de direitos autorais
  e sempre funcionam. Tudo isso é controlado pelo botão 🔈/🔊 e pelo controle
  de volume no topo do site.
  A **música ambiente de fundo** continua sendo opcional: se você colocar um
  arquivo em `public/assets/audio/fundo.mp3` (sua própria música ou algo
  royalty-free), ela toca também; se não colocar, o site simplesmente não
  toca música de fundo, sem quebrar nada.
- **Personagens**: a ilustração usada é original (não é a arte licenciada de
  Bubu e Dudu, de Huang Xiao B — isso eu não posso reproduzir). Na tela de
  abertura, o site usa a imagem real que você enviou como referência,
  guardada em `public/assets/bubu-dudu/casal-bubu-dudu.png`. Se preferir usar
  outras imagens que vocês já tenham os direitos de uso, é só trocar esse
  arquivo (mesmo nome) ou apontar `CONFIG.personagemCasalImg` para o novo.
- **Álbum, linha do tempo e calendário** agora são editados pela área
  administrativa (`/admin.html`), com três abas: 📸 Álbum, 🕰️ Linha do tempo,
  📅 Calendário. Cada aba permite adicionar e remover itens, com senha.

## Como está organizado por trás

```
nossa-historia/
├── api/dados.js         <- uma única API para as 3 coleções (fotos, momentos, eventos)
├── public/
│   ├── index.html        <- o site
│   ├── admin.html         <- área administrativa (3 abas)
│   └── assets/
├── package.json
└── README.md
```

Cada coleção (fotos / momentos / eventos) é salva como um arquivo JSON no
Vercel Blob, e as fotos (quando existem) também ficam no Blob como arquivo
de imagem. O site principal busca essas listas ao carregar; se a API não
responder (por exemplo, se você abrir o `index.html` direto, sem servidor),
o site mostra alguns exemplos fixos no lugar, só para não ficar vazio.

## Configuração e deploy (resumo)

1. `npm install`
2. Conecte o projeto à Vercel (CLI ou GitHub) e ative **Storage → Blob**
   (isso cria a variável `BLOB_READ_WRITE_TOKEN` sozinho).
3. Em **Settings → Environment Variables**, adicione `ADMIN_PASSWORD` com a
   senha que só vocês dois vão usar.
4. Publique (`vercel --prod` ou push no GitHub conectado).
5. Acesse `seuprojeto.vercel.app/admin.html` para começar a adicionar fotos,
   momentos e eventos.

## O que ainda é editado direto no código

Só nomes, datas gerais e os textos mais "fixos" continuam no topo do
`<script>` dentro de `public/index.html`:

- `CONFIG` → nomes, data de início e data comemorativa
- `CARTA_TEXTO` / `CARTA_ASSINATURA` → a carta de amor
- `COISAS_QUE_AMO` → os cartões que viram
- `PLANOS_FUTUROS` → planos e sonhos

Se um dia vocês quiserem editar essas partes também pelo `/admin.html`, dá
para estender `api/dados.js` com novas entradas em `COLECOES`, seguindo o
mesmo padrão usado para fotos/momentos/eventos.
