# Nossa História — com álbum de verdade

Agora o site tem uma área administrativa (`/admin.html`) para vocês dois
adicionarem e removerem fotos do álbum diretamente pelo navegador, com
título, data, local, frase e tags. As fotos ficam guardadas no **Vercel
Blob** (armazenamento de arquivos da própria Vercel, com plano gratuito).

Por causa disso, o site deixou de ser um arquivo único que abre com duplo
clique — agora ele tem uma pequena parte de servidor (a pasta `api/`) e
precisa rodar via Vercel (localmente com `vercel dev`, ou já publicado).

---

## 1. Instalar as dependências

```bash
npm install
```

## 2. Criar o projeto na Vercel e ativar o armazenamento de fotos

1. Crie uma conta gratuita em vercel.com, se ainda não tiver.
2. Instale a CLI: `npm i -g vercel`
3. Dentro da pasta do projeto, rode `vercel link` (ou apenas `vercel`, que
   cria o projeto no primeiro deploy).
4. No painel da Vercel, abra o projeto → aba **Storage** → **Create
   Database** → escolha **Blob** → conecte ao projeto.
   Isso cria automaticamente a variável `BLOB_READ_WRITE_TOKEN` — você não
   precisa copiar nada manualmente.
5. Ainda no painel, vá em **Settings → Environment Variables** e adicione:
   - `ADMIN_PASSWORD` → a senha que só vocês dois vão saber, usada para
     adicionar/remover fotos em `/admin.html`.

## 3. Testar localmente (opcional, mas recomendado)

```bash
vercel env pull .env.local   # baixa as variáveis (token do Blob + senha) para testar local
vercel dev                   # sobe o site localmente com a API funcionando de verdade
```

Abra `http://localhost:3000` — o álbum vai carregar de verdade e
`http://localhost:3000/admin.html` já vai conseguir salvar fotos.

> Se você só abrir `public/index.html` no navegador (duplo clique), a API
> não vai existir e o álbum mostra as fotos de exemplo (fallback) — é
> esperado, não é erro.

## 4. Publicar

```bash
vercel --prod
```

Você recebe um link tipo `seuprojeto.vercel.app` — pode enviar direto pra ela.
Sempre que quiser atualizar o texto da carta, da timeline, do calendário etc.
(que continuam sendo editados no código, dentro de `public/index.html`),
rode `vercel --prod` de novo depois de salvar as mudanças.

---

## Como usar a área administrativa

Acesse `seuprojeto.vercel.app/admin.html`:

- **Adicionar memória**: escolha a foto, escreva título, data, local, frase
  e tags (separadas por vírgula), digite a senha (`ADMIN_PASSWORD`) e
  salve. A foto aparece no álbum do site principal na hora.
- **Remover memória**: na lista de memórias salvas, digite a senha no
  campo indicado e clique em "remover" ao lado da foto desejada.

Não existe login com usuário — é só a senha compartilhada entre vocês dois,
pensado para um site privado de uso pessoal.

---

## O que ainda é editado direto no código

Por enquanto, só o **álbum de fotos** tem interface própria de admin.
As outras seções continuam sendo dados fixos, editáveis no topo do
`<script>` dentro de `public/index.html`:

- `CONFIG` → nomes, datas
- `MEMORIAS_TIMELINE` → linha do tempo
- `EVENTOS_CALENDARIO` → calendário de próximos momentos
- `CARTA_TEXTO` / `CARTA_ASSINATURA` → carta de amor
- `COISAS_QUE_AMO` → cartões que viram
- `PLANOS_FUTUROS` → planos e sonhos

Se um dia vocês quiserem editar essas seções também pelo `/admin.html`,
dá para estender a mesma rota `api/photos.js` (ou criar rotas irmãs, como
`api/eventos.js`, `api/planos.js`) seguindo exatamente o mesmo padrão:
um manifesto JSON guardado no Blob, lido pelo site e editado pela área
administrativa.

## Sobre os personagens (Bubu e Dudu)

A imagem do casal usada na tela de abertura é a que você enviou como
referência — mantive ela em `public/assets/bubu-dudu/casal-bubu-dudu.png`.
Como são personagens de uma marca licenciada, não gerei novas ilustrações
deles; se precisar de mais imagens, use outras que vocês já possuam,
salvando no mesmo lugar.

## Privacidade

O link do site (e do `/admin.html`) é público para quem tiver o endereço
exato — não aparece em buscadores, mas não é protegido por senha geral
(só a ação de adicionar/remover fotos exige senha). Se quiser mais
privacidade, dá para ativar a proteção por senha de todo o site nas
configurações da Vercel (recurso disponível em planos pagos).
"# NossaHistoria" 
