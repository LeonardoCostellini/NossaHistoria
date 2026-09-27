# Nossa História

Site de aniversário com álbum, linha do tempo, calendário, carta, "coisas
que amo em você" e planos futuros — tudo editável direto pelo navegador em
`/admin`, sem precisar mexer em código.

## Login do admin

Ao abrir `/admin`, você digita a `ADMIN_PASSWORD` (a mesma variável de
ambiente configurada na Vercel) uma única vez. Ela fica guardada só nessa
aba do navegador (`sessionStorage`) até você clicar em "sair" ou fechar a
aba — os formulários não pedem mais senha individualmente.

## O que dá para editar pelo /admin

- 📸 **Álbum** — fotos, com título, data, local, frase e tags
- 🕰️ **Linha do tempo** — os momentos do relacionamento, com foto opcional
- 📅 **Calendário** — próximos eventos, com data, status e categoria
- 💌 **Carta** — o texto da carta de amor e a assinatura
- 💗 **Sobre vocês** — os cartões que viram ("coisas que amo em você")
- 🎯 **Planos** — sonhos e planos futuros, com status (queremos / marcado / já fizemos)
- ⚙️ **Configurações** — nome dela, seu nome, data de início e data comemorativa

Álbum, linha do tempo, calendário, "sobre vocês" e planos são **listas**
(adiciona quantos itens quiser, remove um por um). Carta e Configurações
são um **valor único** — salvar substitui o que já existia.

## O conteúdo padrão agora é editável de verdade

Antes, os itens que já vinham prontos (a linha do tempo, o calendário, a
carta, etc.) só existiam como texto fixo no código — aaparecia no site, mas
não dava para editar ou apagar pelo `/admin`. Agora esse conteúdo padrão
mora dentro da própria API (`api/dados.js`): na primeira vez que você abrir
cada aba do admin, os itens padrão já aparecem lá, prontos para editar ou
remover. Assim que você salvar qualquer alteração naquela seção, o padrão
"vira" o seu conteúdo de verdade a partir dali.

## Dudu e Bubu por toda parte

Além da linha do tempo, agora o Dudu e a Bubu aparecem intercalados também
no álbum, no calendário, nos cartões de "sobre vocês" e nos planos — cada
item alterna entre os dois. Tocar no selinho toca o mesmo som de "boop" dos
outros lugares.

## O que ainda é só código

Os caminhos dos arquivos de imagem e áudio (ilustração do casal, do Dudu, da
Bubu, a música de fundo) continuam fixos no objeto `ATIVOS`, no topo do
`<script>` de `public/index.html` — trocar esses arquivos é manual, direto
na pasta `public/assets/`.

## Sons

Efeitos sonoros (página virando, tilintar ao revelar cada memória, abrir
envelope, virar cartão, easter egg, comemoração no dia 07/10/2026) são
gerados na hora, direto no navegador — sem nenhum arquivo de música, sem
risco de direitos autorais. Controlados pelo botão 🔈/🔊 e pelo volume no
topo do site. A música ambiente de fundo é opcional: coloque um arquivo em
`public/assets/audio/fundo.mp3` se quiser.

## Personagens

A ilustração usada é original — não é a arte licenciada de Bubu e Dudu, de
Huang Xiao B. Na tela de abertura e na linha do tempo, o site usa as
imagens reais que você forneceu, com o fundo removido, guardadas em
`public/assets/bubu-dudu/`.

## Como está organizado por trás

```
nossa-historia/
├── api/
│   ├── dados.js          <- API para as coleções (fotos, momentos, eventos, coisas, planos, config, carta)
│   └── login.js          <- verifica a senha para liberar o /admin
├── public/
│   ├── index.html         <- o site
│   ├── admin.html          <- área administrativa (login + 7 abas)
│   └── assets/
├── package.json
├── vercel.json            <- URLs limpas (sem .html)
└── README.md
```

Cada coleção vira um arquivo JSON no Vercel Blob (as fotos também ficam lá,
como arquivo de imagem). O site principal busca esses dados ao carregar; se
a API não responder (por exemplo, se você abrir o `index.html` direto, sem
servidor), o site mostra alguns exemplos fixos no lugar, só para não ficar
vazio.

## Configuração e deploy (resumo)

1. `npm install`
2. Conecte o projeto à Vercel (CLI ou GitHub) e ative **Storage → Blob**
   (isso cria a variável `BLOB_READ_WRITE_TOKEN` sozinho).
3. Em **Settings → Environment Variables**, adicione `ADMIN_PASSWORD` com a
   senha que só vocês dois vão usar.
4. Publique (`vercel --prod` ou push no GitHub conectado).
5. Acesse `seuprojeto.vercel.app/admin` para preencher tudo pela primeira vez.

## Se algo não salvar (erro 500)

A API sempre devolve o motivo do erro na aba **Network** do navegador
(clique na requisição `dados` → aba **Response**). As causas mais comuns:

- **Storage → Blob não foi ativado** no projeto da Vercel (passo 2 acima).
- **`ADMIN_PASSWORD` não configurada**, ou configurada depois do último
  deploy (variáveis de ambiente só valem a partir do próximo deploy).

Se o erro continuar sem explicação clara, veja o log de verdade em
**Vercel → seu projeto → Deployments → clique no deploy mais recente →
Logs (ou "Runtime Logs")**.
