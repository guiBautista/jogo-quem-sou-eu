# Quem sou eu?

Jogo multiplayer "Quem sou eu?" (aquele de colar o papel na testa) como SPA
mobile-first, **100% client-side**. Não há backend próprio: o estado do jogo vive
no navegador do host e é sincronizado via **WebRTC P2P** com o PeerJS.

Jogue em **https://guibautista.github.io/jogo-quem-sou-eu/**

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173 (--host para testar no celular na mesma rede)
npm run build    # gera dist/ — pode ir para qualquer hospedagem estática
```

> O WebRTC exige contexto seguro: em produção sirva por **HTTPS** (`localhost` é
> exceção). Sem isso o navegador bloqueia a conexão P2P.

Todo push na `main` publica sozinho no GitHub Pages
(`.github/workflows/deploy.yml`). Como o site fica em um subcaminho, o `base` do
Vite recebe `/jogo-quem-sou-eu/` **só no build** — em dev continua na raiz, para
o endereço de teste no celular ficar curto.

## Como o jogo funciona

1. **Lobby** — alguém cria a sala e vira o host; os outros entram com o código de
   5 caracteres (ou pelo link `?sala=CODIGO`). Mínimo de 2 jogadores.
2. **Escolha secreta** — sorteio circular: A escreve o personagem de B, B o de C,
   C o de A. Ninguém escreve para si mesmo. Opcionalmente dá para anexar uma
   imagem: o botão busca o nome digitado e oferece 3 opções para escolher uma.
3. **Jogo na testa** — cada aparelho mostra em letras gigantes o personagem *do
   próprio dono* (com a imagem acima, se alguém tiver escolhido uma), para os
   outros lerem. O app **não controla turno**: com o
   celular na testa ninguém consegue ficar apertando "próximo", então o
   revezamento das perguntas acontece na conversa. A única ação é o botão
   "Acertei!", e a ordem em que cada um aperta define a pontuação.
4. **Resultado** — pontos por ordem de acerto (1º +4, 2º +3, 3º +2, demais +1),
   pódio e placar acumulado. O host inicia a próxima rodada mantendo o placar.

## Arquitetura de rede (star topology)

```
              ┌──────── DataConnection ────────┐
   CLIENT ────┤                                ├──── HOST (source of truth)
   CLIENT ────┤   ação JSON  →                 │      • processa a regra
   CLIENT ────┘            ←  broadcast estado │      • faz broadcast do estado
```

- O host registra um Peer com id `qsemu-<CÓDIGO>`, então o código da sala é o
  próprio endereço de conexão — não existe diretório de salas em lugar nenhum.
- Clientes **nunca** decidem nada: mandam intenções (`got_it`,
  `submit_character`) e renderizam o estado que o host devolve.
- Sinalização pelo servidor público do PeerJS; a mídia/dados vão direto entre os
  navegadores (STUN do Google/Twilio para atravessar NAT).

### Detecção de queda

O PeerJS não avisa de forma confiável quando a outra ponta some (aba fechada,
tela bloqueada, rede caiu), o que travaria a rodada esperando alguém que já foi
embora. Por isso existe um heartbeat nos dois sentidos (`src/net/protocol.js`):

- cliente manda `ping` a cada 3s; o host responde `pong`;
- o host derruba quem ficar 10s calado e reprocessa a rodada — se o ausente devia
  um personagem, entra um placeholder para a fase não emperrar;
- o cliente que ficar 14s sem notícia do host cai na tela de erro.

Quem cai continua no placar e **reassume o próprio slot ao voltar com o mesmo
nome**, inclusive no meio da partida.

## Estrutura

```
src/
  App.jsx                 roteamento por fase do jogo
  game/logic.js           regras puras (só o host executa) — sem React, testável
  net/protocol.js         tipos de mensagem, códigos de erro, constantes
  net/imageSearch.js      busca de imagens na Wikimedia (sem chave, com CORS)
  net/useGameNet.js       PeerJS: host, cliente, heartbeat, broadcast
  hooks/useWakeLock.js    Screen Wake Lock API (tela não apaga durante a partida)
  components/             telas: Home, Lobby, Writing, Playing, Results, Error
```

### Busca de imagens

Num app 100% client-side não existe chave de API secreta — qualquer credencial no
código ficaria visível no devtools, e a cota seria do dono do site. Por isso a
busca usa a API da Wikimedia, que é gratuita, não pede chave e responde com
`access-control-allow-origin: *`. A Wikipédia em português acerta bem personagens
e pessoas; quando não devolve nada, o Commons entra como reserva.

Só a **URL** trafega pelo WebRTC (uma string curta) — cada aparelho carrega a
imagem direto da Wikimedia, então nenhum byte de imagem passa pelo P2P.

A URL é validada **duas vezes**, e as duas importam. O host confere antes de
repassar, para um cliente adulterado não conseguir apontar o navegador da sala
para um endereço qualquer. E quem renderiza confere de novo, porque o host
também é só outro jogador: sem essa segunda checagem, quem cria a sala poderia
transmitir uma URL arbitrária e coletar o IP de todo mundo. Só passa `https` em
`*.wikimedia.org`. Se a imagem não carregar na hora do jogo, a tela cai para só
o nome.

## Notas de implementação

- **Wake Lock** é reativado quando a aba volta a ficar visível (o SO solta o lock
  ao trocar de app). Se o navegador negar, o jogo segue normalmente — o indicador
  no topo mostra se está ativo.
- A tela de jogo usa `100dvh` + `overflow-hidden` e as áreas seguras do iOS, para
  não ter scroll com o celular na testa. O botão "Acertei!" ocupa toda a largura
  e tem alvo de toque generoso, para ser achado sem procurar.
- O estado da rodada é só `remaining` + `finishOrder`: quem ainda não descobriu e
  a ordem de chegada. Não há índice de turno para dessincronizar.
- O nome do jogador fica em `localStorage` só para pré-preencher o formulário.
