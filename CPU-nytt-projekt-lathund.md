# CPU - lathund för ett nytt projekt

Context-Pulse-UI - från tomt repo till inkrementell utveckling

Grundprincip: projektets GitHub-repo är source of truth för den konkreta modellen och implementationen. `cpu-model/devmodel` är source of truth för generell CPU-metodik.

> Codex-prompten beskriver uppdraget. Repot beskriver hur arbetet ska utföras.

## 1. Skapa projektet

Skapa ett repo i `cpu-model`, exempelvis `cpu-model/min-app`. Normal utveckling sker på `main`. Branch/PR/merge används bara när du uttryckligen begär det. Du gör normalt commit och push efter att ett inkrement är granskat.

```sh
mkdir -p /Users/lehswe/codex-projects/CPU
cd /Users/lehswe/codex-projects/CPU
git clone git@github.com:cpu-model/min-app.git
cd min-app
```

## 2. Installera CPU-metodiken

Installera aktuell normativ version från `cpu-model/devmodel`. Hårdkoda inte en gammal SHA från denna lathund. Installationen ger projektet en installerad/pinnad `CPU/`-kopia av metodik, specifikationer, verktyg och tester samt ett installer-managed block i root `AGENTS.md`. Installera därefter dependencies i CPU-katalogen och kör CPU-testsuiten.

## 3. ChatGPT Project

Använd normalt ett ChatGPT Project per CPU-projekt. Projektinstruktionerna ska vara korta och främst ange vilket repo som är source of truth samt verkligt projektspecifika regler. Duplicera inte generell CPU-metodik i ChatGPT-instruktionerna.

Minimal rekommenderad projektinstruktion:

```text
Det normativa projekt-repot är cpu-model/min-app.

GitHub-repot är source of truth för den aktuella CPU-modellen. Läs alltid aktuell modell och
repositoryts instruktioner från GitHub före modellarbete; rekonstruera inte aktuellt
tillstånd från chattminne.

cpu-model/devmodel är source of truth för den generella CPU-metodiken.

När instruktioner till Codex behövs ska de ges som ett enda komplett kopierbart fragment.
```

Femfilsmodell, valideringsregler, Git-flöde och Codex arbetsgräns ska normalt inte kopieras hit. De hör hemma i repots `AGENTS.md` och installerade CPU-styrdokument.

## 4. Chattar

Använd en uppstartschatt för första modellen och första inkrementet. Därefter normalt en ny chatt per inkrement. ChatGPT läser aktuell repo-state före modellarbete. GitHub-state, inte chatthistoriken, är det bestående resultatet.

## 5. Codex: självinstruerande repo

Öppna den permanenta lokala repokatalogen i Codex. Codex läser root `AGENTS.md` och installerad CPU-metodik. Uppdragsprompten ska därför normalt bara beskriva önskat resultat.

```text
Implementera aktuell CPU-modell.

Gör projektet bygg- och körbart enligt den aktuella CPU-modellen.
```

Du ska normalt inte upprepa instruktioner om att läsa modellfiler, inventera implementationen, följa `deployment.yaml`, inte gissa, bygga, testa, CPU-validera, jämföra implementationen tillbaka mot modellen, undvika Git-administration eller rapportera resultatet. Det är generell arbetsmetod som repot ska bära.

Om samma arbetsregel måste upprepas i Codex-prompter är det i första hand ett gap i devmodel eller projektets styrdokument - inte en anledning att skapa en längre promptmall.

## 6. Codex arbetsgräns

Codex får normalt göra säker `git pull`, implementera, bygga, testa, strict-validera och felsöka. Vid konflikt eller oväntade lokala tracked ändringar ska Codex stoppa och rapportera. Codex ska normalt inte branch:a, stage:a, committa, pusha, skapa PR eller merge:a. Användaren gör normalt commit och push.

## 7. Behövs Work?

Inte för normal CPU-utveckling. Huvudvägen är ChatGPT Project + projektchattar + Codex mot permanent lokal klon. Work är användbart för större avgränsade leveransjobb, exempelvis omfattande analys eller dokumentproduktion.

## 8. Normal arbetssekvens

| # | Steg | Resultat |
|---:|---|---|
| 1 | Skapa GitHub-repo | `cpu-model/<projekt>` |
| 2 | Klona lokalt | permanent arbetskopia |
| 3 | Installera CPU | aktuell `cpu-model/devmodel` |
| 4 | Skapa ChatGPT Project | korta projektspecifika instruktioner |
| 5 | Modellera | Context -> Pulse -> UI -> Deployment -> requirements |
| 6 | Definiera inkrement | önskat resultat och scope |
| 7 | Ge Codex uppdraget | kort resultatbeskrivning |
| 8 | Codex exekverar | repo-regler styr arbetssättet |
| 9 | Granska | modell/implementation/test/validation |
| 10 | Acceptera | du commit + push |
| 11 | Nästa inkrement | ny ChatGPT-chatt |

## 9. Vad är normativt var?

- `cpu-model/devmodel`: generell metodik, format, workflow, Visual Language, installer och verktyg.
- `cpu-model/<projekt>`: konkret modell, projektspecifika instruktioner och implementation.
- Lokal klon: arbetsyta, inte separat källa till sanning.
- Codex-prompt: det aktuella uppdraget, inte en kopia av arbetsmetoden.
