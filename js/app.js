/* PICK FIGHT FINAL v11 - real Gemini API judge integration */
document.addEventListener("DOMContentLoaded", () => {
    /* PICK FIGHT UI FIX v5 - final battle UI + game-style battle log card */
    /* =========================================================
    PICK FIGHT
    REAL AI BATTLE FLOW
    IMPORTANT
    - 라운드 판정은 /api/battle Gemini API 사용
    - 기존 UI / UX / HP / 공격 애니메이션 로직 유지
    ========================================================= */
    /* =========================================================
    DOM
    ========================================================= */
    const playerAInput = document.getElementById("playerA");
    const playerBInput = document.getElementById("playerB");
    const situationInput = document.getElementById("situation");
    const playerACard = document.querySelector(".player-card.player-a");
    const playerBCard = document.querySelector(".player-card.player-b");
    const situationBox = document.querySelector(".situation-box");
    const criteriaBox = document.querySelector(".criteria-box");
    const criteriaButtons = [
        ...document.querySelectorAll(".criteria-button")
    ];
    const customRuleInput = document.getElementById("customRuleInput");
    const addRuleButton = document.getElementById("addRuleButton");
    const selectedRulesList = document.getElementById("selectedRulesList");
    const ruleStatusText = document.getElementById("ruleStatusText");
    const ruleCount = document.getElementById("ruleCount");
    const fightButton = document.getElementById("fightButton");
    const formMessage = document.getElementById("formMessage");
    const battleResult = document.getElementById("battleResult");
    const battleLogList = document.getElementById("battleLogList");
    /* =========================================================
    CONFIG
    ========================================================= */
    const MAX_BASE_RULES = 3;
    const MAX_VISIBLE_RULES = 4;
    const ENTRY_DURATION = 5000;
    const VS_DURATION = 1800;
    const COUNT_DURATION = 800;
    const FIGHT_DURATION = 1000;
    /* =========================================================
    GLOBAL STATE
    ========================================================= */
    let selectedRules = [];
    let playerAConfirmed = false;
    let playerBConfirmed = false;
    /*
    경기 상태
    matchStarted:
    FIGHT 버튼을 누른 순간 true.
    NEW BATTLE 전까지 다시 false가 되지 않는다.
    matchCompleted:
    최종 판결이 나온 상태.
    */
    let matchStarted = false;
    let matchCompleted = false;
    let battleRunning = false;
    /*
    추가 결판 RULE 선택 모드
    */
    let deathMatchRuleMode = false;
    let deathMatchRule = "";
    /*
    현재 진행 중인 단 한 경기
    */
    let activeBattle = null;
    /*
    ENTRY SKIP 상태
    */
    let introSkipRequested = false;
    /* =========================================================
    CHARACTER SELECT / BATTLE LOG VIEW STATE
    ========================================================= */
    const CHARACTER_SPRITES = [
        "#sprite-pink",
        "#sprite-cream-bear",
        "#sprite-purple-cat",
        "#sprite-mint-bunny",
        "#sprite-orange",
        "#sprite-yellow-bee",
        "#sprite-blue-robot",
        "#sprite-green"
    ];
    const CHARACTER_THEMES = [
        { soft: "#f9d8e5", accent: "#d46791", deep: "#7f3f5a", entry1: "#2c2238", entry2: "#694057", entry3: "#a96f86" },
        { soft: "#f2dfc5", accent: "#b98958", deep: "#694d35", entry1: "#2d2834", entry2: "#695748", entry3: "#9e8265" },
        { soft: "#e6dcfb", accent: "#806db1", deep: "#57447e", entry1: "#29243d", entry2: "#514573", entry3: "#8f7db7" },
        { soft: "#d8efe5", accent: "#69aa91", deep: "#376b59", entry1: "#22343a", entry2: "#3f7064", entry3: "#75aa98" },
        { soft: "#f8dcc8", accent: "#cf8055", deep: "#7d5037", entry1: "#342936", entry2: "#79503f", entry3: "#b77b5c" },
        { soft: "#f7e8a8", accent: "#c8aa43", deep: "#6f5c20", entry1: "#2b2932", entry2: "#5c5435", entry3: "#9f8d4b" },
        { soft: "#d8eaf7", accent: "#6192b8", deep: "#365f7e", entry1: "#22303c", entry2: "#3f6680", entry3: "#6f9db8" },
        { soft: "#dfeacd", accent: "#7aa063", deep: "#48683a", entry1: "#27332f", entry2: "#536d48", entry3: "#819d6c" }
    ];
    let playerACharacterIndex = 0;
    let playerBCharacterIndex = 2;
    let battleLogs = [];
    let battleLogViewMode = "card";
    let battleLogSearchTerm = "";
    let battleLogCursor = 0;
    /* =========================================================
    UTIL
    ========================================================= */
    const sleep = (ms) =>
        new Promise(resolve => setTimeout(resolve, ms));
    function normalizeText(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ");
    }
    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
    function hashString(value) {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = (
                (hash * 31)
                + value.charCodeAt(i)
            ) >>> 0;
        }
        return hash;
    }
    async function waitIntro(ms) {
        const step = 50;
        let elapsed = 0;
        while (
            elapsed < ms
            && !introSkipRequested
        ) {
            await sleep(step);
            elapsed += step;
        }
    }
    function showMessage(text, type = "info") {
        if (!formMessage) return;
        formMessage.textContent = text;
        formMessage.classList.remove(
            "message-error",
            "message-success",
            "message-info"
        );
        formMessage.classList.add(
            `message-${type}`
        );
    }
    function clearMessage() {
        if (!formMessage) return;
        formMessage.textContent = "";
        formMessage.classList.remove(
            "message-error",
            "message-success",
            "message-info"
        );
    }
    /* =========================================================
    STYLE
    ========================================================= */
    function installStyles() {
        const oldStyle = document.getElementById(
            "pickFightCompleteStyles"
        );
        if (oldStyle) {
            oldStyle.remove();
        }
        const style = document.createElement("style");
        style.id = "pickFightCompleteStyles";
        style.textContent = `
/* =================================================
FONT
================================================= */
.pf-status-badge,
.pf-entry-card,
.pf-rule-focus,
.pf-judge-card,
.pf-action-btn,
.pf-final-judgement,
.pf-final-pick,
.pf-death-rule-guide,
.pf-death-control-box {
font-family:
"Galmuri11",
"Galmuri",
sans-serif;
}
/* =================================================
STATUS BADGES
================================================= */
.player-card,
.situation-box,
.criteria-box {
position: relative;
}
.pf-status-badge {
position: absolute;
top: 12px;
right: 12px;
min-width: 118px;
padding: 8px 12px;
border: 2px solid #453b50;
background: #f8f1df;
color: #453b50;
box-shadow:
3px 3px 0 #453b50;
font-family:
"Galmuri11",
sans-serif;
font-size: .92rem;
font-weight: 700;
text-align: center;
z-index: 20;
}
.pf-badge-required {
background: #f5d8e1;
color: #984764;
}
.pf-badge-typing {
background: #f1e0ad;
color: #796025;
}
.pf-badge-ready {
background: #cfe2fb;
color: #315f94;
}
.pf-badge-optional {
background: #ebe7e1;
color: #736c78;
}
.pf-badge-context {
background: #d1e8da;
color: #496f5a;
}
.pf-badge-over {
background: #f0bcc7;
color: #93364c;
}
/* =================================================
READY CARD
================================================= */
.player-card.player-a-ready {
border-color:
#ca6a91 !important;
background:
linear-gradient(
180deg,
#fff8fb 0%,
#ffe1ec 100%
) !important;
box-shadow:
0 0 0 3px rgba(202,106,145,.14),
6px 6px 0 #ca6a91 !important;
}
.player-card.player-b-ready {
border-color:
#7b6bbb !important;
background:
linear-gradient(
180deg,
#fcfaff 0%,
#e6ddff 100%
) !important;
box-shadow:
0 0 0 3px rgba(123,107,187,.14),
6px 6px 0 #7b6bbb !important;
}
.pf-input-locked {
opacity: .62;
filter: grayscale(.2);
}
/* =================================================
BASE RULE OVER LIMIT
================================================= */
.selected-rule-item.rule-over-item {
border-color:
#b34a5e !important;
background:
#fde7eb !important;
animation:
pfRuleShake
.35s
steps(2);
}
/* =================================================
DEATH MATCH RULE MODE
================================================= */
.pf-death-rule-guide {
margin:
16px 0;
padding:
18px;
border:
3px solid #806896;
background:
#f0e9f7;
color:
#514262;
box-shadow:
4px 4px 0 #806896;
text-align: center;
line-height: 1.65;
}
.pf-death-rule-guide strong {
display: block;
margin-bottom: 7px;
color:
#994667;
font-family:
"Press Start 2P",
cursive;
font-size: .58rem;
line-height: 1.9;
}
.criteria-button.pf-used-rule {
opacity:
.38 !important;
filter:
grayscale(1);
cursor:
not-allowed !important;
pointer-events:
none !important;
transform:
none !important;
}
.criteria-button.pf-used-rule::after {
content:
"사용 완료";
display:
block;
margin-top:
5px;
font-family:
"Galmuri11",
sans-serif;
font-size:
.73rem;
font-weight:
700;
}
.pf-sudden-selected {
margin-top:
12px;
padding:
13px 15px;
border:
3px solid #9b4568;
background:
#f9d9e5;
color:
#6b3c50;
box-shadow:
4px 4px 0 #9b4568;
font-family:
"Galmuri11",
sans-serif;
font-weight:
700;
text-align:
center;
}
.pf-death-control-box {
margin-top:
16px;
padding:
16px;
border:
3px solid #45364e;
background:
#fff6ea;
box-shadow:
5px 5px 0 #45364e;
text-align:
center;
}
.pf-death-control-title {
margin:
0 0 6px;
color:
#974364;
font-family:
"Press Start 2P",
cursive;
font-size:
.54rem;
line-height:
1.9;
}
.pf-death-control-copy {
margin:
0 0 13px;
color:
#514655;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
line-height:
1.55;
}
.pf-death-go-button {
width:
min(540px, 100%);
min-height:
72px;
padding:
17px 22px;
border:
4px solid #45364e;
background:
#f6c9d9;
color:
#953d61;
box-shadow:
6px 6px 0 #45364e;
font-family:
"Press Start 2P",
cursive;
font-size:
clamp(.62rem, 1.3vw, .82rem);
font-weight:
700;
line-height:
1.8;
cursor:
pointer;
}
.pf-death-go-button:disabled {
opacity:
.4;
filter:
grayscale(.7);
cursor:
not-allowed;
}
.pf-death-go-button:not(:disabled) {
animation:
pfFightReady
.9s
steps(2)
infinite;
}
/* =================================================
MAIN FIGHT
================================================= */
#fightButton:disabled {
opacity:
.42;
filter:
grayscale(.65);
pointer-events:
none;
cursor:
not-allowed;
}
#fightButton.pf-fight-ready {
animation:
pfFightReady
.9s
steps(2)
infinite;
}
/* =================================================
SCENE
================================================= */
.pf-scene {
position:
relative;
width:
100%;
overflow:
hidden;
border:
4px solid #30283d;
background:
linear-gradient(
180deg,
#24213d,
#393457
);
box-shadow:
8px 8px 0 #30283d;
color:
#fff;
}
.pf-scene::before {
content:
"";
position:
absolute;
inset:
0;
background-image:
radial-gradient(
rgba(255,255,255,.18)
1px,
transparent
1px
);
background-size:
16px 16px;
opacity:
.13;
pointer-events:
none;
}
.pf-scene-topbar {
position:
relative;
z-index:
30;
display:
flex;
justify-content:
space-between;
align-items:
center;
gap:
10px;
padding:
12px;
}
.pf-scene-status {
padding:
8px 11px;
border:
2px solid #fff8e2;
background:
#312d4d;
color:
#fff8e2;
box-shadow:
3px 3px 0 #171421;
font-family:
"Press Start 2P",
cursive;
font-size:
.46rem;
line-height:
1.8;
}
/* =================================================
ENTRY SKIP
================================================= */
.pf-entry-skip {
padding:
9px 12px;
border:
2px solid #fff8e3;
background:
#ddd4ef;
color:
#574a70;
box-shadow:
3px 3px 0 #171421;
font-family:
"Press Start 2P",
cursive;
font-size:
.44rem;
line-height:
1.8;
cursor:
pointer;
}
.pf-entry-skip:hover {
background:
#f1d3df;
}
.pf-entry-skip:active {
transform:
translate(2px,2px);
box-shadow:
1px 1px 0 #171421;
}
.pf-stage {
position:
relative;
z-index:
3;
min-height:
590px;
padding:
8px 18px 20px;
}
/* =================================================
ENTRY
================================================= */
.pf-entry-screen {
min-height:
525px;
display:
grid;
grid-template-columns:
minmax(210px,.85fr)
minmax(350px,1.25fr);
gap:
30px;
align-items:
center;
width:
min(900px,100%);
margin:
0 auto;
}
.pf-entry-screen.side-b {
grid-template-columns:
minmax(350px,1.25fr)
minmax(210px,.85fr);
}
.pf-entry-visual {
display:
flex;
align-items:
center;
justify-content:
center;
}
.pf-entry-frame {
position:
relative;
width:
225px;
height:
225px;
display:
grid;
place-items:
center;
border:
4px solid #fff8e3;
background:
#f0b3c7;
box-shadow:
8px 8px 0 #171421;
animation:
pfEntryPop
.55s
steps(4);
}
.pf-entry-screen.side-b
.pf-entry-frame {
background:
#cfc2ee;
}
.pf-entry-frame
.pf-character-sprite {
width:
145px;
height:
145px;
animation:
pfEntryIdle
.9s
steps(3)
infinite;
}
.pf-entry-number {
position:
absolute;
top:
-14px;
left:
-14px;
padding:
7px 9px;
border:
3px solid #fff8e3;
background:
#312d4d;
color:
#fff8e3;
font-family:
"Press Start 2P",
cursive;
font-size:
.45rem;
line-height:
1.7;
}
.pf-entry-card {
padding:
25px;
border:
4px solid #fff8e3;
background:
#fbf4e3;
color:
#30283d;
box-shadow:
8px 8px 0 #171421;
}
.pf-entry-kicker {
margin:
0 0 9px;
color:
#9c4265;
font-family:
"Press Start 2P",
cursive;
font-size:
.52rem;
line-height:
1.8;
}
.pf-entry-card h3 {
margin:
0;
color:
#30283d;
font-family:
"Galmuri11",
sans-serif;
font-size:
clamp(2rem,4vw,3rem);
line-height:
1.2;
}
.pf-entry-title {
margin:
10px 0 18px;
color:
#984966;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.15rem;
font-weight:
700;
line-height:
1.5;
}
.pf-entry-grid {
display:
grid;
grid-template-columns:
1fr 1fr;
gap:
10px;
}
.pf-entry-info {
padding:
11px;
border:
2px solid #30283d;
background:
#fffaf1;
}
.pf-entry-info.wide {
grid-column:
1 / -1;
}
.pf-entry-info span {
display:
block;
margin-bottom:
5px;
color:
#70637c;
font-family:
"Press Start 2P",
cursive;
font-size:
.4rem;
line-height:
1.8;
}
.pf-entry-info strong {
color:
#30283d;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
line-height:
1.55;
}
/* =================================================
VS
================================================= */
.pf-vs-screen {
min-height:
525px;
display:
grid;
grid-template-columns:
1fr auto 1fr;
gap:
28px;
align-items:
center;
width:
min(850px,100%);
margin:
0 auto;
text-align:
center;
}
.pf-vs-character {
width:
205px;
height:
205px;
display:
grid;
place-items:
center;
margin:
0 auto 15px;
border:
4px solid #fff8e3;
box-shadow:
7px 7px 0 #171421;
}
.pf-vs-character.a {
background:
#f0b3c7;
}
.pf-vs-character.b {
background:
#cfc2ee;
}
.pf-vs-character
.pf-character-sprite {
width:
125px;
height:
125px;
}
.pf-vs-name {
color:
#fff8e3;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.25rem;
font-weight:
700;
}
.pf-vs-mark {
color:
#f9dd6b;
font-family:
"Press Start 2P",
cursive;
font-size:
clamp(2.4rem,6vw,4rem);
text-shadow:
5px 5px 0 #9d4164;
}
/* =================================================
COUNT
================================================= */
.pf-countdown {
min-height:
510px;
display:
grid;
place-items:
center;
text-align:
center;
}
.pf-countdown-text {
color:
#f9e273;
font-family:
"Press Start 2P",
cursive;
font-size:
clamp(3.8rem,12vw,7rem);
text-shadow:
6px 6px 0 #a04464;
animation:
pfPop
.45s
steps(3);
}
/* =================================================
ARENA
================================================= */
.pf-arena {
width:
min(950px,100%);
margin:
0 auto;
padding:
13px;
border:
4px solid #fff8e3;
background:
linear-gradient(
180deg,
#908bbc 0%,
#a39bc8 47%,
#e6d3d8 49%,
#dec4c7 100%
);
box-shadow:
8px 8px 0 #181421;
color:
#30283d;
}
.pf-round-header {
display:
flex;
flex-direction:
column;
align-items:
center;
gap:
8px;
margin-bottom:
9px;
padding:
11px 13px;
border:
3px solid #30283d;
background:
#fbf4e3;
box-shadow:
4px 4px 0 #30283d;
}
.pf-round-chip {
padding:
8px 11px;
border:
2px solid #69598c;
background:
#ddd5ef;
color:
#584974;
font-family:
"Press Start 2P",
cursive;
font-size:
.5rem;
line-height:
1.7;
}
.pf-rule-focus {
width:
min(630px,100%);
padding:
11px 17px;
border:
3px solid #866696;
background:
#f2d2df;
box-shadow:
4px 4px 0 #866696;
text-align:
center;
}
.pf-rule-focus span {
display:
block;
margin-bottom:
3px;
color:
#705c74;
font-family:
"Galmuri11",
sans-serif;
font-size:
.96rem;
font-weight:
700;
}
.pf-rule-focus strong {
display:
block;
color:
#47354c;
font-family:
"Galmuri11",
sans-serif;
font-size:
clamp(1.6rem,3vw,2.1rem);
line-height:
1.2;
}
/* =================================================
HUD
================================================= */
.pf-hud {
display:
grid;
grid-template-columns:
1fr 1fr;
gap:
11px;
margin-bottom:
3px;
}
.pf-hud-card {
padding:
9px;
border:
3px solid #30283d;
background:
#fbf4e3;
box-shadow:
4px 4px 0 #30283d;
}
.pf-hud-card.right {
text-align:
right;
}
.pf-hud-top {
display:
flex;
justify-content:
space-between;
align-items:
center;
gap:
8px;
margin-bottom:
7px;
}
.pf-hud-card.right
.pf-hud-top {
flex-direction:
row-reverse;
}
.pf-hud-top strong {
font-family:
"Galmuri11",
sans-serif;
font-size:
1.06rem;
}
.pf-hp-label {
font-family:
"Press Start 2P",
cursive;
font-size:
.4rem;
line-height:
1.7;
}
.pf-hp-bar {
height:
19px;
padding:
3px;
border:
3px solid #30283d;
background:
#ddd4ca;
overflow:
hidden;
}
.pf-hp-fill {
height:
100%;
background:
#8fc89f;
transition:
width
.65s
steps(12);
}
.pf-hp-fill.danger {
background:
#df7582;
animation:
pfBlink
.6s
steps(2)
infinite;
}
/* =================================================
FIGHTERS
================================================= */
.pf-fighters {
position:
relative;
display:
grid;
grid-template-columns:
1fr 1fr;
align-items:
end;
min-height:
170px;
padding:
0 12px;
margin-bottom:
8px;
overflow:
hidden;
}
.pf-fighter {
position:
relative;
display:
flex;
flex-direction:
column;
justify-content:
flex-end;
align-items:
center;
min-height:
150px;
}
.pf-character-shell {
position:
relative;
width:
115px;
height:
115px;
display:
grid;
place-items:
center;
z-index:
5;
animation:
pfIdle
.9s
steps(3)
infinite;
}
.pf-character-sprite {
width:
115px;
height:
115px;
image-rendering:
pixelated;
filter:
drop-shadow(
4px 6px 0
rgba(46,40,56,.28)
);
}
.pf-character-shadow {
width:
126px;
height:
18px;
margin-top:
-3px;
border-radius:
50%;
background:
rgba(46,40,56,.2);
}
.pf-win-tag {
display:
none;
position:
absolute;
top:
-3px;
left:
50%;
transform:
translateX(-50%);
min-width:
92px;
padding:
8px 12px;
border:
3px solid #315d93;
background:
#cfe2fb;
color:
#315d93;
box-shadow:
4px 4px 0 #315d93;
font-family:
"Press Start 2P",
cursive;
font-size:
.5rem;
line-height:
1.7;
text-align:
center;
z-index:
14;
animation:
pfWinTagFloat
.85s
steps(2)
infinite;
}
.pf-fighter.winner
.pf-win-tag {
display:
block;
}
.pf-fighter.draw
.pf-win-tag {
display:
block;
border-color:
#725f8f;
background:
#dfd7ed;
color:
#67557e;
box-shadow:
4px 4px 0 #67557e;
}
/* =================================================
DAMAGE
================================================= */
.pf-injuries {
position:
absolute;
inset:
0;
z-index:
8;
pointer-events:
none;
}
.pf-bandage,
.pf-bandage-two,
.pf-bruise,
.pf-scratch-a,
.pf-scratch-b {
position:
absolute;
opacity:
0;
}
.pf-bandage {
top:
24px;
right:
15px;
width:
25px;
height:
10px;
border:
2px solid #89644f;
background:
#efd091;
transform:
rotate(-14deg);
box-shadow:
inset 6px 0 0 #ddba78,
inset -6px 0 0 #ddba78;
}
.pf-bandage-two {
bottom:
17px;
left:
19px;
width:
20px;
height:
8px;
border:
2px solid #89644f;
background:
#efd091;
transform:
rotate(20deg);
}
.pf-bruise {
top:
43px;
left:
13px;
width:
18px;
height:
14px;
border-radius:
50%;
background:
rgba(92,66,132,.68);
}
.pf-scratch-a {
top:
69px;
right:
18px;
width:
18px;
height:
3px;
background:
#a23e55;
transform:
rotate(-17deg);
box-shadow:
-6px 6px 0 #a23e55;
}
.pf-scratch-b {
top:
67px;
left:
18px;
width:
18px;
height:
3px;
background:
#8d384b;
transform:
rotate(15deg);
box-shadow:
6px 6px 0 #8d384b;
}
.injury-1 .pf-bandage {
opacity:
1;
}
.injury-2 .pf-bandage,
.injury-2 .pf-scratch-a {
opacity:
1;
}
.injury-3 .pf-bandage,
.injury-3 .pf-scratch-a,
.injury-3 .pf-bruise {
opacity:
1;
}
.injury-4 .pf-bandage,
.injury-4 .pf-scratch-a,
.injury-4 .pf-bruise,
.injury-4 .pf-scratch-b {
opacity:
1;
}
.injury-5 .pf-bandage,
.injury-5 .pf-bandage-two,
.injury-5 .pf-scratch-a,
.injury-5 .pf-scratch-b,
.injury-5 .pf-bruise {
opacity:
1;
}
/* =================================================
ATTACK
================================================= */
.pf-fighter.attacking-a
.pf-character-shell {
animation:
pfAttackA
.95s
steps(9);
}
.pf-fighter.attacking-b
.pf-character-shell {
animation:
pfAttackB
.95s
steps(9);
}
.pf-fighter.hit-a
.pf-character-shell {
animation:
pfHitA
1.15s
steps(9);
}
.pf-fighter.hit-b
.pf-character-shell {
animation:
pfHitB
1.15s
steps(9);
}
.pf-slash {
position:
absolute;
top:
42%;
width:
170px;
height:
6px;
opacity:
0;
z-index:
9;
}
.pf-slash::before,
.pf-slash::after {
content:
"";
position:
absolute;
width:
100%;
height:
100%;
background:
#fff1a9;
box-shadow:
0 13px 0 #f4b8d0,
0 26px 0 #d7d1ff;
}
.pf-slash::after {
top:
9px;
width:
76%;
}
.pf-slash.a {
left:
18%;
}
.pf-slash.b {
right:
18%;
}
.pf-slash.a.show::before,
.pf-slash.a.show::after {
animation:
pfSlashA
.68s
steps(6);
}
.pf-slash.b.show::before,
.pf-slash.b.show::after {
animation:
pfSlashB
.68s
steps(6);
}
.pf-impact {
position:
absolute;
left:
50%;
top:
42%;
transform:
translate(-50%,-50%);
color:
#fff1a5;
font-family:
"Press Start 2P",
cursive;
font-size:
1.8rem;
text-shadow:
3px 3px 0 #9d4063;
opacity:
0;
z-index:
12;
}
.pf-impact.show {
animation:
pfImpact
.78s
steps(5);
}
.pf-effect {
position:
absolute;
left:
50%;
top:
43%;
transform:
translate(-50%,-50%);
min-width:
285px;
padding:
16px 20px;
border:
3px solid #fff1a9;
background:
rgba(51,42,75,.96);
color:
#fff1a9;
box-shadow:
6px 6px 0 #191522;
font-family:
"Press Start 2P",
cursive;
font-size:
clamp(.9rem,2.5vw,1.4rem);
line-height:
1.6;
text-align:
center;
z-index:
20;
animation:
pfPop
.4s
steps(4);
}
.pf-effect span {
display:
block;
margin-top:
7px;
color:
#fff9f0;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
line-height:
1.5;
}
/* =================================================
ROUND RESULT
================================================= */
.pf-round-summary {
margin-top:
8px;
padding:
12px 14px;
border:
3px solid #826994;
background:
#efe8f7;
color:
#514162;
box-shadow:
4px 4px 0 #826994;
text-align:
center;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.08rem;
font-weight:
700;
line-height:
1.45;
}
.pf-score-row {
display:
grid;
grid-template-columns:
1fr auto 1fr;
align-items:
center;
gap:
12px;
margin-top:
9px;
padding:
11px;
border:
3px solid #30283d;
background:
#fbf4e3;
box-shadow:
4px 4px 0 #30283d;
}
.pf-score-side {
text-align:
center;
}
.pf-score-side span {
display:
block;
margin-bottom:
4px;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
font-weight:
700;
}
.pf-score-side strong {
font-family:
"Press Start 2P",
cursive;
font-size:
clamp(1.4rem,3vw,2rem);
line-height:
1.5;
}
.pf-score-mid {
padding:
7px 9px;
border:
2px solid #a44b6c;
background:
#f2d2dd;
color:
#9b4264;
font-family:
"Press Start 2P",
cursive;
font-size:
.42rem;
line-height:
1.7;
}
.pf-judge-panel {
margin-top:
9px;
padding:
13px;
border:
3px solid #30283d;
background:
#fff8ea;
box-shadow:
4px 4px 0 #30283d;
}
.pf-judge-title {
margin:
0 0 11px;
padding-bottom:
9px;
border-bottom:
2px solid #c5bacb;
color:
#68558a;
font-family:
"Press Start 2P",
cursive;
font-size:
.5rem;
line-height:
1.8;
}
.pf-judge-grid {
display:
grid;
grid-template-columns:
1fr 1fr;
gap:
11px;
}
.pf-judge-card {
padding:
15px;
border:
2px solid #30283d;
background:
#faf4e7;
}
/*
승자 강조
*/
.pf-judge-card.winner {
border-color:
#6489c0;
background:
#e1edfd;
box-shadow:
inset 0 0 0 2px
rgba(100,137,192,.11);
}
/*
패자는 빨강이 아니라 회색
*/
.pf-judge-card.loser {
border-color:
#a6a1aa;
background:
#eceaec;
color:
#67616c;
opacity:
.82;
}
.pf-judge-card.draw {
border-color:
#85789b;
background:
#ebe5f1;
}
.pf-judge-head {
display:
flex;
justify-content:
space-between;
align-items:
center;
gap:
10px;
margin-bottom:
10px;
}
.pf-judge-head strong {
color:
#30283d;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.2rem;
font-weight:
700;
}
.pf-judge-badge {
padding:
7px 11px;
border:
2px solid currentColor;
font-family:
"Galmuri11",
sans-serif !important;
font-size:
1.03rem;
font-weight:
800;
line-height:
1.1;
white-space:
nowrap;
}
.pf-judge-card.winner
.pf-judge-badge {
background:
#cbe0fb;
color:
#315f94;
}
.pf-judge-card.loser
.pf-judge-badge {
background:
#dddadd;
color:
#716b74;
}
.pf-judge-card.draw
.pf-judge-badge {
background:
#ddd5eb;
color:
#69577e;
}
.pf-judge-flavor {
margin:
0 0 8px;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.12rem;
font-weight:
700;
line-height:
1.4;
}
.pf-judge-card p {
margin:
0;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
line-height:
1.65;
}
/* =================================================
ACTION BUTTON
================================================= */
.pf-action-row {
display:
flex;
justify-content:
center;
align-items:
stretch;
flex-wrap:
wrap;
gap:
14px;
margin-top:
15px;
}
.pf-action-btn {
min-width:
320px;
min-height:
72px;
padding:
18px 24px;
border:
4px solid #30283d;
background:
#cfe2fb;
color:
#315f94;
box-shadow:
6px 6px 0 #30283d;
font-family:
"Galmuri11",
sans-serif !important;
font-size:
1.22rem;
font-weight:
800;
line-height:
1.25;
cursor:
pointer;
}
.pf-action-btn:hover {
transform:
translateY(-2px);
}
.pf-action-btn:active {
transform:
translate(3px,3px);
box-shadow:
2px 2px 0 #30283d;
}
.pf-action-btn.pink {
background:
#f6d0dc;
color:
#9c4264;
}
.pf-action-btn.gray {
background:
#e1dde4;
color:
#625b69;
}
/* =================================================
FINAL CHOICE
================================================= */
.pf-round-choice-box {
margin-top:
14px;
padding:
18px;
border:
3px solid #30283d;
background:
#fff8e8;
box-shadow:
4px 4px 0 #30283d;
text-align:
center;
}
.pf-round-choice-box h3 {
margin:
0 0 8px;
color:
#994567;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.3rem;
font-weight:
800;
}
.pf-round-choice-box p {
margin:
0;
color:
#514854;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
line-height:
1.65;
}
/* =================================================
FINAL STAGE
================================================= */
.pf-final-wrap {
width:
min(950px,100%);
margin:
0 auto;
display:
flex;
flex-direction:
column;
gap:
12px;
}
.pf-final-stage {
position:
relative;
padding:
13px;
border:
4px solid #fff8e3;
background:
linear-gradient(
180deg,
#908bbc 0%,
#a19ac7 47%,
#e5d2d8 49%,
#dec3c6 100%
);
box-shadow:
8px 8px 0 #181421;
overflow:
hidden;
}
.pf-final-grid {
position:
relative;
display:
grid;
grid-template-columns:
1fr 1fr;
align-items:
end;
gap:
10px;
min-height:
245px;
}
.pf-final-fighter {
position:
relative;
min-height:
225px;
display:
flex;
flex-direction:
column;
justify-content:
flex-end;
align-items:
center;
padding-top:
62px;
isolation:
isolate;
}
/*
패자 뒤 어두운 우울 세로줄
*/
.pf-final-fighter.defeated::before {
content:
"";
position:
absolute;
inset:
5px 6% 0;
z-index:
-2;
background:
linear-gradient(
180deg,
rgba(40,36,50,.07),
rgba(40,36,50,.22)
),
repeating-linear-gradient(
90deg,
rgba(45,39,56,.22) 0px,
rgba(45,39,56,.22) 8px,
rgba(45,39,56,.045) 8px,
rgba(45,39,56,.045) 16px
);
opacity:
.8;
}
.pf-final-character {
position:
relative;
width:
138px;
height:
138px;
display:
grid;
place-items:
center;
z-index:
4;
}
.pf-final-character
.pf-character-sprite {
width:
138px;
height:
138px;
}
.pf-final-shadow {
width:
145px;
height:
19px;
margin-top:
-2px;
border-radius:
50%;
background:
rgba(46,40,56,.2);
}
.pf-final-side-tag {
position:
absolute;
top:
13px;
left:
50%;
transform:
translateX(-50%);
padding:
8px 11px;
border:
3px solid #30283d;
box-shadow:
4px 4px 0 #30283d;
font-family:
"Press Start 2P",
cursive;
font-size:
.48rem;
line-height:
1.7;
z-index:
30;
}
/*
WIN은 왕관 왼쪽 위로 빼서
겹치지 않게 함.
*/
.pf-final-side-tag.winner {
top:
25px;
transform:
translateX(-165%);
background:
#cfe2fb;
color:
#315f94;
}
.pf-final-side-tag.loser {
background:
#ddd9e0;
color:
#655f6c;
}
.pf-halo {
position:
absolute;
top:
52px;
left:
50%;
transform:
translateX(-50%);
width:
190px;
height:
190px;
border-radius:
50%;
background:
radial-gradient(
circle,
rgba(255,255,255,.97) 0%,
rgba(255,255,255,.66) 34%,
rgba(255,255,255,.2) 58%,
transparent 74%
);
z-index:
-1;
animation:
pfHaloPulse
1.4s
ease-in-out
infinite;
}
/* =================================================
PIXEL CROWN
================================================= */
.pf-pixel-crown {
position:
absolute;
top:
2px;
left:
50%;
transform:
translateX(-50%);
width:
82px;
height:
45px;
z-index:
35;
animation:
pfCrownFloat
.85s
steps(2)
infinite;
}
.pf-pixel-crown i {
position:
absolute;
display:
block;
box-sizing:
border-box;
border:
2px solid #8b6812;
background:
#f7db67;
}
.pf-pixel-crown .c1 {
left: 2px;
top: 21px;
width: 17px;
height: 15px;
}
.pf-pixel-crown .c2 {
left: 18px;
top: 11px;
width: 14px;
height: 18px;
}
.pf-pixel-crown .c3 {
left: 32px;
top: 2px;
width: 18px;
height: 23px;
}
.pf-pixel-crown .c4 {
left: 50px;
top: 11px;
width: 14px;
height: 18px;
}
.pf-pixel-crown .c5 {
left: 63px;
top: 21px;
width: 17px;
height: 15px;
}
.pf-pixel-crown .base {
left: 0;
top: 29px;
width: 82px;
height: 12px;
background:
#f7e89a;
}
.pf-final-fighter.winner
.pf-final-character {
animation:
pfWinnerBounce
.9s
steps(3)
infinite;
}
.pf-final-fighter.decision-loss
.pf-final-character {
animation:
pfDecisionCollapse
1.55s
steps(11)
forwards !important;
}
.pf-final-fighter.ko-loss
.pf-final-character {
animation:
pfKOCollapse
1.65s
steps(12)
forwards !important;
}
/* =================================================
FINAL JUDGEMENT
================================================= */
.pf-final-summary {
padding:
17px;
border:
4px solid #fff8e3;
background:
#fbf4e3;
color:
#30283d;
box-shadow:
8px 8px 0 #181421;
}
.pf-final-summary h2 {
margin:
0 0 13px;
color:
#9b4568;
font-family:
"Press Start 2P",
cursive;
font-size:
clamp(.95rem,2vw,1.3rem);
line-height:
1.8;
}
/*
DECISION / AI DECISION 박스 없음.
*/
.pf-final-judgement {
padding:
13px;
border:
3px solid #7e6090;
background:
#fffaf1;
}
.pf-final-judgement h3 {
margin:
0 0 11px;
color:
#715b8b;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.3rem;
font-weight:
800;
}
.pf-final-round-list {
display:
flex;
flex-direction:
column;
gap:
8px;
margin-bottom:
13px;
}
.pf-final-round-item {
padding:
11px;
border:
2px solid #30283d;
background:
#fbf4e3;
}
.pf-final-round-item.sudden {
border-color:
#9b4568;
background:
#fae2eb;
box-shadow:
inset 0 0 0 2px
rgba(155,69,104,.08);
}
.pf-final-round-item strong {
display:
block;
margin-bottom:
4px;
color:
#594574;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.05rem;
font-weight:
800;
}
.pf-final-round-item p {
margin:
0;
color:
#473d4d;
font-family:
"Galmuri11",
sans-serif;
font-size:
.98rem;
line-height:
1.62;
}
.pf-final-pick {
padding:
15px;
border:
3px solid #c45d86;
background:
linear-gradient(
180deg,
#fff1f6,
#ffe1ec
);
box-shadow:
4px 4px 0 #c45d86;
text-align:
center;
}
.pf-final-pick span {
display:
block;
margin-bottom:
5px;
color:
#91405f;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
font-weight:
700;
}
.pf-final-pick strong {
display:
block;
color:
#9a4467;
font-family:
"Galmuri11",
sans-serif;
font-size:
clamp(1.8rem,4vw,2.6rem);
line-height:
1.25;
}
.pf-final-pick em {
display:
block;
margin-top:
7px;
color:
#5d4d73;
font-family:
"Galmuri11",
sans-serif;
font-size:
1rem;
font-style:
normal;
line-height:
1.62;
}
/* =================================================
END BUTTONS
================================================= */
.pf-game-end-actions {
display:
grid;
grid-template-columns:
1fr 1fr;
gap:
14px;
margin-top:
15px;
}
.pf-game-end-btn {
min-height:
72px;
padding:
16px;
border:
4px solid #30283d;
box-shadow:
6px 6px 0 #30283d;
font-family:
"Galmuri11",
sans-serif;
font-size:
1.15rem;
font-weight:
800;
cursor:
pointer;
}
.pf-game-end-btn.new {
background:
#f6cedc;
color:
#994161;
}
.pf-game-end-btn.exit {
background:
#dcd7e5;
color:
#5d5665;
}
/* =================================================
ANIMATION
================================================= */
@keyframes pfFightReady {
0%,
100% {
transform:
translateY(0);
}
50% {
transform:
translateY(-3px);
}
}
@keyframes pfRuleShake {
0%,
100% {
transform:
translateX(0);
}
25% {
transform:
translateX(-3px);
}
75% {
transform:
translateX(3px);
}
}
@keyframes pfEntryPop {
0% {
transform:
scale(.2);
opacity:
0;
}
70% {
transform:
scale(1.08);
opacity:
1;
}
100% {
transform:
scale(1);
}
}
@keyframes pfEntryIdle {
0%,
100% {
transform:
translateY(0);
}
50% {
transform:
translateY(-7px);
}
}
@keyframes pfPop {
0% {
transform:
scale(.2);
opacity:
0;
}
70% {
transform:
scale(1.1);
opacity:
1;
}
100% {
transform:
scale(1);
}
}
@keyframes pfIdle {
0%,
100% {
transform:
translateY(0);
}
50% {
transform:
translateY(-5px);
}
}
@keyframes pfBlink {
0%,
100% {
opacity:
1;
}
50% {
opacity:
.55;
}
}
@keyframes pfWinTagFloat {
0%,
100% {
transform:
translateX(-50%)
translateY(0);
}
50% {
transform:
translateX(-50%)
translateY(-5px);
}
}
@keyframes pfAttackA {
0% {
transform:
translateX(0);
}
20% {
transform:
translateX(-9px);
}
55% {
transform:
translateX(74px)
translateY(-5px)
scale(1.07);
}
75% {
transform:
translateX(94px)
translateY(-7px)
scale(1.1);
}
100% {
transform:
translateX(0);
}
}
@keyframes pfAttackB {
0% {
transform:
translateX(0);
}
20% {
transform:
translateX(9px);
}
55% {
transform:
translateX(-74px)
translateY(-5px)
scale(1.07);
}
75% {
transform:
translateX(-94px)
translateY(-7px)
scale(1.1);
}
100% {
transform:
translateX(0);
}
}
@keyframes pfHitA {
0% {
transform:
translateX(0)
rotate(0deg);
}
22% {
transform:
translateX(-22px)
translateY(-6px)
rotate(-4deg);
}
50% {
transform:
translateX(-58px)
translateY(-11px)
rotate(-9deg);
}
72% {
transform:
translateX(-42px)
translateY(4px)
rotate(-5deg);
}
100% {
transform:
translateX(0)
rotate(0deg);
}
}
@keyframes pfHitB {
0% {
transform:
translateX(0)
rotate(0deg);
}
22% {
transform:
translateX(22px)
translateY(-6px)
rotate(4deg);
}
50% {
transform:
translateX(58px)
translateY(-11px)
rotate(9deg);
}
72% {
transform:
translateX(42px)
translateY(4px)
rotate(5deg);
}
100% {
transform:
translateX(0)
rotate(0deg);
}
}
@keyframes pfSlashA {
0% {
transform:
translateX(-35px)
scaleX(.3);
opacity:
0;
}
20% {
opacity:
1;
}
70% {
transform:
translateX(125px)
scaleX(1);
opacity:
1;
}
100% {
transform:
translateX(180px)
scaleX(.5);
opacity:
0;
}
}
@keyframes pfSlashB {
0% {
transform:
translateX(35px)
scaleX(.3);
opacity:
0;
}
20% {
opacity:
1;
}
70% {
transform:
translateX(-125px)
scaleX(1);
opacity:
1;
}
100% {
transform:
translateX(-180px)
scaleX(.5);
opacity:
0;
}
}
@keyframes pfImpact {
0% {
transform:
translate(-50%,-50%)
scale(.2);
opacity:
0;
}
28% {
transform:
translate(-50%,-50%)
scale(1.45);
opacity:
1;
}
100% {
transform:
translate(-50%,-50%)
scale(.85);
opacity:
0;
}
}
@keyframes pfWinnerBounce {
0%,
100% {
transform:
translateY(0)
scale(1);
}
50% {
transform:
translateY(-10px)
scale(1.05);
}
}
@keyframes pfCrownFloat {
0%,
100% {
transform:
translateX(-50%)
translateY(0);
}
50% {
transform:
translateX(-50%)
translateY(-5px);
}
}
@keyframes pfHaloPulse {
0%,
100% {
transform:
translateX(-50%)
scale(.94);
opacity:
.72;
}
50% {
transform:
translateX(-50%)
scale(1.06);
opacity:
1;
}
}
@keyframes pfDecisionCollapse {
0% {
transform:
translateY(0)
rotate(0deg);
}
12% {
transform:
translateY(-6px)
rotate(3deg);
}
30% {
transform:
translateY(10px)
rotate(-6deg);
}
52% {
transform:
translateY(32px)
rotate(-11deg)
scaleY(.92);
}
72% {
transform:
translateY(52px)
rotate(-15deg)
scaleY(.81);
}
88% {
transform:
translateY(64px)
rotate(-13deg)
scaleY(.73);
}
100% {
transform:
translateY(66px)
rotate(-13deg)
scaleY(.72);
}
}
@keyframes pfKOCollapse {
0% {
transform:
translate(0,0)
rotate(0deg);
}
15% {
transform:
translate(-6px,-9px)
rotate(-5deg);
}
35% {
transform:
translate(15px,14px)
rotate(20deg);
}
58% {
transform:
translate(34px,42px)
rotate(49deg);
}
80% {
transform:
translate(46px,66px)
rotate(74deg)
scale(.91);
}
100% {
transform:
translate(50px,72px)
rotate(89deg)
scale(.86);
}
}
/* =================================================
MOBILE
================================================= */
@media (max-width:760px) {
.pf-status-badge {
position:
static;
width:
fit-content;
margin:
0 0 10px auto;
}
.pf-entry-screen,
.pf-entry-screen.side-b {
grid-template-columns:
1fr;
min-height:
auto;
padding:
30px 0;
}
.pf-entry-screen.side-b
.pf-entry-card {
order:
2;
}
.pf-entry-screen.side-b
.pf-entry-visual {
order:
1;
}
.pf-entry-grid {
grid-template-columns:
1fr;
}
.pf-entry-info.wide {
grid-column:
auto;
}
.pf-entry-frame {
width:
175px;
height:
175px;
}
.pf-entry-frame
.pf-character-sprite {
width:
110px;
height:
110px;
}
.pf-vs-screen {
grid-template-columns:
1fr auto 1fr;
gap:
8px;
}
.pf-vs-character {
width:
110px;
height:
110px;
}
.pf-vs-character
.pf-character-sprite {
width:
72px;
height:
72px;
}
.pf-vs-mark {
font-size:
1.4rem;
}
.pf-hud,
.pf-judge-grid,
.pf-score-row,
.pf-final-grid,
.pf-game-end-actions {
grid-template-columns:
1fr;
}
.pf-score-mid {
justify-self:
center;
}
.pf-action-btn {
min-width:
100%;
}
.pf-fighters {
min-height:
160px;
}
.pf-character-shell,
.pf-character-sprite {
width:
92px;
height:
92px;
}
.pf-final-character,
.pf-final-character
.pf-character-sprite {
width:
112px;
height:
112px;
}
.pf-final-fighter {
min-height:
190px;
}
.pf-scene-topbar {
align-items:
flex-start;
}
.pf-entry-skip {
font-size:
.36rem;
padding:
7px 8px;
}
}
`;
        document.head.appendChild(style);
    }
    /* =========================================================
    BADGE
    ========================================================= */
    function createStatusBadge(parent, id) {
        if (!parent) return null;
        let badge =
            document.getElementById(id);
        if (badge) return badge;
        badge =
            document.createElement("div");
        badge.id =
            id;
        badge.className =
            "pf-status-badge";
        parent.appendChild(badge);
        return badge;
    }
    const playerABadge =
        createStatusBadge(
            playerACard,
            "pfPlayerABadge"
        );
    const playerBBadge =
        createStatusBadge(
            playerBCard,
            "pfPlayerBBadge"
        );
    const situationBadge =
        createStatusBadge(
            situationBox,
            "pfSituationBadge"
        );
    const ruleBadge =
        createStatusBadge(
            criteriaBox,
            "pfRuleBadge"
        );
    /* =========================================================
    PLAYER STATUS
    ========================================================= */
    function renderPlayerStatus(side) {
        const input =
            side === "A"
                ? playerAInput
                : playerBInput;
        const card =
            side === "A"
                ? playerACard
                : playerBCard;
        const badge =
            side === "A"
                ? playerABadge
                : playerBBadge;
        const confirmed =
            side === "A"
                ? playerAConfirmed
                : playerBConfirmed;
        if (!input || !card || !badge) {
            return;
        }
        /* 캐릭터 변경/READY 상태 변경 뒤에도 선택 테마를 유지한다. */
        applyCharacterThemeToCard(side);
        const value =
            normalizeText(input.value);
        card.classList.remove(
            "player-a-ready",
            "player-b-ready"
        );
        if (!value) {
            badge.className =
                "pf-status-badge pf-badge-required";
            badge.textContent =
                "□ 필수 입력";
            return;
        }
        if (!confirmed) {
            badge.className =
                "pf-status-badge pf-badge-typing";
            badge.textContent =
                "⌨ 입력 중";
            return;
        }
        badge.className =
            "pf-status-badge pf-badge-ready";
        badge.textContent =
            "✓ READY";
        if (side === "A") {
            card.classList.add(
                "player-a-ready"
            );
        } else {
            card.classList.add(
                "player-b-ready"
            );
        }
    }
    function confirmPlayer(side) {
        if (matchStarted) {
            return;
        }
        const input =
            side === "A"
                ? playerAInput
                : playerBInput;
        if (!input) return;
        const ready =
            Boolean(
                normalizeText(input.value)
            );
        if (side === "A") {
            playerAConfirmed =
                ready;
        } else {
            playerBConfirmed =
                ready;
        }
        renderPlayerStatus(side);
        updateFightButtonState();
    }
    /* =========================================================
    SITUATION
    ========================================================= */
    function updateSituationStatus() {
        if (!situationInput || !situationBadge) {
            return;
        }
        const value =
            normalizeText(
                situationInput.value
            );
        if (value) {
            situationBadge.className =
                "pf-status-badge pf-badge-context";
            situationBadge.textContent =
                "✓ 정보 추가됨";
        } else {
            situationBadge.className =
                "pf-status-badge pf-badge-optional";
            situationBadge.textContent =
                "○ 선택사항";
        }
    }
    /* =========================================================
    RULE HELPERS
    ========================================================= */
    function baseRuleExists(rule) {
        const target =
            normalizeText(rule)
                .toLowerCase();
        return selectedRules.some(
            item =>
                item.toLowerCase()
                === target
        );
    }
    function wasRuleUsed(rule) {
        if (!activeBattle) {
            return false;
        }
        const target =
            normalizeText(rule)
                .toLowerCase();
        const usedRules = [
            ...activeBattle.baseRules,
            ...activeBattle.roundResults.map(round => round.rule)
        ];
        return usedRules.some(
            item =>
                normalizeText(item).toLowerCase()
                === target
        );
    }
    function updateRuleStatus() {
        if (!ruleCount || !ruleStatusText || !ruleBadge) {
            return;
        }
        /*
        DEATH MATCH RULE MODE
        */
        if (deathMatchRuleMode) {
            ruleCount.textContent =
                deathMatchRule
                    ? "1 / 1"
                    : "0 / 1";
            if (deathMatchRule) {
                ruleStatusText.innerHTML = `
★ SUDDEN DEATH RULE READY!<br>
<span class="rule-match-mode">
${escapeHTML(deathMatchRule)}
</span>
`;
                ruleBadge.className =
                    "pf-status-badge pf-badge-ready";
                ruleBadge.textContent =
                    "★ 결판 RULE 준비";
            } else {
                ruleStatusText.innerHTML = `
새 RULE 하나를 골라주세요!<br>
<span class="rule-match-mode">
이미 사용한 RULE은 재사용할 수 없습니다.
</span>
`;
                ruleBadge.className =
                    "pf-status-badge pf-badge-required";
                ruleBadge.textContent =
                    "□ 새 RULE 필요";
            }
            return;
        }
        /*
        BASE RULE
        */
        const count =
            selectedRules.length;
        ruleCount.textContent =
            `${count} / 3`;
        if (count === 0) {
            ruleStatusText.innerHTML =
                "RULE을 선택해주세요!";
            ruleBadge.className =
                "pf-status-badge pf-badge-required";
            ruleBadge.textContent =
                "□ 필수 선택";
        } else if (count === 1) {
            ruleStatusText.innerHTML = `
★ RULE SET READY!<br>
<span class="rule-match-mode">
QUICK MATCH · 1 RULE
</span>
`;
            ruleBadge.className =
                "pf-status-badge pf-badge-ready";
            ruleBadge.textContent =
                "✓ 선택 완료 · 1/3";
        } else if (count === 2) {
            ruleStatusText.innerHTML = `
★ RULE SET READY!<br>
<span class="rule-match-mode">
NORMAL MATCH · 2 RULES
</span>
`;
            ruleBadge.className =
                "pf-status-badge pf-badge-ready";
            ruleBadge.textContent =
                "✓ 선택 완료 · 2/3";
        } else if (count === 3) {
            ruleStatusText.innerHTML = `
★ RULE SET COMPLETE!<br>
<span class="rule-match-mode">
FULL BATTLE · 3 RULES
</span>
`;
            ruleBadge.className =
                "pf-status-badge pf-badge-ready";
            ruleBadge.textContent =
                "★ 선택 완료 · 3/3";
        } else {
            ruleStatusText.innerHTML = `
⚠ RULE SLOT OVER!<br>
<span class="rule-match-mode">
4개 중 하나를 삭제해주세요 ♡
</span>
`;
            ruleBadge.className =
                "pf-status-badge pf-badge-over";
            ruleBadge.textContent =
                `! 선택 초과 · ${count}/3`;
        }
    }
    function renderDeathRuleGuide() {
        if (!criteriaBox) return;
        let guide =
            document.getElementById(
                "pfDeathRuleGuide"
            );
        if (!deathMatchRuleMode) {
            if (guide) {
                guide.remove();
            }
            return;
        }
        if (!guide) {
            guide =
                document.createElement("div");
            guide.id =
                "pfDeathRuleGuide";
            guide.className =
                "pf-death-rule-guide";
            const buttonArea =
                criteriaBox.querySelector(
                    ".criteria-buttons"
                );
            if (buttonArea) {
                buttonArea.before(guide);
            } else {
                criteriaBox.prepend(guide);
            }
        }
        guide.innerHTML = `
<strong>
★ SUDDEN DEATH RULE ★
</strong>
여기까지 왔는데 그냥 끝낼 순 없지...!<br>
이미 사용한 RULE은 잠겼어요.<br>
<b>새로운 기준 하나</b>로 진짜 마지막 결판을 내주세요 ♡
`;
    }
    function syncCriteriaButtons() {
        criteriaButtons.forEach(button => {
            const value =
                normalizeText(
                    button.dataset.value
                );
            /*
            일반 선택 모드
            */
            if (!deathMatchRuleMode) {
                button.disabled =
                    matchStarted;
                button.classList.remove(
                    "pf-used-rule"
                );
                const selected =
                    selectedRules.some(
                        item =>
                            item.toLowerCase()
                            ===
                            value.toLowerCase()
                    );
                button.classList.toggle(
                    "selected",
                    selected
                );
                button.setAttribute(
                    "aria-pressed",
                    selected
                        ? "true"
                        : "false"
                );
                return;
            }
            /*
            데스매치 선택 모드
            */
            const used =
                wasRuleUsed(value);
            button.disabled =
                used;
            button.classList.toggle(
                "pf-used-rule",
                used
            );
            const deathSelected =
                deathMatchRule
                &&
                deathMatchRule.toLowerCase()
                ===
                value.toLowerCase();
            button.classList.toggle(
                "selected",
                Boolean(deathSelected)
            );
            button.setAttribute(
                "aria-pressed",
                deathSelected
                    ? "true"
                    : "false"
            );
        });
    }
    function renderSelectedRules() {
        if (!selectedRulesList) return;
        selectedRulesList.innerHTML = "";
        /*
        DEATH MATCH MODE
        */
        if (
            deathMatchRuleMode
            &&
            activeBattle
        ) {
            activeBattle.baseRules.forEach(
                (rule, index) => {
                    const item =
                        document.createElement("div");
                    item.className =
                        "selected-rule-item";
                    item.style.opacity =
                        ".52";
                    item.innerHTML = `
<span class="selected-rule-number">
${String(index + 1).padStart(2, "0")}
</span>
<span class="selected-rule-name">
${escapeHTML(rule)}
· 사용 완료
</span>
`;
                    selectedRulesList.appendChild(
                        item
                    );
                }
            );
            if (deathMatchRule) {
                const death =
                    document.createElement("div");
                death.className =
                    "pf-sudden-selected";
                death.innerHTML = `
★ SUDDEN DEATH RULE<br>
${escapeHTML(deathMatchRule)}
`;
                selectedRulesList.appendChild(
                    death
                );
            }
            renderDeathRuleGuide();
            syncCriteriaButtons();
            updateRuleStatus();
            renderDeathMatchControls();
            updateFightButtonState();
            return;
        }
        /*
        BASE RULE MODE
        */
        if (
            selectedRules.length === 0
        ) {
            selectedRulesList.innerHTML = `
<p class="empty-rule-message">
아직 선택된 RULE이 없습니다.
</p>
`;
            renderDeathRuleGuide();
            syncCriteriaButtons();
            updateRuleStatus();
            removeDeathMatchControls();
            updateFightButtonState();
            return;
        }
        selectedRules.forEach(
            (rule, index) => {
                const item =
                    document.createElement("div");
                item.className =
                    "selected-rule-item";
                if (
                    selectedRules.length
                    >
                    MAX_BASE_RULES
                ) {
                    item.classList.add(
                        "rule-over-item"
                    );
                }
                const number =
                    document.createElement("span");
                number.className =
                    "selected-rule-number";
                number.textContent =
                    String(index + 1)
                        .padStart(2, "0");
                const name =
                    document.createElement("span");
                name.className =
                    "selected-rule-name";
                name.textContent =
                    rule;
                const remove =
                    document.createElement("button");
                remove.type =
                    "button";
                remove.className =
                    "remove-rule-button";
                remove.textContent =
                    "×";
                remove.disabled =
                    matchStarted;
                remove.addEventListener(
                    "click",
                    () => {
                        if (matchStarted) {
                            return;
                        }
                        selectedRules =
                            selectedRules.filter(
                                item =>
                                    item.toLowerCase()
                                    !==
                                    rule.toLowerCase()
                            );
                        renderSelectedRules();
                    }
                );
                item.append(
                    number,
                    name,
                    remove
                );
                selectedRulesList.appendChild(
                    item
                );
            }
        );
        renderDeathRuleGuide();
        syncCriteriaButtons();
        updateRuleStatus();
        removeDeathMatchControls();
        updateFightButtonState();
    }
    function addBaseRule(rule) {
        if (matchStarted) {
            return false;
        }
        const clean =
            normalizeText(rule);
        if (!clean) {
            showMessage(
                "RULE 이름을 입력해주세요!",
                "error"
            );
            return false;
        }
        if (baseRuleExists(clean)) {
            showMessage(
                "이미 선택한 RULE이에요!",
                "error"
            );
            return false;
        }
        if (
            selectedRules.length
            >=
            MAX_VISIBLE_RULES
        ) {
            showMessage(
                "RULE은 지금 더 추가할 수 없어요!",
                "error"
            );
            return false;
        }
        selectedRules.push(clean);
        clearMessage();
        renderSelectedRules();
        return true;
    }
    function selectDeathRule(rule) {
        if (!deathMatchRuleMode) {
            return false;
        }
        const clean =
            normalizeText(rule);
        if (!clean) {
            showMessage(
                "새로운 RULE을 입력해주세요!",
                "error"
            );
            return false;
        }
        if (wasRuleUsed(clean)) {
            showMessage(
                "이미 이번 경기에서 사용한 RULE이에요! 다른 기준을 골라주세요 ♡",
                "error"
            );
            return false;
        }
        deathMatchRule =
            clean;
        clearMessage();
        renderSelectedRules();
        return true;
    }
    /* =========================================================
    DEATH MATCH CONTROLS
    메인 FIGHT와 별도
    ========================================================= */
    function removeDeathMatchControls() {
        document
            .getElementById(
                "pfDeathMatchControls"
            )
            ?.remove();
    }
    function renderDeathMatchControls() {
        if (!criteriaBox) return;
        if (!deathMatchRuleMode) {
            removeDeathMatchControls();
            return;
        }
        let box =
            document.getElementById(
                "pfDeathMatchControls"
            );
        if (!box) {
            box =
                document.createElement("div");
            box.id =
                "pfDeathMatchControls";
            box.className =
                "pf-death-control-box";
            /*
            RULE 카드 안 가장 아래쪽
            */
            criteriaBox.appendChild(box);
        }
        box.innerHTML = `
<p class="pf-death-control-title">
LAST CHANCE!
</p>
<p class="pf-death-control-copy">
${deathMatchRule
                ?
                `<b>${escapeHTML(deathMatchRule)}</b> 기준으로
마지막 결판 준비 완료!`
                :
                `새 RULE 하나를 선택해야
마지막 결판을 시작할 수 있어요.`
            }
</p>
<button
type="button"
class="pf-death-go-button"
id="pfDeathMatchGoButton"
${deathMatchRule ? "" : "disabled"}
>
★ SUDDEN DEATH GO! ★
</button>
`;
        document
            .getElementById(
                "pfDeathMatchGoButton"
            )
            ?.addEventListener(
                "click",
                async () => {
                    if (
                        !deathMatchRule
                        ||
                        battleRunning
                    ) {
                        return;
                    }
                    await runDeathMatch();
                }
            );
    }
    /* =========================================================
    MAIN FIGHT STATE
    ========================================================= */
    function updateFightButtonState() {
        if (!fightButton) return;
        /*
        한번 경기 시작했다면
        NEW BATTLE 전까지 무조건 잠금.
        */
        if (matchStarted) {
            fightButton.disabled =
                true;
            fightButton.classList.remove(
                "pf-fight-ready"
            );
            return;
        }
        const playersReady =
            playerAConfirmed
            &&
            playerBConfirmed
            &&
            Boolean(
                normalizeText(
                    playerAInput?.value
                )
            )
            &&
            Boolean(
                normalizeText(
                    playerBInput?.value
                )
            );
        const rulesReady =
            selectedRules.length >= 1
            &&
            selectedRules.length <= 3;
        const ready =
            playersReady
            &&
            rulesReady;
        fightButton.disabled =
            !ready;
        fightButton.classList.toggle(
            "pf-fight-ready",
            ready
        );
    }
    /* =========================================================
    LOCK INPUT
    ========================================================= */
    function lockMainInputs() {
        [
            playerAInput,
            playerBInput,
            situationInput
        ].forEach(input => {
            if (!input) return;
            input.disabled =
                true;
            input.classList.add(
                "pf-input-locked"
            );
        });
        /*
        경기 중 커스텀 룰은 일반적으로 잠금.
        단 deathMatchRuleMode에서는 다시 켠다.
        */
        if (customRuleInput) {
            customRuleInput.disabled =
                !deathMatchRuleMode;
        }
        if (addRuleButton) {
            addRuleButton.disabled =
                !deathMatchRuleMode;
        }
        syncCriteriaButtons();
        renderCharacterSelectors();
    }
    function unlockAllInputs() {
        [
            playerAInput,
            playerBInput,
            situationInput,
            customRuleInput
        ].forEach(input => {
            if (!input) return;
            input.disabled =
                false;
            input.classList.remove(
                "pf-input-locked"
            );
        });
        if (addRuleButton) {
            addRuleButton.disabled =
                false;
        }
        criteriaButtons.forEach(button => {
            button.disabled =
                false;
            button.classList.remove(
                "pf-used-rule"
            );
        });
        renderCharacterSelectors();
    }
    /* =========================================================
    BATTLE STATE
    ========================================================= */
    function createBattleState() {
        return {
            playerA:
                normalizeText(
                    playerAInput.value
                ),
            playerB:
                normalizeText(
                    playerBInput.value
                ),
            situation:
                normalizeText(
                    situationInput.value
                ),
            baseRules:
                [...selectedRules],
            spriteA:
                CHARACTER_SPRITES[playerACharacterIndex],
            spriteB:
                CHARACTER_SPRITES[playerBCharacterIndex],
            hpA:
                100,
            hpB:
                100,
            hitsA:
                0,
            hitsB:
                0,
            damageTakenA:
                0,
            damageTakenB:
                0,
            totalScoreA:
                0,
            totalScoreB:
                0,
            roundResults:
                [],
            deathMatchPlayed:
                false,
            completed:
                false
        };
    }
    function getRoundLabel(index, total) {
        if (total === 1) {
            return "FINAL ROUND";
        }
        if (
            index === total - 1
        ) {
            return "FINAL ROUND";
        }
        return `ROUND ${index + 1}`;
    }
    function getDamageInfo(gap) {
        if (gap === 0) {
            return {
                damage: 0,
                label: "DRAW!",
                desc: "막상막하다!"
            };
        }
        if (gap <= 5) {
            return {
                damage: 5,
                label: "SOFT HIT!",
                desc: "효과는 미비했다!"
            };
        }
        if (gap <= 14) {
            return {
                damage: 12,
                label: "HIT!",
                desc: "꽤 괜찮은 한 방!"
            };
        }
        if (gap <= 24) {
            return {
                damage: 20,
                label: "STRONG HIT!",
                desc: "효과는 강력했다!"
            };
        }
        if (gap <= 34) {
            return {
                damage: 30,
                label: "CRITICAL!",
                desc: "제대로 꽂혔다!"
            };
        }
        return {
            damage: 40,
            label: "MEGA CRITICAL!!",
            desc: "거의 결정타 급이다!"
        };
    }
    function getInjuryLevel(
        hitCount,
        damage,
        hp
    ) {
        let level = 0;
        if (
            hitCount >= 1
            ||
            damage >= 5
        ) {
            level = 1;
        }
        if (
            hitCount >= 2
            ||
            damage >= 20
        ) {
            level = 2;
        }
        if (
            hitCount >= 3
            ||
            damage >= 40
        ) {
            level = 3;
        }
        if (
            hitCount >= 4
            ||
            damage >= 60
            ||
            hp <= 35
        ) {
            level = 4;
        }
        if (
            hitCount >= 5
            ||
            damage >= 80
            ||
            hp <= 15
        ) {
            level = 5;
        }
        return level;
    }
    function injuryLevelForSide(
        state,
        side
    ) {
        if (side === "A") {
            return getInjuryLevel(
                state.hitsA,
                state.damageTakenA,
                state.hpA
            );
        }
        return getInjuryLevel(
            state.hitsB,
            state.damageTakenB,
            state.hpB
        );
    }
    /* =========================================================
    INTRO META
    ========================================================= */
    function getIntroMeta(name, side) {
        const key =
            name.toLowerCase();
        const presets = {
            "떡볶이": {
                title:
                    "붉은 유혹의 지배자",
                type:
                    "매콤중독형 선택지",
                special:
                    "스트레스가 쌓일수록 전투력이 오르는 매운맛 타입",
                move:
                    "매콤 폭주"
            },
            "마라탕": {
                title:
                    "얼얼한 반전의 승부사",
                type:
                    "취향조합형 선택지",
                special:
                    "재료와 맵기 조합으로 변수를 만드는 전략형",
                move:
                    "얼얼한 심판"
            },
            "치킨": {
                title:
                    "바삭함의 절대강자",
                type:
                    "야식폭발형 선택지",
                special:
                    "포만감과 만족도를 앞세워 강력한 한 방을 노리는 타입",
                move:
                    "크런치 러시"
            },
            "피자": {
                title:
                    "치즈 왕국의 올라운더",
                type:
                    "토핑변신형 선택지",
                special:
                    "다양한 조합으로 웬만한 판에서 쉽게 무너지지 않는 타입",
                move:
                    "치즈 스트라이크"
            },
            "샐러드": {
                title:
                    "초록빛 양심의 수호자",
                type:
                    "건강방어형 선택지",
                special:
                    "부담을 줄이고 꾸준히 버티는 방어 특화 타입",
                move:
                    "그린 실드"
            }
        };
        if (presets[key]) {
            return {
                name,
                ...presets[key]
            };
        }
        if (side === "A") {
            return {
                name,
                title:
                    "핑크빛 직진 도전자",
                type:
                    "감정돌파형 선택지",
                special:
                    "오늘의 끌림을 무기로 예상 밖의 한 방을 노리는 타입",
                move:
                    `${name} 스매시`
            };
        }
        return {
            name,
            title:
                "보랏빛 반전의 승부사",
            type:
                "변칙운영형 선택지",
            special:
                "상황을 읽고 판세를 뒤집는 반전 특화 타입",
            move:
                `${name} 임팩트`
        };
    }
    /* =========================================================
    MOCK JUDGE TEXT
    ========================================================= */
    function getJudgeCopy(rule) {
        const lower =
            rule.toLowerCase();
        const presets = [
            {
                keys: [
                    "돈",
                    "가격",
                    "비용",
                    "가성비"
                ],
                summary:
                    "💸 돈 배틀은 지갑 눈치 싸움!",
                winTitle:
                    "💸 지갑 방어 성공!",
                loseTitle:
                    "🪙 매력은 있는데 통장이 움찔!",
                drawTitle:
                    "💸 지갑도 결정을 못 내렸다!",
                winReason:
                    "비용 부담은 덜하면서 만족까지 챙길 여지가 커 이번 판에서 한발 앞섰다. 통장 입장에서는 꽤 반가운 선택!",
                loseReason:
                    "충분히 매력은 있지만 비용 효율에서 살짝 밀렸다. 이번 판에서는 지갑 방어력이 조금 아쉽다.",
                drawReason:
                    "둘 다 크게 무리하는 선택은 아니라 돈 기준만으로는 확실한 차이를 만들기 어려웠다.",
                finalLine:
                    "돈 앞에서는 작은 차이도 체감은 크게 오는 법!"
            },
            {
                keys: [
                    "시간",
                    "속도",
                    "빠름"
                ],
                summary:
                    "⏱ 시간 배틀! 오늘은 누가 더 빠릿빠릿할까?",
                winTitle:
                    "⏱ 속전속결 한 방!",
                loseTitle:
                    "🐢 템포에서 살짝 밀렸다!",
                drawTitle:
                    "⏱ 둘 다 시간 차이는 비슷하다!",
                winReason:
                    "준비부터 실행까지 비교적 빠르게 이어질 가능성이 커 시간 싸움에서 우위를 잡았다. 급한 오늘엔 꽤 강한 장점!",
                loseReason:
                    "나쁜 선택은 아니지만 지금 필요한 속도감에서는 상대보다 한 박자 늦었다.",
                drawReason:
                    "둘 모두 시간 부담이 비슷해 이 기준만으로 확실한 우위를 정하기 어려웠다.",
                finalLine:
                    "오늘의 템포에서는 한 박자 빠른 선택지가 은근히 강하다."
            },
            {
                keys: [
                    "건강",
                    "다이어트",
                    "칼로리",
                    "몸"
                ],
                summary:
                    "🥬 건강 배틀은 양심과 욕망의 줄다리기!",
                winTitle:
                    "🥬 오늘의 양심이 고개를 끄덕!",
                loseTitle:
                    "🍟 마음은 가지만 몸이 살짝 말렸다!",
                drawTitle:
                    "🥬 양심과 욕망이 팽팽하다!",
                winReason:
                    "오늘 몸 상태를 생각했을 때 상대적으로 부담을 덜 남길 가능성이 보여 건강 기준에서 앞섰다.",
                loseReason:
                    "끌리는 매력은 강했지만 건강 점수에서는 살짝 조심스러운 모습. 이번 판은 양심에게 한 수 내줬다.",
                drawReason:
                    "어떻게 선택하고 조절하느냐에 따라 달라질 여지가 커 건강 기준에서는 쉽게 결판이 나지 않았다.",
                finalLine:
                    "건강 배틀에서는 작은 차이도 은근히 크게 작동했다."
            },
            {
                keys: [
                    "만족",
                    "행복",
                    "기분",
                    "힐링"
                ],
                summary:
                    "💖 만족도 배틀은 오늘의 마음 쟁탈전!",
                winTitle:
                    "💖 오늘의 마음을 먼저 훔쳤다!",
                loseTitle:
                    "🥺 끌리긴 했지만 한 끗 부족!",
                drawTitle:
                    "💖 둘 다 너무 끌린다!",
                winReason:
                    "지금의 기분과 욕망에 더 찰떡같이 맞아떨어져 만족도 배틀에서 우세를 잡았다. 오늘 행복 버튼은 이쪽!",
                loseReason:
                    "충분히 좋은 선택이지만 지금 마음을 더 강하게 흔든 쪽은 상대였다. 설렘 경쟁에서 살짝 밀렸다.",
                drawReason:
                    "둘 다 만족 포인트가 너무 확실해서 어느 한쪽의 압승이라고 말하기 어려운 접전이다.",
                finalLine:
                    "오늘의 마음은 결국 더 설레는 쪽으로 기울었다."
            },
            {
                keys: [
                    "재미",
                    "흥미",
                    "유쾌"
                ],
                summary:
                    "🎉 재미 배틀! 누가 오늘을 덜 심심하게 만들까?",
                winTitle:
                    "🎉 분위기를 제대로 끌어올렸다!",
                loseTitle:
                    "😗 재미 포인트가 살짝 약했다!",
                drawTitle:
                    "🎉 둘 다 꽤 신난다!",
                winReason:
                    "경험 자체의 즐거움과 텐션이 조금 더 강해 이번 라운드에서 분위기를 가져갔다.",
                loseReason:
                    "재미가 없는 건 아니지만 임팩트 경쟁에서는 살짝 밀린 모습이다.",
                drawReason:
                    "둘 다 충분한 재미 포인트가 있어 이 기준만으로는 쉽게 한쪽을 버리기 어렵다.",
                finalLine:
                    "재미는 결국 오늘의 텐션과 더 잘 맞는 쪽이 가져갔다."
            },
            {
                keys: [
                    "후회",
                    "리스크",
                    "안전"
                ],
                summary:
                    "🔮 미래의 나에게 욕먹지 않을 선택 찾기!",
                winTitle:
                    "🔮 뒤끝 방어 성공!",
                loseTitle:
                    "😵 나중에 살짝 아쉬울 수도!",
                drawTitle:
                    "🔮 후회 각도 비슷비슷하다!",
                winReason:
                    "선택하고 난 뒤 '아 그럴걸…' 할 가능성이 더 적어 보여 후회 최소화 기준에서 우위를 잡았다.",
                loseReason:
                    "매력은 강하지만 나중에 조금 아쉬움이 남을 여지가 있어 이번 판에서는 살짝 밀렸다.",
                drawReason:
                    "둘 다 치명적인 후회 포인트가 크지 않아 안정감 싸움도 팽팽하다.",
                finalLine:
                    "미래의 나에게 덜 혼나는 선택도 은근히 강한 승부수다."
            }
        ];
        const matched =
            presets.find(
                preset =>
                    preset.keys.some(
                        key =>
                            lower.includes(key)
                    )
            );
        if (matched) {
            return matched;
        }
        return {
            summary:
                `✨ ${rule} 배틀, 생각보다 꽤 치열하다!`,
            winTitle:
                "✨ 한 끗 차이로 앞섰다!",
            loseTitle:
                "💥 아쉽지만 이번 판은 밀렸다!",
            drawTitle:
                "✨ 아직 결판이 안 났다!",
            winReason:
                `'${rule}' 기준에서 조금 더 설득력 있는 장점을 보여주며 이번 판의 분위기를 가져갔다.`,
            loseReason:
                `'${rule}' 기준에서도 충분히 매력은 있었지만 결정적인 한 끗이 부족했다.`,
            drawReason:
                `'${rule}' 기준에서는 두 선택지 모두 쉽게 물러서지 않아 거의 비등하게 맞섰다.`,
            finalLine:
                `'${rule}' 기준에서 아주 작은 차이가 승부를 갈랐다.`
        };
    }
    async function createAIRoundResult(
        state,
        rule,
        roundLabel
    ) {
        const controller =
            new AbortController();

        const timeoutId =
            setTimeout(
                () => {
                    controller.abort();
                },
                25000
            );

        try {
            const response =
                await fetch(
                    "/api/battle",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                playerA:
                                    state.playerA,
                                playerB:
                                    state.playerB,
                                situation:
                                    state.situation,
                                criterion:
                                    rule
                            }),
                        signal:
                            controller.signal
                    }
                );

            let data = null;

            try {
                data =
                    await response.json();
            } catch {
                throw new Error(
                    "AI 서버 응답을 읽을 수 없어요."
                );
            }

            if (!response.ok) {
                const requestError =
                    new Error(
                        data?.error
                        ||
                        `AI 판정 요청 실패 (${response.status})`
                    );

                requestError.status =
                    response.status;

                throw requestError;
            }

            const scoreA =
                Number(data.scoreA);

            const scoreB =
                Number(data.scoreB);

            if (
                !Number.isFinite(scoreA)
                ||
                !Number.isFinite(scoreB)
                ||
                scoreA < 0
                ||
                scoreA > 100
                ||
                scoreB < 0
                ||
                scoreB > 100
            ) {
                throw new Error(
                    "AI 점수 형식이 올바르지 않아요."
                );
            }

            const normalizedScoreA =
                Math.round(scoreA);

            const normalizedScoreB =
                Math.round(scoreB);

            const winner =
                normalizedScoreA > normalizedScoreB
                    ? "A"
                    :
                    normalizedScoreB > normalizedScoreA
                        ? "B"
                        : "DRAW";

            const gap =
                Math.abs(
                    normalizedScoreA
                    -
                    normalizedScoreB
                );

            return {
                roundLabel,
                rule,
                scoreA:
                    normalizedScoreA,
                scoreB:
                    normalizedScoreB,
                winner,
                gap,
                damageInfo:
                    getDamageInfo(gap),
                summary:
                    normalizeText(data.summary)
                    ||
                    `✨ ${rule} 배틀, AI 심판 판정 완료!`,
                headlineA:
                    normalizeText(data.headlineA)
                    ||
                    (
                        winner === "A"
                            ? "✨ 이번 판의 승자!"
                            :
                            winner === "B"
                                ? "💥 이번 판은 아쉽다!"
                                : "✨ 막상막하!"
                    ),
                headlineB:
                    normalizeText(data.headlineB)
                    ||
                    (
                        winner === "B"
                            ? "✨ 이번 판의 승자!"
                            :
                            winner === "A"
                                ? "💥 이번 판은 아쉽다!"
                                : "✨ 막상막하!"
                    ),
                reasonA:
                    normalizeText(data.reasonA)
                    ||
                    "AI 심판이 PLAYER A를 이번 기준으로 평가했습니다.",
                reasonB:
                    normalizeText(data.reasonB)
                    ||
                    "AI 심판이 PLAYER B를 이번 기준으로 평가했습니다.",
                finalLine:
                    normalizeText(data.finalLine)
                    ||
                    `${rule} 기준의 AI 판정이 완료되었습니다.`
            };

        } catch (error) {
            if (
                error?.name
                ===
                "AbortError"
            ) {
                throw new Error(
                    "AI 판정 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해주세요."
                );
            }

            throw error;

        } finally {
            clearTimeout(
                timeoutId
            );
        }
    }
    /* =========================================================
    SPRITE HELPERS
    기존 SVG 그대로 사용
    얼굴 요소 새로 추가 안 함
    ========================================================= */
    function spriteRef(side, state = activeBattle) {
        if (state) {
            return side === "A"
                ? (state.spriteA || CHARACTER_SPRITES[playerACharacterIndex])
                : (state.spriteB || CHARACTER_SPRITES[playerBCharacterIndex]);
        }
        return side === "A"
            ? CHARACTER_SPRITES[playerACharacterIndex]
            : CHARACTER_SPRITES[playerBCharacterIndex];
    }
    function injuriesHTML() {
        return `
<div class="pf-injuries">
<span class="pf-bandage"></span>
<span class="pf-bandage-two"></span>
<span class="pf-bruise"></span>
<span class="pf-scratch-a"></span>
<span class="pf-scratch-b"></span>
</div>
`;
    }
    /* =========================================================
    SCENE SHELL
    ========================================================= */
    function renderSceneShell({
        showSkip = false
    } = {}) {
        battleResult.innerHTML = `
<div class="pf-scene">
${showSkip
                ? `
<div class="pf-scene-topbar">
<button
type="button"
class="pf-entry-skip"
id="pfEntrySkipButton"
>
ENTRY SKIP ▶
</button>
</div>
`
                : ""
            }
<div
class="pf-stage"
id="pfStage"
></div>
</div>
`;
        if (showSkip) {
            document
                .getElementById(
                    "pfEntrySkipButton"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        introSkipRequested =
                            true;
                    }
                );
        }
    }
    function removeEntrySkipButton() {
        document
            .getElementById(
                "pfEntrySkipButton"
            )
            ?.remove();
    }
    function setSceneStatus(text) {
        const status =
            document.getElementById(
                "pfSceneStatus"
            );
        if (status) {
            status.textContent =
                text;
        }
    }
    /* =========================================================
    ENTRY
    ========================================================= */
    function renderEntry(
        meta,
        side
    ) {
        const stage =
            document.getElementById(
                "pfStage"
            );
        if (!stage) return;
        setSceneStatus(
            `PLAYER ${side} ENTRY`
        );
        const entryTheme = characterThemeForSide(side);
        const scene = stage.closest(".pf-scene");
        if (scene) {
            scene.classList.add("pf-entry-themed");
            scene.style.setProperty("--pf-entry-1", entryTheme.entry1);
            scene.style.setProperty("--pf-entry-2", entryTheme.entry2);
            scene.style.setProperty("--pf-entry-3", entryTheme.entry3);
            scene.style.setProperty("--pf-entry-soft", entryTheme.soft);
            scene.style.setProperty("--pf-entry-accent", entryTheme.accent);
            scene.style.setProperty("--pf-entry-deep", entryTheme.deep);
            scene.style.setProperty(
                "background",
                `linear-gradient(180deg, ${entryTheme.entry1} 0 30%, ${entryTheme.entry2} 30% 67%, ${entryTheme.entry3} 67% 100%)`,
                "important"
            );
        }
        /* 실제 ENTRY 무대에도 직접 테마를 적용해 기본 보라 배경에 덮이지 않게 한다. */
        stage.style.setProperty(
            "background",
            `linear-gradient(180deg, ${entryTheme.entry1} 0 30%, ${entryTheme.entry2} 30% 67%, ${entryTheme.entry3} 67% 100%)`,
            "important"
        );
        const visual = `
<div class="pf-entry-visual">
<div class="pf-entry-frame">
<span class="pf-entry-number">
ENTRY ${side === "A" ? "001" : "002"}
</span>
<svg
class="pf-character-sprite"
viewBox="0 0 16 16"
>
<use
href="${spriteRef(side)}"
></use>
</svg>
</div>
</div>
`;
        const card = `
<article class="pf-entry-card">
<p class="pf-entry-kicker">
PLAYER ${side} ENTRY
</p>
<h3>
${escapeHTML(meta.name)}
</h3>
<p class="pf-entry-title">
「${escapeHTML(meta.title)}」
</p>
<div class="pf-entry-grid">
<div class="pf-entry-info">
<span>
TYPE
</span>
<strong>
${escapeHTML(meta.type)}
</strong>
</div>
<div class="pf-entry-info">
<span>
SIGNATURE MOVE
</span>
<strong>
${escapeHTML(meta.move)}
</strong>
</div>
<div class="pf-entry-info wide">
<span>
SPECIAL
</span>
<strong>
${escapeHTML(meta.special)}
</strong>
</div>
</div>
</article>
`;
        if (side === "A") {
            stage.innerHTML = `
<div class="pf-entry-screen">
${visual}
${card}
</div>
`;
        } else {
            stage.innerHTML = `
<div class="pf-entry-screen side-b">
${card}
${visual}
</div>
`;
        }
    }
    function renderVS(state) {
        const stage =
            document.getElementById(
                "pfStage"
            );
        if (!stage) return;
        setSceneStatus(
            "MATCH UP!"
        );
        const themeA = CHARACTER_THEMES[state.characterAIndex ?? playerACharacterIndex] || CHARACTER_THEMES[playerACharacterIndex];
        const themeB = CHARACTER_THEMES[state.characterBIndex ?? playerBCharacterIndex] || CHARACTER_THEMES[playerBCharacterIndex];
        const scene = stage.closest(".pf-scene");
        const vsBackground = `linear-gradient(90deg, ${themeA.entry3} 0 31%, ${themeA.entry2} 31% 40%, #2d294b 40% 60%, ${themeB.entry2} 60% 69%, ${themeB.entry3} 69% 100%)`;
        if (scene) {
            scene.classList.remove("pf-entry-themed");
            scene.classList.add("pf-vs-themed");
            scene.style.setProperty("--pf-vs-a-soft", themeA.soft);
            scene.style.setProperty("--pf-vs-a-accent", themeA.accent);
            scene.style.setProperty("--pf-vs-a-deep", themeA.deep);
            scene.style.setProperty("--pf-vs-a-entry2", themeA.entry2);
            scene.style.setProperty("--pf-vs-a-entry3", themeA.entry3);
            scene.style.setProperty("--pf-vs-b-soft", themeB.soft);
            scene.style.setProperty("--pf-vs-b-accent", themeB.accent);
            scene.style.setProperty("--pf-vs-b-deep", themeB.deep);
            scene.style.setProperty("--pf-vs-b-entry2", themeB.entry2);
            scene.style.setProperty("--pf-vs-b-entry3", themeB.entry3);
            scene.style.setProperty("background", vsBackground, "important");
        }
        stage.style.setProperty("background", vsBackground, "important");
        stage.innerHTML = `
<div class="pf-vs-screen">
<div class="pf-vs-side pf-vs-side-a">
<div class="pf-vs-character a">
<svg
class="pf-character-sprite"
viewBox="0 0 16 16"
>
<use href="${spriteRef("A", state)}"></use>
</svg>
</div>
<div class="pf-vs-name">
${escapeHTML(state.playerA)}
</div>
</div>
<div class="pf-vs-mark">
VS
</div>
<div class="pf-vs-side pf-vs-side-b">
<div class="pf-vs-character b">
<svg
class="pf-character-sprite"
viewBox="0 0 16 16"
>
<use href="${spriteRef("B", state)}"></use>
</svg>
</div>
<div class="pf-vs-name">
${escapeHTML(state.playerB)}
</div>
</div>
</div>
`;
    }
    function renderCountdown(text) {
        const stage =
            document.getElementById(
                "pfStage"
            );
        if (!stage) return;
        setSceneStatus(
            "BATTLE STARTING..."
        );
        stage.innerHTML = `
<div class="pf-countdown">
<div class="pf-countdown-text">
${escapeHTML(text)}
</div>
</div>
`;
    }
    async function playEntrySequence(state) {
        introSkipRequested =
            false;
        renderSceneShell({
            showSkip: true
        });
        battleResult.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        const metaA =
            getIntroMeta(
                state.playerA,
                "A"
            );
        const metaB =
            getIntroMeta(
                state.playerB,
                "B"
            );
        /* PLAYER A */
        renderEntry(
            metaA,
            "A"
        );
        await waitIntro(
            ENTRY_DURATION
        );
        if (introSkipRequested) {
            removeEntrySkipButton();
            return;
        }
        /* PLAYER B */
        renderEntry(
            metaB,
            "B"
        );
        await waitIntro(
            ENTRY_DURATION
        );
        if (introSkipRequested) {
            removeEntrySkipButton();
            return;
        }
        /* VS */
        renderVS(state);
        await waitIntro(
            VS_DURATION
        );
        if (introSkipRequested) {
            removeEntrySkipButton();
            return;
        }
        /* 3 */
        renderCountdown("3");
        await waitIntro(
            COUNT_DURATION
        );
        if (introSkipRequested) {
            removeEntrySkipButton();
            return;
        }
        /* 2 */
        renderCountdown("2");
        await waitIntro(
            COUNT_DURATION
        );
        if (introSkipRequested) {
            removeEntrySkipButton();
            return;
        }
        /* 1 */
        renderCountdown("1");
        await waitIntro(
            COUNT_DURATION
        );
        if (introSkipRequested) {
            removeEntrySkipButton();
            return;
        }
        /* FIGHT */
        renderCountdown("FIGHT!");
        await waitIntro(
            FIGHT_DURATION
        );
        removeEntrySkipButton();
    }
    /* =========================================================
    ARENA
    ========================================================= */
    function fighterHTML(
        state,
        side
    ) {
        const injury =
            injuryLevelForSide(
                state,
                side
            );
        return `
<div
class="pf-fighter"
id="pfFighter${side}"
>
<div
class="pf-win-tag"
id="pfWinTag${side}"
>
WIN!
</div>
<div
class="
pf-character-shell
injury-${injury}
"
id="pfShell${side}"
>
<svg
class="pf-character-sprite"
viewBox="0 0 16 16"
>
<use
href="${spriteRef(side)}"
></use>
</svg>
${injuriesHTML()}
</div>
<div
class="pf-character-shadow"
></div>
</div>
`;
    }
    function renderRoundArena(
        state,
        roundLabel,
        rule
    ) {
        /*
        ROUND 시작 시 ENTRY SKIP은 반드시 사라짐
        */
        removeEntrySkipButton();
        const stage =
            document.getElementById(
                "pfStage"
            );
        if (!stage) return;
        setSceneStatus(
            roundLabel
        );
        const scene = stage.closest(".pf-scene");
        if (scene) {
            scene.classList.remove("pf-entry-themed", "pf-vs-themed");
            scene.removeAttribute("style");
        }
        stage.style.removeProperty("background");
        stage.innerHTML = `
<div
class="pf-arena"
id="pfArena"
>
<div class="pf-round-header">
<div class="pf-rule-focus">
<span>
★ 이번 판정 기준 ★
</span>
<strong>
${escapeHTML(rule)}
</strong>
</div>
</div>
<div class="pf-round-chip">
${escapeHTML(roundLabel)}
</div>
<div class="pf-hud">
<div class="pf-hud-card">
<div class="pf-hud-top">
<strong>
${escapeHTML(state.playerA)}
</strong>
<span
class="pf-hp-label"
id="pfHpLabelA"
>
HP ${state.hpA}
</span>
</div>
<div class="pf-hp-bar">
<div
class="
pf-hp-fill
${getHpStageClass(state.hpA)}
"
id="pfHpFillA"
style="width:${state.hpA}%;background-color:${getHpStageColor(state.hpA)}"
></div>
</div>
</div>
<div class="pf-hud-card right">
<div class="pf-hud-top">
<strong>
${escapeHTML(state.playerB)}
</strong>
<span
class="pf-hp-label"
id="pfHpLabelB"
>
HP ${state.hpB}
</span>
</div>
<div class="pf-hp-bar">
<div
class="
pf-hp-fill
${getHpStageClass(state.hpB)}
"
id="pfHpFillB"
style="width:${state.hpB}%;background-color:${getHpStageColor(state.hpB)}"
></div>
</div>
</div>
</div>
<div class="pf-fighters">
${fighterHTML(
            state,
            "A"
        )}
${fighterHTML(
            state,
            "B"
        )}
<div
class="pf-slash a"
id="pfSlashA"
></div>
<div
class="pf-slash b"
id="pfSlashB"
></div>
<div
class="pf-impact"
id="pfImpact"
>
✦
</div>
<div id="pfEffectArea"></div>
</div>
<div id="pfRoundResultArea"></div>
</div>
`;
    }
    function updateHPDisplay(state) {
        const fillA = document.getElementById("pfHpFillA");
        const fillB = document.getElementById("pfHpFillB");
        const labelA = document.getElementById("pfHpLabelA");
        const labelB = document.getElementById("pfHpLabelB");
        const applyHp = (fill, hp) => {
            if (!fill) return;
            fill.style.width = `${hp}%`;
            fill.classList.remove(
                "hp-safe",
                "hp-caution",
                "hp-danger",
                "hp-critical",
                "danger"
            );
            const stageClass = getHpStageClass(hp);
            fill.classList.add(stageClass);
            fill.style.backgroundColor = getHpStageColor(hp);
            if (hp <= 15) {
                fill.classList.add("danger");
            }
        };
        applyHp(fillA, state.hpA);
        applyHp(fillB, state.hpB);
        if (labelA) labelA.textContent = `HP ${state.hpA}`;
        if (labelB) labelB.textContent = `HP ${state.hpB}`;
    }
    function refreshInjuries(state) {
        ["A", "B"].forEach(side => {
            const shell =
                document.getElementById(
                    `pfShell${side}`
                );
            if (!shell) return;
            shell.className =
                `pf-character-shell injury-${injuryLevelForSide(
                    state,
                    side
                )
                }`;
        });
    }
    function markRoundWinner(winner) {
        const fighterA =
            document.getElementById(
                "pfFighterA"
            );
        const fighterB =
            document.getElementById(
                "pfFighterB"
            );
        const tagA =
            document.getElementById(
                "pfWinTagA"
            );
        const tagB =
            document.getElementById(
                "pfWinTagB"
            );
        if (
            !fighterA
            ||
            !fighterB
            ||
            !tagA
            ||
            !tagB
        ) {
            return;
        }
        fighterA.classList.remove(
            "winner",
            "draw"
        );
        fighterB.classList.remove(
            "winner",
            "draw"
        );
        tagA.textContent =
            "WIN!";
        tagB.textContent =
            "WIN!";
        if (winner === "A") {
            fighterA.classList.add(
                "winner"
            );
        } else if (
            winner === "B"
        ) {
            fighterB.classList.add(
                "winner"
            );
        } else {
            fighterA.classList.add(
                "draw"
            );
            fighterB.classList.add(
                "draw"
            );
            tagA.textContent =
                "DRAW!";
            tagB.textContent =
                "DRAW!";
        }
    }
    function showEffect(
        title,
        description
    ) {
        const area =
            document.getElementById(
                "pfEffectArea"
            );
        if (!area) return;
        area.innerHTML = `
<div class="pf-effect">
${escapeHTML(title)}
<span>
${escapeHTML(description)}
</span>
</div>
`;
    }
    function clearEffect() {
        const area =
            document.getElementById(
                "pfEffectArea"
            );
        if (area) {
            area.innerHTML = "";
        }
    }
    function isAIBusyError(error) {
        const status =
            Number(error?.status || 0);

        const message =
            String(
                error?.message || ""
            );

        return (
            status === 429
            ||
            message.includes(
                "AI 심판이 지금 너무 바빠요"
            )
            ||
            message.includes(
                "429"
            )
        );
    }

    function waitForAIRetry(
        message
    ) {
        return new Promise(
            (resolve) => {
                const area =
                    document.getElementById(
                        "pfEffectArea"
                    );

                if (!area) {
                    resolve();
                    return;
                }

                area.innerHTML = `
<div
class="pf-effect pf-ai-retry-effect"
style="
top:50% !important;
width:min(420px,calc(100% - 40px));
min-width:0;
max-height:calc(100% - 16px);
box-sizing:border-box;
padding:18px 22px 17px;
white-space:normal;
overflow:hidden;
"
>
<div
style="
font-family:'Press Start 2P',cursive;
font-size:clamp(1rem,2.4vw,1.35rem);
line-height:1.55;
letter-spacing:.03em;
color:#fff1a9;
text-align:center;
"
>
AI JUDGE<br>BUSY
</div>

<span
style="
display:block;
margin-top:10px;
font-family:'Galmuri11',sans-serif;
font-size:clamp(.96rem,2vw,1.08rem);
font-weight:700;
line-height:1.65;
color:#fff9f0;
text-align:center;
word-break:keep-all;
overflow-wrap:anywhere;
"
>
${escapeHTML(
                    message
                    ||
                    "AI 심판이 잠깐 바빠요! 잠시 후 다시 판정해주세요."
                )}
</span>

<button
type="button"
id="pfAIRetryButton"
style="
display:block;
width:fit-content;
min-width:180px;
max-width:100%;
margin:12px auto 0;
padding:11px 18px 10px;
border:3px solid #fff1a9;
background:#f5c9dc;
color:#3c3150;
box-shadow:4px 4px 0 #171321;
font-family:'Galmuri11',sans-serif;
font-size:1rem;
font-weight:800;
line-height:1.25;
letter-spacing:0;
white-space:nowrap;
cursor:pointer;
"
>
↻ 다시 판정하기
</button>
</div>
`;

                const button =
                    document.getElementById(
                        "pfAIRetryButton"
                    );

                if (!button) {
                    resolve();
                    return;
                }

                button.addEventListener(
                    "click",
                    () => {
                        button.disabled =
                            true;

                        button.textContent =
                            "RETRYING...";

                        resolve();
                    },
                    {
                        once:
                            true
                    }
                );
            }
        );
    }


    /* =========================================================
    ATTACK
    ========================================================= */
    async function playAttack(
        state,
        result
    ) {
        const fighterA =
            document.getElementById(
                "pfFighterA"
            );
        const fighterB =
            document.getElementById(
                "pfFighterB"
            );
        const slashA =
            document.getElementById(
                "pfSlashA"
            );
        const slashB =
            document.getElementById(
                "pfSlashB"
            );
        const impact =
            document.getElementById(
                "pfImpact"
            );
        if (
            !fighterA
            ||
            !fighterB
            ||
            !slashA
            ||
            !slashB
            ||
            !impact
        ) {
            return;
        }
        /* DRAW */
        if (result.winner === "DRAW") {
            markRoundWinner("DRAW");
            showEffect(
                "DRAW!",
                "막상막하! 이번 라운드는 DAMAGE 없음."
            );
            await sleep(1300);
            clearEffect();
            return;
        }
        const attacker =
            result.winner === "A"
                ? fighterA
                : fighterB;
        const defender =
            result.winner === "A"
                ? fighterB
                : fighterA;
        const attackClass =
            result.winner === "A"
                ? "attacking-a"
                : "attacking-b";
        const hitClass =
            result.winner === "A"
                ? "hit-b"
                : "hit-a";
        const slash =
            result.winner === "A"
                ? slashA
                : slashB;
        /*
        1. 바람 가르는 효과
        */
        slash.classList.add(
            "show"
        );
        await sleep(360);
        /*
        2. 공격자가 돌진
        */
        attacker.classList.add(
            attackClass
        );
        await sleep(420);
        /*
        3. 충돌
        */
        impact.classList.add(
            "show"
        );
        defender.classList.add(
            hitClass
        );
        /*
        4. DAMAGE
        */
        if (result.winner === "A") {
            state.hpB =
                Math.max(
                    0,
                    state.hpB
                    -
                    result.damageInfo.damage
                );
            if (
                result.damageInfo.damage > 0
            ) {
                state.hitsB +=
                    1;
            }
            state.damageTakenB +=
                result.damageInfo.damage;
        } else {
            state.hpA =
                Math.max(
                    0,
                    state.hpA
                    -
                    result.damageInfo.damage
                );
            if (
                result.damageInfo.damage > 0
            ) {
                state.hitsA +=
                    1;
            }
            state.damageTakenA +=
                result.damageInfo.damage;
        }
        updateHPDisplay(state);
        refreshInjuries(state);
        markRoundWinner(
            result.winner
        );
        /*
        맞고 밀려나는 모습을 먼저 보여준다.
        */
        await sleep(820);
        /*
        그 다음 HIT 결과 표시
        */
        showEffect(
            result.damageInfo.label,
            `${result.damageInfo.desc} · -${result.damageInfo.damage} HP`
        );
        await sleep(1300);
        clearEffect();
        attacker.classList.remove(
            attackClass
        );
        defender.classList.remove(
            hitClass
        );
        slash.classList.remove(
            "show"
        );
        impact.classList.remove(
            "show"
        );
    }
    /* =========================================================
    ROUND RESULT
    ========================================================= */
    function judgeClass(
        result,
        side
    ) {
        if (result.winner === "DRAW") {
            return "draw";
        }
        return result.winner === side
            ? "winner"
            : "loser";
    }
    function judgeBadge(
        result,
        side
    ) {
        if (result.winner === "DRAW") {
            return "DRAW";
        }
        return result.winner === side
            ? "WIN"
            : "LOSE";
    }
    function renderRoundResult(
        state,
        result
    ) {
        const area =
            document.getElementById(
                "pfRoundResultArea"
            );
        if (!area) return;
        state.totalScoreA +=
            result.scoreA;
        state.totalScoreB +=
            result.scoreB;
        state.roundResults.push(
            result
        );
        area.innerHTML = `
<div class="pf-round-summary">
${escapeHTML(
            result.summary
        )}
</div>
<div class="pf-score-row">
<div class="pf-score-side">
<span>
${escapeHTML(state.playerA)}
</span>
<strong>
${result.scoreA}
</strong>
</div>
<div class="pf-score-mid">
SCORE
</div>
<div class="pf-score-side">
<span>
${escapeHTML(state.playerB)}
</span>
<strong>
${result.scoreB}
</strong>
</div>
</div>
<div class="pf-judge-panel">
<p class="pf-judge-title">
JUDGE RESULT
</p>
<div class="pf-judge-grid">
<div
class="
pf-judge-card
${judgeClass(
            result,
            "A"
        )}
"
>
<div class="pf-judge-head">
<strong>
${escapeHTML(state.playerA)}
</strong>
<span class="pf-judge-badge">
${judgeBadge(
            result,
            "A"
        )}
</span>
</div>
<p class="pf-judge-flavor">
${escapeHTML(
            result.headlineA
        )}
</p>
<p>
${escapeHTML(
            result.reasonA
        )}
</p>
</div>
<div
class="
pf-judge-card
${judgeClass(
            result,
            "B"
        )}
"
>
<div class="pf-judge-head">
<strong>
${escapeHTML(state.playerB)}
</strong>
<span class="pf-judge-badge">
${judgeBadge(
            result,
            "B"
        )}
</span>
</div>
<p class="pf-judge-flavor">
${escapeHTML(
            result.headlineB
        )}
</p>
<p>
${escapeHTML(
            result.reasonB
        )}
</p>
</div>
</div>
</div>
`;
    }
    /* =========================================================
    WAIT ACTION
    ========================================================= */
    function waitForButtons(configs) {
        return new Promise(resolve => {
            const area =
                document.getElementById(
                    "pfRoundResultArea"
                );
            if (!area) {
                resolve(null);
                return;
            }
            const row =
                document.createElement("div");
            row.className =
                "pf-action-row";
            configs.forEach(config => {
                const button =
                    document.createElement("button");
                button.type =
                    "button";
                button.className =
                    `pf-action-btn ${config.variant || ""}`;
                button.textContent =
                    config.label;
                button.addEventListener(
                    "click",
                    () => {
                        row
                            .querySelectorAll("button")
                            .forEach(btn => {
                                btn.disabled =
                                    true;
                            });
                        resolve(
                            config.value
                        );
                    }
                );
                row.appendChild(
                    button
                );
            });
            area.appendChild(
                row
            );
        });
    }
    /* =========================================================
    RUN ROUND
    ========================================================= */
    async function runRound(
        state,
        rule,
        label,
        _seedKey
    ) {
        renderRoundArena(
            state,
            label,
            rule
        );
        await sleep(250);

        let result;

        while (!result) {
            /*
            AI 응답이 실제로 도착할 때까지
            가운데 판정중 창을 유지한다.
            */
            showEffect(
                "AI JUDGE...",
                "판정 중입니다! 잠시만 기다려주세요."
            );

            try {
                result =
                    await createAIRoundResult(
                        state,
                        rule,
                        label
                    );

                /*
                응답을 받은 뒤에만 로딩창을 닫고
                기존 공격 모션으로 넘어간다.
                */
                clearEffect();

            } catch (error) {
                clearEffect();

                /*
                429 최종 실패일 때는
                현재 PLAYER / HP / RULE / ROUND를 그대로 유지하고
                사용자가 같은 라운드만 다시 요청할 수 있게 한다.
                */
                if (
                    isAIBusyError(
                        error
                    )
                ) {
                    await waitForAIRetry(
                        error?.message
                        ||
                        "AI 심판이 잠깐 바빠요! 잠시 후 다시 판정해주세요."
                    );

                    continue;
                }

                showEffect(
                    "AI ERROR",
                    error?.message
                    ||
                    "AI 판정 중 오류가 발생했습니다."
                );

                showMessage(
                    error?.message
                    ||
                    "AI 판정 중 오류가 발생했습니다.",
                    "error"
                );

                battleRunning =
                    false;

                throw error;
            }
        }
        await playAttack(
            state,
            result
        );
        renderRoundResult(
            state,
            result
        );
        return result;
    }
    /* =========================================================
    FINAL ROUND CHOICE
    항상 등장
    ========================================================= */
    async function askFinalRoundChoice(state) {
        const area =
            document.getElementById(
                "pfRoundResultArea"
            );
        if (!area) {
            return "final";
        }
        const hpDiff =
            Math.abs(
                state.hpA
                -
                state.hpB
            );
        const isDraw =
            hpDiff === 0;
        const close =
            hpDiff <= 12;
        const box =
            document.createElement("div");
        box.className =
            `pf-round-choice-box${isDraw ? " pf-round-choice-draw" : ""}`;

        if (isDraw) {
            box.innerHTML = `
<h3>
⚔ 동점이에요! 새로운 RULE 하나로 한 번 더 결판내야 해요.
</h3>
<p>
현재 HP가 ${state.hpA} : ${state.hpB}로 완전히 같아요.<br>
지금까지 쓰지 않은 RULE 하나를 추가해서 진짜 마지막 승부를 진행해요!
</p>
<div class="pf-action-row pf-action-row-single">
<button
type="button"
class="pf-action-btn"
id="pfForcedDeathChoiceButton"
>
⚔ 찐막 결판내기
</button>
</div>
`;
            area.appendChild(box);
            return new Promise(resolve => {
                document
                    .getElementById(
                        "pfForcedDeathChoiceButton"
                    )
                    ?.addEventListener(
                        "click",
                        () => {
                            resolve(
                                "death"
                            );
                        }
                    );
            });
        }

        box.innerHTML = `
<h3>
${close
                ?
                "⚠ 이대로 끝내기엔 좀 찝찝한데...?"
                :
                "결판은 났다! 그래도 한 판 더?"
            }
</h3>
<p>
${close
                ?
                `두 선택지의 차이가 크지 않아요.<br>
지금 결과로 PICK을 확정하거나,
새로운 RULE 하나로 진짜 마지막 결판을 낼 수 있어요.`
                :
                `현재 결과로 오늘의 PICK을 확정해도 충분해요.<br>
그래도 마지막으로 다른 기준을 확인하고 싶다면 한 판 더!`
            }
</p>
<div class="pf-action-row">
<button
type="button"
class="pf-action-btn pink"
id="pfFinalizeChoiceButton"
>
이대로 판정하기
</button>
<button
type="button"
class="pf-action-btn"
id="pfDeathChoiceButton"
>
한 번 더 결판내기
</button>
</div>
`;
        area.appendChild(box);
        return new Promise(resolve => {
            document
                .getElementById(
                    "pfFinalizeChoiceButton"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        resolve(
                            "final"
                        );
                    }
                );
            document
                .getElementById(
                    "pfDeathChoiceButton"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        resolve(
                            "death"
                        );
                    }
                );
        });
    }
    /* =========================================================
    ENTER DEATH MATCH RULE MODE
    ========================================================= */
    function enterDeathMatchRuleMode(forcedDraw = false) {
        deathMatchRuleMode =
            true;
        deathMatchRule =
            "";
        battleRunning =
            false;
        /*
        PLAYER + 상황 잠금 유지.
        custom rule만 다시 사용 가능.
        */
        lockMainInputs();
        if (customRuleInput) {
            customRuleInput.disabled =
                false;
        }
        if (addRuleButton) {
            addRuleButton.disabled =
                false;
        }
        renderSelectedRules();
        updateFightButtonState();
        /*
        기존 메인 FIGHT는 계속 비활성화.
        */
        if (fightButton) {
            fightButton.disabled =
                true;
            fightButton.classList.remove(
                "pf-fight-ready"
            );
        }
        criteriaBox?.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });
        showMessage(
            forcedDraw
                ? "HP가 완전히 같아요! 새 RULE 하나를 골라 SUDDEN DEATH로 결판내세요 ♡"
                : "마지막 결판용 새 RULE 하나를 골라주세요! 이미 사용한 RULE은 잠겨 있어요 ♡",
            "success"
        );
    }
    /* =========================================================
    FINAL WINNER
    ========================================================= */
    function decideWinner(state) {
        /*
        최종 판정은 남은 HP만 사용한다.
        라운드 승수 / 누적 SCORE는 최종 승자 결정에 사용하지 않는다.
        */
        if (state.hpA > state.hpB) {
            return {
                winner: "A",
                method: state.hpB <= 0 ? "K.O." : "HP DECISION"
            };
        }
        if (state.hpB > state.hpA) {
            return {
                winner: "B",
                method: state.hpA <= 0 ? "K.O." : "HP DECISION"
            };
        }
        return {
            winner: "DRAW",
            method: "HP DRAW"
        };
    }
    /* =========================================================
    FINAL COPY
    ========================================================= */
    function getKoreanSubjectParticle(word) {
        const text =
            String(word || "").trim();

        if (!text) {
            return "가";
        }

        const lastChar =
            text.slice(-1);

        const lastCode =
            lastChar.charCodeAt(0);

        if (
            lastCode >= 0xAC00
            && lastCode <= 0xD7A3
        ) {
            const hasBatchim =
                (lastCode - 0xAC00) % 28 !== 0;

            return hasBatchim
                ? "이"
                : "가";
        }

        return "가";
    }


    function buildRoundFinalText(
        state,
        round
    ) {
        if (
            round.winner
            === "DRAW"
        ) {
            return (
                `${round.rule} 기준에서는 `
                +
                `둘 다 쉽게 물러서지 않았다. `
                +
                round.finalLine
            );
        }
        const winnerName =
            round.winner === "A"
                ? state.playerA
                : state.playerB;

        const subjectParticle =
            getKoreanSubjectParticle(
                winnerName
            );

        return (
            `${winnerName}${subjectParticle} 한 끗 앞서 `
            +
            `이 판의 분위기를 가져갔다. `
            +
            round.finalLine
        );
    }
    function crownHTML() {
        return `
<div class="pf-pixel-crown">
<i class="c1"></i>
<i class="c2"></i>
<i class="c3"></i>
<i class="c4"></i>
<i class="c5"></i>
<i class="base"></i>
</div>
`;
    }
    function finalFighterHTML(
        state,
        side,
        decision
    ) {
        const winner =
            decision.winner === side;
        const defeated =
            !winner;
        const isKO =
            defeated
            &&
            decision.method === "K.O.";
        const injury =
            winner
                ?
                injuryLevelForSide(
                    state,
                    side
                )
                :
                Math.max(
                    4,
                    injuryLevelForSide(
                        state,
                        side
                    )
                );
        return `
<div
class="
pf-final-fighter
${winner ? "winner" : "defeated"}
${defeated
                ?
                (
                    isKO
                        ? "ko-loss"
                        : "decision-loss"
                )
                :
                ""
            }
"
>
${winner
                ? `
<div
class="
pf-final-side-tag
winner
"
>
WIN!
</div>
<div class="pf-halo"></div>
${crownHTML()}
`
                : `
<div
class="
pf-final-side-tag
loser
"
>
DEFEATED
</div>
`
            }
<div
class="
pf-final-character
injury-${injury}
"
>
<svg
class="pf-character-sprite"
viewBox="0 0 16 16"
>
<use
href="${spriteRef(side)}"
></use>
</svg>
${injuriesHTML()}
</div>
<div class="pf-final-shadow"></div>
</div>
`;
    }
    /* =========================================================
    END BUTTONS
    ========================================================= */
    function gameEndButtonsHTML() {
        return `
<div class="pf-game-end-actions">
<button
type="button"
class="pf-game-end-btn new"
id="pfNewBattleButton"
>
⚔ NEW BATTLE!
</button>
<button
type="button"
class="pf-game-end-btn exit"
id="pfExitGameButton"
>
게임 종료
</button>
</div>
`;
    }
    /* =========================================================
    FINAL RESULT
    ========================================================= */
    function renderFinalResult(state) {
        const stage =
            document.getElementById(
                "pfStage"
            );
        if (!stage) return;
        deathMatchRuleMode =
            false;
        removeDeathMatchControls();
        const decision =
            decideWinner(state);
        setSceneStatus(
            "MATCH RESULT"
        );
        /*
        최종 결판이 난 뒤에도
        메인 FIGHT는 다시 활성화하지 않는다.
        */
        battleRunning =
            false;
        matchCompleted =
            true;
        matchStarted =
            true;
        updateFightButtonState();
        /* DRAW safety: 별도 결과 화면을 만들지 않고 SUDDEN DEATH RULE 선택으로 보낸다. */
        if (
            decision.winner === "DRAW"
        ) {
            matchCompleted = false;
            matchStarted = true;
            enterDeathMatchRuleMode(true);
            return;
        }
        const winnerName =
            decision.winner === "A"
                ? state.playerA
                : state.playerB;
        const winnerHp =
            decision.winner === "A"
                ? state.hpA
                : state.hpB;
        const loserHp =
            decision.winner === "A"
                ? state.hpB
                : state.hpA;
        stage.innerHTML = `
<div class="pf-final-wrap">
<div class="pf-final-stage">
<div class="pf-final-grid">
${finalFighterHTML(
            state,
            "A",
            decision
        )}
${finalFighterHTML(
            state,
            "B",
            decision
        )}
</div>
</div>
<div class="pf-final-summary">
<h2>
MATCH RESULT
</h2>
<div class="pf-final-judgement">
<h3>
최종 판결문
</h3>
<div class="pf-final-round-list">
${state.roundResults
                .map(round => `
<div
class="
pf-final-round-item
${round.roundLabel
                        ===
                        "SUDDEN DEATH"
                        ? "sudden"
                        : ""
                    }
"
>
<strong>
${escapeHTML(
                        round.roundLabel
                    )}
·
${escapeHTML(
                        round.rule
                    )}
</strong>
<p>
${escapeHTML(
                        buildRoundFinalText(
                            state,
                            round
                        )
                    )}
</p>
</div>
`)
                .join("")
            }
</div>
<div class="pf-final-pick">
<span>
모든 판정을 종합한 오늘의 PICK
</span>
<strong>
👑
${escapeHTML(winnerName)}
👑
</strong>
<em>
${state.deathMatchPlayed
                ?
                `기본전으로도 모자라 마지막 결판까지 붙여봤다!<br>
결국 끝까지 살아남은 오늘의 선택은 ${escapeHTML(winnerName)}.`
                :
                `${escapeHTML(winnerName)}${getKoreanSubjectParticle(winnerName)} 끝까지 더 강한 설득력을 보여줬다!`
            }
<br>
남은 HP ${winnerHp},
상대는 ${loserHp}.
<br>
오늘 고민은 여기서 K.O. ♡
</em>
</div>
</div>
${gameEndButtonsHTML()}
</div>
</div>
`;
        finalizeBattleLog(
            state,
            decision
        );
        bindFinalButtons();
    }
    /* =========================================================
    BATTLE LOG
    최종 확정 후 딱 1번 저장
    ========================================================= */
    function finalizeBattleLog(
        state,
        decision
    ) {
        if (state.completed) {
            return;
        }
        state.completed =
            true;
        addBattleLog(
            state,
            decision
        );
    }
    function addBattleLog(
        state,
        decision
    ) {
        if (!battleLogList) {
            return;
        }
        const empty =
            battleLogList.querySelector(
                ".empty-log"
            );
        if (empty) {
            empty.remove();
        }
        const winner =
            decision.winner === "DRAW"
                ?
                "무승부"
                :
                decision.winner === "A"
                    ? state.playerA
                    : state.playerB;
        const now =
            new Date();
        const timestamp =
            `${now.getFullYear()}.`
            +
            `${String(
                now.getMonth() + 1
            ).padStart(2, "0")}.`
            +
            `${String(
                now.getDate()
            ).padStart(2, "0")} `
            +
            `${String(
                now.getHours()
            ).padStart(2, "0")}:`
            +
            `${String(
                now.getMinutes()
            ).padStart(2, "0")}`;
        const card =
            document.createElement("article");
        card.className =
            "log-card";
        const suddenRound =
            state.roundResults.find(
                round =>
                    round.roundLabel
                    ===
                    "SUDDEN DEATH"
            );
        card.innerHTML = `
<div class="log-card-header">
<strong>
${escapeHTML(state.playerA)}
VS
${escapeHTML(state.playerB)}
</strong>
<span>
${escapeHTML(timestamp)}
</span>
</div>
<div class="log-card-body">
<p>
<strong>
오늘의 PICK
</strong>
:
${escapeHTML(winner)}
</p>
<p>
<strong>
기본 RULE
</strong>
:
${escapeHTML(
            state.baseRules.join(" / ")
        )}
</p>
${suddenRound
                ? `
<p>
<strong>
SUDDEN DEATH
</strong>
:
${escapeHTML(
                    suddenRound.rule
                )}
</p>
`
                : ""
            }
</div>
`;
        battleLogList.prepend(
            card
        );
    }
    /* =========================================================
    NEW BATTLE
    ========================================================= */
    function startNewBattle() {
        activeBattle =
            null;
        selectedRules =
            [];
        deathMatchRule =
            "";
        deathMatchRuleMode =
            false;
        battleRunning =
            false;
        matchStarted =
            false;
        matchCompleted =
            false;
        introSkipRequested =
            false;
        playerAConfirmed =
            false;
        playerBConfirmed =
            false;
        unlockAllInputs();
        if (playerAInput) {
            playerAInput.value =
                "";
        }
        if (playerBInput) {
            playerBInput.value =
                "";
        }
        if (situationInput) {
            situationInput.value =
                "";
        }
        if (customRuleInput) {
            customRuleInput.value =
                "";
        }
        removeDeathMatchControls();
        document
            .getElementById(
                "pfDeathRuleGuide"
            )
            ?.remove();
        criteriaButtons.forEach(button => {
            button.disabled =
                false;
            button.classList.remove(
                "selected",
                "pf-used-rule"
            );
            button.setAttribute(
                "aria-pressed",
                "false"
            );
        });
        renderPlayerStatus("A");
        renderPlayerStatus("B");
        updateSituationStatus();
        renderSelectedRules();
        clearMessage();
        updateFightButtonState();
        if (battleResult) {
            battleResult.innerHTML = `
<p class="result-placeholder">
READY... 두 선수를 기다리는 중!
</p>
`;
        }
        const arenaTarget =
            playerACard
            ||
            playerAInput;
        arenaTarget?.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });
    }
    /* =========================================================
    EXIT → BATTLE LOG
    ========================================================= */
    function exitToBattleLog() {
        /*
        id 이름이 무엇이든
        battleLogList의 가까운 section을 우선 찾음.
        */
        const target =
            document.getElementById(
                "battle-log"
            )
            ||
            battleLogList?.closest("section")
            ||
            battleLogList;
        target?.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });
    }
    function bindFinalButtons() {
        document
            .getElementById(
                "pfNewBattleButton"
            )
            ?.addEventListener(
                "click",
                startNewBattle
            );
        document
            .getElementById(
                "pfExitGameButton"
            )
            ?.addEventListener(
                "click",
                exitToBattleLog
            );
    }
    /* =========================================================
    BASE MATCH
    ========================================================= */
    async function runBaseBattle() {
        if (
            matchStarted
            ||
            battleRunning
        ) {
            return;
        }
        if (
            !playerAConfirmed
            ||
            !playerBConfirmed
        ) {
            showMessage(
                "PLAYER A와 PLAYER B를 입력 완료해주세요!",
                "error"
            );
            return;
        }
        if (
            selectedRules.length < 1
            ||
            selectedRules.length > 3
        ) {
            showMessage(
                "RULE은 1개 이상, 최대 3개까지 설정해주세요!",
                "error"
            );
            return;
        }
        const state =
            createBattleState();
        if (
            state.playerA.toLowerCase()
            ===
            state.playerB.toLowerCase()
        ) {
            showMessage(
                "같은 선택지끼리는 싸울 수 없어요!",
                "error"
            );
            return;
        }
        /*
        여기서부터 메인 FIGHT 잠금.
        */
        matchStarted =
            true;
        matchCompleted =
            false;
        battleRunning =
            true;
        activeBattle =
            state;
        deathMatchRuleMode =
            false;
        deathMatchRule =
            "";
        updateFightButtonState();
        lockMainInputs();
        renderSelectedRules();
        clearMessage();
        /*
        ENTRY
        */
        await playEntrySequence(
            state
        );
        /*
        ENTRY SKIP을 눌렀든 안 눌렀든
        여기서 바로 ROUND 1
        */
        introSkipRequested =
            false;
        removeEntrySkipButton();
        /*
        BASE ROUNDS
        */
        for (
            let index = 0;
            index < state.baseRules.length;
            index++
        ) {
            const rule =
                state.baseRules[index];
            const label =
                getRoundLabel(
                    index,
                    state.baseRules.length
                );
            await runRound(
                state,
                rule,
                label,
                `BASE-${index}`
            );
            /*
            KO 났으면 연장 없음
            */
            if (
                state.hpA <= 0
                ||
                state.hpB <= 0
            ) {
                await waitForButtons([
                    {
                        label:
                            "★ 최종 판정 보기 ★",
                        value:
                            "final",
                        variant:
                            "pink"
                    }
                ]);
                renderFinalResult(
                    state
                );
                return;
            }
            const last =
                index
                ===
                state.baseRules.length - 1;
            /*
            다음 라운드
            */
            if (!last) {
                await waitForButtons([
                    {
                        label:
                            "▶ NEXT ROUND GO!",
                        value:
                            "next"
                    }
                ]);
                continue;
            }
            /*
            FINAL ROUND 끝
            항상 두 선택지
            */
            const choice =
                await askFinalRoundChoice(
                    state
                );
            /*
            한 번 더 결판내기
            */
            if (choice === "death") {
                enterDeathMatchRuleMode();
                return;
            }
            /*
            이대로 판정
            */
            renderFinalResult(
                state
            );
            return;
        }
    }
    /* =========================================================
    SUDDEN DEATH
    ========================================================= */
    async function runDeathMatch() {
        if (
            !activeBattle
            ||
            !deathMatchRuleMode
            ||
            !deathMatchRule
            ||
            battleRunning
        ) {
            return;
        }
        const state =
            activeBattle;
        battleRunning =
            true;
        clearMessage();
        /*
        데스매치 버튼 잠금
        */
        renderDeathMatchControls();
        /*
        ENTRY는 다시 안 함.
        전투화면으로 바로 이동.
        */
        renderSceneShell({
            showSkip: false
        });
        battleResult.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });
        renderCountdown(
            "SUDDEN"
        );
        await sleep(
            650
        );
        renderCountdown(
            "DEATH!"
        );
        await sleep(
            850
        );
        await runRound(
            state,
            deathMatchRule,
            "SUDDEN DEATH",
            "DEATH-MATCH"
        );
        state.deathMatchPlayed =
            true;
        /*
        최종 HP가 다시 같으면 renderFinalResult에서
        같은 SUDDEN DEATH RULE 선택 흐름으로 재진입한다.
        */
        await waitForButtons([
            {
                label:
                    "★ LAST JUDGEMENT · 최종 판정 보기 ★",
                value:
                    "final",
                variant:
                    "pink"
            }
        ]);
        deathMatchRuleMode =
            false;
        removeDeathMatchControls();
        renderFinalResult(
            state
        );
    }
    /* =========================================================
    EVENTS
    ========================================================= */
    function bindEvents() {
        /* PLAYER A */
        playerAInput?.addEventListener(
            "input",
            () => {
                if (matchStarted) {
                    return;
                }
                playerAConfirmed =
                    false;
                renderPlayerStatus(
                    "A"
                );
                updateFightButtonState();
            }
        );
        playerAInput?.addEventListener(
            "blur",
            () => {
                confirmPlayer(
                    "A"
                );
            }
        );
        playerAInput?.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !== "Enter"
                    ||
                    matchStarted
                ) {
                    return;
                }
                event.preventDefault();
                confirmPlayer(
                    "A"
                );
                playerAInput.blur();
            }
        );
        /* PLAYER B */
        playerBInput?.addEventListener(
            "input",
            () => {
                if (matchStarted) {
                    return;
                }
                playerBConfirmed =
                    false;
                renderPlayerStatus(
                    "B"
                );
                updateFightButtonState();
            }
        );
        playerBInput?.addEventListener(
            "blur",
            () => {
                confirmPlayer(
                    "B"
                );
            }
        );
        playerBInput?.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !== "Enter"
                    ||
                    matchStarted
                ) {
                    return;
                }
                event.preventDefault();
                confirmPlayer(
                    "B"
                );
                playerBInput.blur();
            }
        );
        /* SITUATION */
        situationInput?.addEventListener(
            "input",
            () => {
                if (matchStarted) {
                    return;
                }
                updateSituationStatus();
            }
        );
        /* PRESET RULE */
        criteriaButtons.forEach(button => {
            button.setAttribute(
                "aria-pressed",
                "false"
            );
            button.addEventListener(
                "click",
                () => {
                    const rule =
                        normalizeText(
                            button.dataset.value
                        );
                    if (!rule) return;
                    /*
                    SUDDEN DEATH RULE
                    */
                    if (deathMatchRuleMode) {
                        if (wasRuleUsed(rule)) {
                            return;
                        }
                        if (
                            deathMatchRule
                            &&
                            deathMatchRule.toLowerCase()
                            ===
                            rule.toLowerCase()
                        ) {
                            deathMatchRule =
                                "";
                            renderSelectedRules();
                            return;
                        }
                        selectDeathRule(
                            rule
                        );
                        return;
                    }
                    /*
                    경기 시작 후 기본 RULE 수정 금지
                    */
                    if (matchStarted) {
                        return;
                    }
                    /*
                    BASE RULE toggle
                    */
                    if (baseRuleExists(rule)) {
                        selectedRules =
                            selectedRules.filter(
                                item =>
                                    item.toLowerCase()
                                    !==
                                    rule.toLowerCase()
                            );
                        renderSelectedRules();
                        return;
                    }
                    addBaseRule(
                        rule
                    );
                }
            );
        });
        /* CUSTOM RULE */
        function handleCustomRule() {
            const value =
                normalizeText(
                    customRuleInput?.value
                );
            if (!value) {
                showMessage(
                    "RULE 이름을 입력해주세요!",
                    "error"
                );
                return;
            }
            /*
            DEATH MATCH
            */
            if (deathMatchRuleMode) {
                if (
                    selectDeathRule(
                        value
                    )
                ) {
                    customRuleInput.value =
                        "";
                }
                return;
            }
            /*
            기본 경기 시작 후에는 수정 불가
            */
            if (matchStarted) {
                return;
            }
            if (
                addBaseRule(
                    value
                )
            ) {
                customRuleInput.value =
                    "";
            }
        }
        addRuleButton?.addEventListener(
            "click",
            handleCustomRule
        );
        customRuleInput?.addEventListener(
            "keydown",
            event => {
                if (event.key !== "Enter") {
                    return;
                }
                event.preventDefault();
                handleCustomRule();
            }
        );
        /* MAIN FIGHT */
        fightButton?.addEventListener(
            "click",
            async () => {
                /* 같은 캐릭터 선택은 허용하지 않는다. */
                if (playerACharacterIndex === playerBCharacterIndex) {
                    showMessage("PLAYER A와 PLAYER B는 서로 다른 캐릭터를 선택해주세요!", "error");
                    return;
                }
                /*
                한번 시작한 경기에서는
                절대 다시 실행하지 않는다.
                */
                if (
                    matchStarted
                    ||
                    battleRunning
                ) {
                    return;
                }
                await runBaseBattle();
            }
        );
    }
    /* =========================================================
    CHARACTER CAROUSEL + PIXEL UI ENHANCEMENT
    합의된 범위만 보강
    ========================================================= */
    function characterIndexForSide(side) {
        return side === "A"
            ? playerACharacterIndex
            : playerBCharacterIndex;
    }
    function setCharacterIndexForSide(side, index) {
        const total = CHARACTER_SPRITES.length;
        const safe = ((index % total) + total) % total;
        if (side === "A") {
            playerACharacterIndex = safe;
        } else {
            playerBCharacterIndex = safe;
        }
    }
    function characterThemeForSide(side) {
        return CHARACTER_THEMES[characterIndexForSide(side)] || CHARACTER_THEMES[0];
    }
    function applyCharacterThemeToCard(side) {
        const card = side === "A" ? playerACard : playerBCard;
        if (!card) return;
        const theme = characterThemeForSide(side);
        card.style.setProperty("--pf-char-soft", theme.soft);
        card.style.setProperty("--pf-char-accent", theme.accent);
        card.style.setProperty("--pf-char-deep", theme.deep);
        /* 기존 A=핑크 / B=보라 고정색보다 선택 캐릭터 테마를 우선한다. */
        card.style.setProperty("background-color", theme.soft, "important");
        card.style.setProperty(
            "background-image",
            `linear-gradient(90deg, rgba(255,255,255,.14) 0 4px, transparent 4px 12px)`,
            "important"
        );
        card.style.setProperty("background-size", "12px 12px", "important");
        card.style.setProperty("border-color", theme.accent, "important");
        card.style.setProperty("box-shadow", `6px 6px 0 ${theme.accent}`, "important");
    }
    function nextAvailableCharacterIndex(side, startIndex, direction) {
        const total = CHARACTER_SPRITES.length;
        const otherIndex = side === "A" ? playerBCharacterIndex : playerACharacterIndex;
        let candidate = ((startIndex % total) + total) % total;
        for (let step = 0; step < total; step += 1) {
            if (candidate !== otherIndex) return candidate;
            candidate = (candidate + direction + total) % total;
        }
        return characterIndexForSide(side);
    }
    function renderCharacterSelector(side) {
        const card = side === "A"
            ? playerACard
            : playerBCard;
        if (!card) return;
        const oldStatus = card.querySelector(".fighter-status");
        if (!oldStatus) return;
        const index = characterIndexForSide(side);
        applyCharacterThemeToCard(side);
        const total = CHARACTER_SPRITES.length;
        const prevIndex = nextAvailableCharacterIndex(side, index - 1, -1);
        const nextIndex = nextAvailableCharacterIndex(side, index + 1, 1);
        const entry = side === "A" ? "001" : "002";
        const locked = matchStarted || battleRunning;
        oldStatus.classList.add("pf-character-select-wrap");
        oldStatus.innerHTML = `
<div class="pf-character-select-head">
<span>CHARACTER SELECT</span>
<strong>${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</strong>
</div>
<div class="pf-character-carousel">
<button
type="button"
class="pf-character-arrow"
data-character-side="${side}"
data-character-direction="-1"
aria-label="이전 캐릭터"
${locked ? "disabled" : ""}
>
◀
</button>
<div class="pf-character-preview side-preview">
<svg class="pixel-sprite pf-character-side-sprite" viewBox="0 0 16 16">
<use href="${CHARACTER_SPRITES[prevIndex]}"></use>
</svg>
</div>
<div class="pf-character-preview selected-preview">
<svg class="pixel-sprite pf-character-main-sprite" viewBox="0 0 16 16">
<use href="${CHARACTER_SPRITES[index]}"></use>
</svg>
</div>
<div class="pf-character-preview side-preview">
<svg class="pixel-sprite pf-character-side-sprite" viewBox="0 0 16 16">
<use href="${CHARACTER_SPRITES[nextIndex]}"></use>
</svg>
</div>
<button
type="button"
class="pf-character-arrow"
data-character-side="${side}"
data-character-direction="1"
aria-label="다음 캐릭터"
${locked ? "disabled" : ""}
>
▶
</button>
</div>
<div class="fighter-meta pf-character-meta">
<p class="fighter-code">ENTRY ${entry}</p>
<div class="fighter-hearts">♥ ♥ ♥</div>
</div>
`;
        oldStatus
            .querySelectorAll(".pf-character-arrow")
            .forEach(button => {
                button.addEventListener("click", () => {
                    if (matchStarted || battleRunning) return;
                    const direction = Number(button.dataset.characterDirection) || 0;
                    const targetIndex = nextAvailableCharacterIndex(side, index + direction, direction);
                    setCharacterIndexForSide(side, targetIndex);
                    /* 양쪽 프리뷰도 즉시 갱신해서 같은 캐릭터가 후보/선택으로 겹치지 않게 한다. */
                    renderCharacterSelectors();
                });
            });
    }
    function renderCharacterSelectors() {
        renderCharacterSelector("A");
        renderCharacterSelector("B");
    }
    function installFinalPixelStyles() {
        document.getElementById("pickFightFinalPixelStyles")?.remove();
        const style = document.createElement("style");
        style.id = "pickFightFinalPixelStyles";
        style.textContent = `
/* CHARACTER CAROUSEL */
.pf-scene-topbar { justify-content: flex-end !important; padding: 16px 18px 0 !important; }
.pf-entry-skip { min-width: 178px !important; min-height: 52px !important; padding: 12px 16px !important; border: 3px solid #fff8e3 !important; background: #f1c9dc !important; color: #5a405f !important; box-shadow: 5px 5px 0 #171421 !important; font-size: .62rem !important; font-weight: 800 !important; }
.pf-character-select-wrap {
display: block !important;
width: 100%;
margin: 8px 0 18px;
padding: 12px 10px 10px;
border: 0 !important;
background: transparent !important;
}
.pf-character-select-head {
display: flex;
align-items: center;
justify-content: center;
gap: 12px;
margin-bottom: 8px;
font-family: "Press Start 2P", cursive;
color: #5b4d69;
font-size: .44rem;
line-height: 1.6;
}
.pf-character-select-head strong {
color: #a4496b;
font-size: .42rem;
}
.player-b .pf-character-select-head strong {
color: #62518f;
}
.pf-character-carousel {
display: grid;
grid-template-columns: 44px 58px 106px 58px 44px;
justify-content: center;
align-items: center;
gap: 7px;
min-height: 120px;
}
.pf-character-arrow {
width: 42px;
height: 58px;
padding: 0;
border: 3px solid #453b50;
background: #f6d4df;
color: #8f3f60;
box-shadow: 4px 4px 0 #453b50;
font-family: "Press Start 2P", cursive;
font-size: .62rem;
cursor: pointer;
}
.player-b .pf-character-arrow {
background: #ddd5f1;
color: #5f4f8f;
}
.pf-character-arrow:active:not(:disabled) {
transform: translate(3px,3px);
box-shadow: 1px 1px 0 #453b50;
}
.pf-character-arrow:disabled {
opacity: .35;
filter: grayscale(1);
cursor: not-allowed;
}
.pf-character-preview {
display: grid;
place-items: center;
image-rendering: pixelated;
}
.pf-character-preview.side-preview {
opacity: .45;
filter: grayscale(1);
transform: scale(.82);
}
.pf-character-preview.selected-preview {
width: 104px;
height: 104px;
border: 3px solid #c65f85;
background: rgba(255,247,229,.72);
box-shadow: 5px 5px 0 #8e4966;
position: relative;
}
.player-b .pf-character-preview.selected-preview {
border-color: #7563a5;
box-shadow: 5px 5px 0 #5d4e86;
}
.pf-character-preview.selected-preview::before,
.pf-character-preview.selected-preview::after {
content: "";
position: absolute;
width: 8px;
height: 8px;
background: #fff3a4;
box-shadow: 8px 0 0 #fff3a4, 0 8px 0 #fff3a4;
}
.pf-character-preview.selected-preview::before {
left: -7px;
top: -7px;
}
.pf-character-preview.selected-preview::after {
right: 1px;
bottom: 1px;
transform: rotate(180deg);
}
.pf-character-main-sprite {
width: 78px;
height: 78px;
}
.pf-character-side-sprite {
width: 54px;
height: 54px;
}
.pf-character-meta {
display: flex !important;
align-items: center;
justify-content: center;
gap: 12px;
margin-top: 7px;
text-align: center;
}
.pf-character-meta .fighter-code,
.pf-character-meta .fighter-hearts {
margin: 0;
}
/* BATTLE SURFACE: gradient -> stepped pixel planes */
.pf-arena,
.pf-final-stage {
background:
linear-gradient(
180deg,
#8f89b2 0 23%,
#9992bb 23% 46%,
#b0a6c4 46% 48%,
#dfccd2 48% 72%,
#d8bec5 72% 100%
) !important;
image-rendering: pixelated;
}
.pf-arena {
position: relative;
}
.pf-arena::before {
content: "";
position: absolute;
inset: 0;
pointer-events: none;
opacity: .22;
background-image:
linear-gradient(90deg, rgba(255,255,255,.35) 2px, transparent 2px),
linear-gradient(rgba(72,58,88,.22) 2px, transparent 2px);
background-size: 32px 32px;
mask-image: linear-gradient(to bottom, rgba(0,0,0,.45), transparent 58%);
}
.pf-arena > * {
position: relative;
z-index: 1;
}
/* ROUND: thin structure + pixel ornaments */
.pf-round-header {
border: 0 !important;
border-bottom: 2px solid rgba(79,65,97,.58) !important;
background: rgba(250,244,232,.74) !important;
box-shadow: none !important;
padding: 8px 8px 11px !important;
gap: 2px !important;
}
.pf-rule-focus {
border: 0 !important;
background: transparent !important;
box-shadow: none !important;
padding: 0 !important;
}
.pf-rule-focus span::before,
.pf-rule-focus span::after {
content: "■ ■";
color: #86759a;
font-family: "Press Start 2P", cursive;
font-size: .34rem;
margin: 0 9px;
vertical-align: 1px;
}
.pf-rule-focus strong {
font-size: clamp(1.9rem,3.4vw,2.45rem) !important;
font-weight: 900 !important;
}
.pf-round-chip {
border: 0 !important;
background: transparent !important;
box-shadow: none !important;
font-size: .42rem !important;
opacity: .86;
}
/* HUD: no outer card/lines, stronger HP, block fill */
.pf-hud {
gap: 22px !important;
margin: 5px 7px 0 !important;
}
.pf-hud-card,
.pf-hud-card.right {
padding: 4px 2px 6px !important;
border: 0 !important;
background: transparent !important;
box-shadow: none !important;
}
.pf-hud-top {
margin-bottom: 6px !important;
align-items: flex-end !important;
}
.pf-hud-top strong {
color: #382f46;
font-size: 1.12rem !important;
font-weight: 900;
}
.pf-hp-label {
color: #30283d !important;
font-size: .72rem !important;
font-weight: 900 !important;
line-height: 1 !important;
text-shadow: 1px 1px 0 rgba(255,248,227,.7);
}
.pf-hp-bar {
height: 15px !important;
padding: 0 !important;
border: 2px solid #44394f !important;
background: rgba(247,239,226,.48) !important;
box-shadow: none !important;
position: relative;
}
.pf-hp-bar::after {
content: "";
position: absolute;
inset: 0;
pointer-events: none;
background: repeating-linear-gradient(
90deg,
transparent 0 18px,
rgba(48,40,61,.58) 18px 20px
);
}
.pf-hp-fill {
transition: width .65s steps(12), background .2s linear !important;
}
.pf-hp-fill.hp-safe,
.pf-hp-fill:not(.hp-caution):not(.hp-danger):not(.hp-critical):not(.danger) {
background: #91bea0 !important;
}
.pf-hp-fill.hp-caution {
background: #d7bd71 !important;
}
.pf-hp-fill.hp-danger {
background: #d88e79 !important;
}
.pf-hp-fill.hp-critical,
.pf-hp-fill.danger {
background: #cf6577 !important;
animation: pfBlink .6s steps(2) infinite !important;
}
/* SCORE: compact pixel divider */
.pf-score-row,
.pf-score-panel {
border: 0 !important;
border-bottom: 2px solid rgba(58,47,70,.65) !important;
background: rgba(251,244,227,.52) !important;
box-shadow: none !important;
}
.pf-score-mid::before,
.pf-score-mid::after,
.score-vs::before,
.score-vs::after {
content: "■ ■ ■";
display: inline-block;
color: #8d7899;
font-size: .31rem;
margin: 0 8px;
}
/* Judge: keep 2 cards, add pixel corners without more boxes */
.pf-judge-panel {
border: 0 !important;
background: transparent !important;
box-shadow: none !important;
}
.pf-judge-title {
border-bottom: 2px solid rgba(58,47,70,.65) !important;
}
.pf-judge-title::before {
content: "■ ";
color: #8c7399;
}
.pf-judge-title::after {
content: " ■";
color: #8c7399;
}
.pf-judge-card {
position: relative;
}
.pf-judge-card::before,
.pf-judge-card::after {
content: "";
position: absolute;
width: 7px;
height: 7px;
background: currentColor;
opacity: .38;
}
.pf-judge-card::before {
top: 4px;
left: 4px;
}
.pf-judge-card::after {
right: 4px;
bottom: 4px;
}
.pf-final-summary h2::before,
.pf-final-summary h2::after {
content: " ■■ ";
color: #a06f8f;
font-size: .58em;
vertical-align: 2px;
}
/* LOG VIEW TABS stronger */
.pf-log-view-btn {
color: #453a51 !important;
font-weight: 900 !important;
}
.pf-log-view-btn.active {
background: #efbfd2 !important;
color: #71324e !important;
font-weight: 900 !important;
}
/* CHARACTER THEME: selection card follows chosen sprite */
.player-card.player-a,
.player-card.player-b,
.player-card.player-a.player-a-ready,
.player-card.player-b.player-b-ready,
.player-card.player-a.player-ready,
.player-card.player-b.player-ready {
background: var(--pf-char-soft, #f8f1df) !important;
border-color: var(--pf-char-accent, #806896) !important;
box-shadow: 6px 6px 0 var(--pf-char-accent, #806896) !important;
}
.pf-character-select-head {
color: var(--pf-char-deep, #5b4d69) !important;
}
.pf-character-select-head strong {
color: var(--pf-char-deep, #7a4961) !important;
}
.pf-character-arrow {
background: color-mix(in srgb, var(--pf-char-soft, #f6d4df) 82%, #fff 18%) !important;
color: var(--pf-char-deep, #5f4f70) !important;
border-color: var(--pf-char-deep, #453b50) !important;
box-shadow: 4px 4px 0 var(--pf-char-deep, #453b50) !important;
}
.pf-character-preview.selected-preview,
.player-b .pf-character-preview.selected-preview {
border-color: var(--pf-char-accent, #7563a5) !important;
box-shadow: 5px 5px 0 var(--pf-char-deep, #5d4e86) !important;
background: rgba(255,247,229,.72) !important;
}
.pf-character-preview.selected-preview::before,
.pf-character-preview.selected-preview::after {
background: var(--pf-char-accent, #fff3a4) !important;
box-shadow: 8px 0 0 var(--pf-char-accent, #fff3a4), 0 8px 0 var(--pf-char-accent, #fff3a4) !important;
}

/* CHARACTER THEME: selected fighter color is visible, but inputs stay cream. */
.player-card .player-input,
.player-card input[type="text"] {
background: #fbf4e3 !important;
}
.player-card .player-label,
.player-card .fighter-code,
.player-card .fighter-hearts {
color: var(--pf-char-deep, #5b4d69) !important;
}

/* ENTRY: chosen character color becomes stage lighting, not a flat recolor */
.pf-scene.pf-entry-themed {
background: linear-gradient(
180deg,
var(--pf-entry-1) 0 28%,
var(--pf-entry-2) 28% 64%,
var(--pf-entry-3) 64% 100%
) !important;
}
.pf-scene.pf-entry-themed .pf-stage {
background: linear-gradient(
180deg,
var(--pf-entry-1) 0 30%,
var(--pf-entry-2) 30% 67%,
var(--pf-entry-3) 67% 100%
) !important;
}
.pf-scene.pf-entry-themed::after {
content: "";
position: absolute;
inset: 0;
pointer-events: none;
background-image:
linear-gradient(90deg, rgba(255,255,255,.08) 4px, transparent 4px),
linear-gradient(rgba(20,17,29,.10) 4px, transparent 4px);
background-size: 32px 32px;
opacity: .28;
}
.pf-scene.pf-entry-themed .pf-stage,
.pf-scene.pf-entry-themed .pf-scene-topbar {
position: relative;
z-index: 3;
}
.pf-scene.pf-entry-themed .pf-entry-frame {
background: var(--pf-entry-accent) !important;
border-color: #fff8e3 !important;
box-shadow: 8px 8px 0 var(--pf-entry-deep) !important;
}
.pf-scene.pf-entry-themed .pf-entry-frame::after {
content: "■  +  ■";
position: absolute;
right: -16px;
bottom: -20px;
color: var(--pf-entry-soft);
font-family: "Press Start 2P", cursive;
font-size: .38rem;
letter-spacing: 3px;
text-shadow: -205px -178px 0 var(--pf-entry-soft), -182px -18px 0 var(--pf-entry-soft);
opacity: .78;
pointer-events: none;
}
.pf-scene.pf-entry-themed .pf-entry-number {
background: var(--pf-entry-deep) !important;
}
.pf-scene.pf-entry-themed .pf-entry-card {
background: #fbf4e3 !important;
border-color: #fff8e3 !important;
box-shadow: 8px 8px 0 var(--pf-entry-deep) !important;
}
.pf-scene.pf-entry-themed .pf-entry-kicker,
.pf-scene.pf-entry-themed .pf-entry-title,
.pf-scene.pf-entry-themed .pf-entry-info span {
color: var(--pf-entry-deep) !important;
}
.pf-scene.pf-entry-themed .pf-entry-info {
border-color: color-mix(in srgb, var(--pf-entry-deep) 72%, #30283d 28%) !important;
}
/* HUD: group each name + HP clearly inside its own half */
.pf-hud-top {
justify-content: flex-start !important;
gap: 13px !important;
}
.pf-hud-card.right .pf-hud-top {
justify-content: flex-end !important;
flex-direction: row !important;
}
.pf-hp-label {
font-size: .76rem !important;
}
/* Pixel hierarchy: ornament without adding more containers */
.pf-round-chip::before,
.pf-round-chip::after {
content: "▪";
color: #8b799b;
margin: 0 6px;
}
.pf-score-mid {
white-space: nowrap;
}
.pf-judge-badge {
box-shadow: 2px 2px 0 rgba(48,40,61,.34);
}
/* MATCH RESULT: judgement content is open; only FINAL PICK stays boxed */
.pf-final-judgement {
padding: 4px 0 10px !important;
border: 0 !important;
background: transparent !important;
box-shadow: none !important;
}
.pf-final-round-list {
gap: 0 !important;
border-top: 1px solid #bdb3bf !important;
}
.pf-final-round-item,
.pf-final-round-item.sudden {
padding: 11px 4px !important;
border: 0 !important;
border-bottom: 1px solid #bdb3bf !important;
background: transparent !important;
box-shadow: none !important;
}
.pf-final-round-item strong::before {
content: "■ ";
color: #8b799b;
font-size: .65em;
}

/* =========================================================
   V3 AGREED VISUAL REFINEMENT
   VS theme + battle hierarchy only
========================================================= */

/* VS: carry each selected character theme into the match-up scene. */
.pf-scene.pf-vs-themed,
.pf-scene.pf-vs-themed .pf-stage {
background:
linear-gradient(
90deg,
var(--pf-vs-a-entry3) 0 31%,
var(--pf-vs-a-entry2) 31% 40%,
#2d294b 40% 60%,
var(--pf-vs-b-entry2) 60% 69%,
var(--pf-vs-b-entry3) 69% 100%
) !important;
}
.pf-scene.pf-vs-themed .pf-stage {
position: relative;
overflow: hidden;
}
.pf-scene.pf-vs-themed .pf-stage::before {
content: "";
position: absolute;
inset: 0;
pointer-events: none;
background:
linear-gradient(90deg, rgba(255,255,255,.06) 4px, transparent 4px),
linear-gradient(rgba(19,16,31,.10) 4px, transparent 4px);
background-size: 28px 28px;
opacity: .42;
}
.pf-vs-screen {
position: relative;
z-index: 2;
}
.pf-vs-side {
position: relative;
padding: 18px 12px;
}
.pf-vs-side::before,
.pf-vs-side::after {
content: "";
position: absolute;
width: 7px;
height: 7px;
opacity: .7;
}
.pf-vs-side-a::before {
left: 10%;
top: 20%;
background: var(--pf-vs-a-soft);
box-shadow: 24px 42px 0 var(--pf-vs-a-soft), 178px -18px 0 var(--pf-vs-a-soft);
}
.pf-vs-side-b::before {
right: 10%;
top: 20%;
background: var(--pf-vs-b-soft);
box-shadow: -24px 42px 0 var(--pf-vs-b-soft), -178px -18px 0 var(--pf-vs-b-soft);
}
.pf-vs-character.a {
background: var(--pf-vs-a-soft) !important;
border-color: #fff8e3 !important;
box-shadow: 7px 7px 0 var(--pf-vs-a-deep) !important;
outline: 3px solid var(--pf-vs-a-accent);
outline-offset: -7px;
}
.pf-vs-character.b {
background: var(--pf-vs-b-soft) !important;
border-color: #fff8e3 !important;
box-shadow: 7px 7px 0 var(--pf-vs-b-deep) !important;
outline: 3px solid var(--pf-vs-b-accent);
outline-offset: -7px;
}
.pf-vs-side-a .pf-vs-name {
color: #fff8e3;
text-shadow: 2px 2px 0 var(--pf-vs-a-deep);
}
.pf-vs-side-b .pf-vs-name {
color: #fff8e3;
text-shadow: 2px 2px 0 var(--pf-vs-b-deep);
}
.pf-vs-mark {
position: relative;
z-index: 3;
}
.pf-vs-mark::before,
.pf-vs-mark::after {
content: "■";
position: absolute;
top: 50%;
font-size: .45rem;
color: #fff1a0;
opacity: .9;
}
.pf-vs-mark::before { left: -23px; }
.pf-vs-mark::after { right: -23px; }

/* Battle arena: tighter hierarchy and more deliberate pixel-stage planes. */
.pf-arena {
background:
linear-gradient(
180deg,
#8580ad 0 27%,
#9992bd 27% 49%,
#aaa0c1 49% 51%,
#decbd1 51% 77%,
#d6bdc4 77% 100%
) !important;
}
.pf-arena::before {
opacity: .16 !important;
background-image:
linear-gradient(90deg, rgba(255,255,255,.28) 2px, transparent 2px),
linear-gradient(rgba(58,46,77,.18) 2px, transparent 2px) !important;
background-size: 28px 28px !important;
mask-image: linear-gradient(to bottom, rgba(0,0,0,.52), transparent 64%) !important;
}

/* Rule header: slimmer, rule stays the visual hero. */
.pf-round-header {
margin-bottom: 5px !important;
padding: 6px 8px 8px !important;
gap: 1px !important;
}
.pf-rule-focus span {
font-size: .86rem !important;
}
.pf-rule-focus span::before,
.pf-rule-focus span::after {
content: "▪ ▪" !important;
font-size: .36rem !important;
margin: 0 8px !important;
}
.pf-rule-focus strong {
margin-top: 1px;
font-size: clamp(1.82rem,3.2vw,2.35rem) !important;
}
.pf-round-chip {
order: 3;
padding: 2px 7px !important;
font-size: .38rem !important;
letter-spacing: .04em;
}
.pf-round-chip::before,
.pf-round-chip::after {
content: "▪" !important;
margin: 0 5px !important;
}

/* HP: keep stage colours, but visually separate each fighter's half. */
.pf-hud {
gap: 34px !important;
margin: 4px 8px 2px !important;
}
.pf-hud-top {
justify-content: space-between !important;
gap: 10px !important;
}
.pf-hud-card.right .pf-hud-top {
justify-content: space-between !important;
flex-direction: row !important;
}
.pf-hud-card.right .pf-hud-top strong {
order: 1;
}
.pf-hud-card.right .pf-hp-label {
order: 2;
}
.pf-hp-label {
font-size: .78rem !important;
letter-spacing: .02em;
}
.pf-hp-bar {
height: 14px !important;
}
.pf-hp-bar::after {
background: repeating-linear-gradient(
90deg,
transparent 0 15px,
rgba(48,40,61,.55) 15px 17px
) !important;
}

/* Fighter stage: subtle pixel dust, no extra cards. */
.pf-fighters {
position: relative;
}
.pf-fighters::before {
content: "";
position: absolute;
inset: 4px 2% 2px;
pointer-events: none;
background-image:
radial-gradient(square at center, rgba(255,255,255,.24) 0 2px, transparent 2px);
opacity: .20;
}

/* Round summary becomes a thin system-message strip. */
.pf-round-summary {
margin-top: 6px !important;
padding: 8px 12px !important;
border: 0 !important;
border-top: 2px solid rgba(83,67,104,.56) !important;
border-bottom: 2px solid rgba(83,67,104,.56) !important;
background: rgba(250,244,232,.78) !important;
box-shadow: none !important;
font-size: .98rem !important;
}
.pf-round-summary::before,
.pf-round-summary::after {
content: "▪";
color: #7c688f;
margin: 0 8px;
font-family: "Press Start 2P", cursive;
font-size: .34rem;
vertical-align: 2px;
}

/* SCORE: remove the wide table-like band; keep only numbers and centre label. */
.pf-score-row,
.pf-score-panel {
margin-top: 4px !important;
padding: 8px 10px 10px !important;
border: 0 !important;
border-bottom: 2px solid rgba(58,47,70,.62) !important;
background: transparent !important;
box-shadow: none !important;
}
.pf-score-side span {
margin-bottom: 2px !important;
font-size: .92rem !important;
}
.pf-score-side strong {
font-size: clamp(1.55rem,3vw,2.05rem) !important;
}
.pf-score-mid {
padding: 5px 8px !important;
border: 2px solid #a44b6c !important;
background: #f3d7e1 !important;
box-shadow: 2px 2px 0 rgba(48,40,61,.28);
}
.pf-score-mid::before,
.pf-score-mid::after {
content: "▪ ▪" !important;
font-size: .28rem !important;
margin: 0 6px !important;
}

/* JUDGE: RPG result panels, clear winner hierarchy, no extra outer box. */
.pf-judge-panel {
margin-top: 7px !important;
padding: 8px 0 0 !important;
}
.pf-judge-title {
margin: 0 0 9px !important;
padding: 0 0 7px !important;
}
.pf-judge-grid {
gap: 10px !important;
}
.pf-judge-card {
border-width: 2px !important;
padding: 11px 12px !important;
}
.pf-judge-card.winner {
background: #e1edfd !important;
border-color: #5c86bd !important;
box-shadow: 4px 4px 0 #4f709b !important;
opacity: 1 !important;
}
.pf-judge-card.loser {
background: #eceaec !important;
border-color: #a6a1aa !important;
box-shadow: none !important;
opacity: .72 !important;
}
.pf-judge-card::before,
.pf-judge-card::after {
width: 6px !important;
height: 6px !important;
opacity: .6 !important;
}
.pf-judge-badge {
font-family: "Press Start 2P", cursive !important;
font-size: .48rem !important;
padding: 7px 9px !important;
box-shadow: 2px 2px 0 rgba(48,40,61,.34) !important;
}
.pf-judge-card.winner .pf-judge-badge {
background: #cae1fb !important;
color: #315f94 !important;
}
.pf-judge-card.loser .pf-judge-badge {
background: #dddadd !important;
color: #716b74 !important;
}

/* Final-round decision: a bottom decision strip, not another heavy card. */
.pf-round-choice-box {
margin-top: 10px !important;
padding: 13px 14px 11px !important;
border: 0 !important;
border-top: 3px solid #7e6a8d !important;
border-bottom: 3px solid #7e6a8d !important;
background: rgba(255,248,232,.88) !important;
box-shadow: none !important;
}
.pf-round-choice-box::before {
content: "◆  ONE MORE ROUND?  ◆";
display: block;
margin-bottom: 7px;
color: #8e4967;
font-family: "Press Start 2P", cursive;
font-size: .46rem;
line-height: 1.7;
}
.pf-round-choice-box h3 {
margin-bottom: 5px !important;
font-size: 1.14rem !important;
}
.pf-round-choice-box p {
font-size: .92rem !important;
line-height: 1.55 !important;
}
.pf-round-choice-box .pf-action-row {
margin-top: 10px !important;
}

/* MATCH RESULT: round rows read as game records via pixel markers only. */
.pf-final-round-item strong::before {
content: "■ " !important;
color: #806d91 !important;
font-size: .62em !important;
}
@media (max-width: 760px) {
.pf-character-carousel {
grid-template-columns: 38px 48px 90px 48px 38px;
gap: 4px;
}
.pf-character-preview.selected-preview {
width: 88px;
height: 88px;
}
.pf-character-main-sprite {
width: 66px;
height: 66px;
}
.pf-character-side-sprite {
width: 46px;
height: 46px;
}
.pf-character-arrow {
width: 36px;
height: 52px;
}
}
`;
        document.head.appendChild(style);
    }

    /* =========================================================
       V4 FINAL BATTLE REFINEMENT
       Agreed scope only: VS + battle HUD + forced HP draw sudden death
    ========================================================= */
    const pfV4Style = document.createElement("style");
    pfV4Style.id = "pickFightV4BattleStyles";
    pfV4Style.textContent = `
/* VS split theme - force the selected-character colours to read clearly */
.pf-scene.pf-vs-themed { overflow: hidden; }
.pf-scene.pf-vs-themed .pf-stage {
    min-height: 525px;
    background: linear-gradient(
        90deg,
        var(--pf-vs-a-entry3) 0 30%,
        var(--pf-vs-a-entry2) 30% 40%,
        #2d294b 40% 60%,
        var(--pf-vs-b-entry2) 60% 70%,
        var(--pf-vs-b-entry3) 70% 100%
    ) !important;
}
.pf-scene.pf-vs-themed .pf-stage::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(90deg, transparent 0 39.5%, rgba(255,245,214,.22) 39.5% 40%, transparent 40% 60%, rgba(255,245,214,.22) 60% 60.5%, transparent 60.5%),
      repeating-linear-gradient(0deg, rgba(255,255,255,.055) 0 4px, transparent 4px 24px);
    opacity: .72;
}
.pf-vs-character.a,
.pf-vs-character.b {
    transform: translateZ(0);
    image-rendering: pixelated;
}

/* ROUND header: compact and unmistakably pixel-game, not document-like */
.pf-round-header {
    padding: 5px 12px 7px !important;
    margin-bottom: 2px !important;
    background: rgba(251,244,226,.92) !important;
    border-bottom: 2px solid #756485 !important;
}
.pf-rule-focus span::before,
.pf-rule-focus span::after {
    content: "■ ■" !important;
    font-size: .30rem !important;
    color: #8a789a !important;
}
.pf-rule-focus strong {
    line-height: 1.1 !important;
}

/* Arena colour planes: stronger step transitions, very light pixel grid */
.pf-arena {
    background: linear-gradient(
        180deg,
        #817ca8 0 31%,
        #938bb5 31% 52%,
        #a59aba 52% 54%,
        #d8c6cd 54% 78%,
        #d2b9c1 78% 100%
    ) !important;
}
.pf-arena::before {
    background-image:
      repeating-linear-gradient(90deg, rgba(255,255,255,.12) 0 2px, transparent 2px 26px),
      repeating-linear-gradient(0deg, rgba(64,51,83,.08) 0 2px, transparent 2px 26px) !important;
    opacity: .25 !important;
}

/* HP: two independent HUD halves, always stage-coloured */
.pf-hud {
    grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
    column-gap: 54px !important;
    padding: 4px 18px 5px !important;
}
.pf-hud-card { min-width: 0; }
.pf-hud-card.right .pf-hud-top { flex-direction: row !important; }
.pf-hud-top strong { flex: 1 1 auto; }
.pf-hud-card.right .pf-hud-top strong { text-align: left !important; }
.pf-hp-label { flex: 0 0 auto; white-space: nowrap; }
.pf-hp-fill.hp-safe { background: #91bea0 !important; }
.pf-hp-fill.hp-caution { background: #d7bd71 !important; }
.pf-hp-fill.hp-danger { background: #d88e79 !important; }
.pf-hp-fill.hp-critical,
.pf-hp-fill.hp-critical.danger { background: #cf6577 !important; animation: pfBlink .6s steps(2) infinite !important; }

/* System message: thin strip */
.pf-round-summary {
    margin: 4px 16px 0 !important;
    padding: 6px 10px !important;
    min-height: 0 !important;
    background: rgba(255,249,235,.78) !important;
    border: 0 !important;
    border-top: 2px solid rgba(91,74,112,.44) !important;
    border-bottom: 2px solid rgba(91,74,112,.44) !important;
}

/* SCORE: no broad card/band, numbers first */
.pf-score-row,
.pf-score-panel {
    margin: 0 18px !important;
    padding: 9px 8px 10px !important;
    background: transparent !important;
    border: 0 !important;
    border-bottom: 2px solid rgba(67,54,82,.54) !important;
    box-shadow: none !important;
}
.pf-score-mid {
    min-width: 84px;
    padding: 6px 8px !important;
    background: #f1d3df !important;
    border: 2px solid #9b4968 !important;
    box-shadow: 3px 3px 0 #604c69 !important;
}
.pf-score-side strong { line-height: 1 !important; }

/* JUDGE: result slabs rather than business cards */
.pf-judge-panel {
    margin: 0 18px !important;
    padding: 9px 0 0 !important;
    background: transparent !important;
}
.pf-judge-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 0 7px !important;
    border-bottom: 2px solid rgba(69,55,84,.5) !important;
}
.pf-judge-grid { gap: 12px !important; }
.pf-judge-card {
    border: 0 !important;
    border-left: 5px solid currentColor !important;
    padding: 12px 14px 11px !important;
    box-shadow: none !important;
}
.pf-judge-card.winner {
    color: #355f8f !important;
    background: #e2eefb !important;
    box-shadow: 4px 4px 0 #6687ad !important;
}
.pf-judge-card.loser {
    color: #6e6873 !important;
    background: #ece9ee !important;
    opacity: .78 !important;
}
.pf-judge-card.draw {
    color: #62556f !important;
    background: #eee9f2 !important;
    opacity: 1 !important;
}
.pf-judge-card::before,
.pf-judge-card::after {
    width: 6px !important;
    height: 6px !important;
}

/* Optional one-more-round UI: decision strip, no heavy outer card */
.pf-round-choice-box {
    margin: 12px 18px 4px !important;
    padding: 12px 8px 8px !important;
    background: transparent !important;
    border: 0 !important;
    border-top: 3px solid #806d90 !important;
    border-bottom: 0 !important;
}
.pf-round-choice-box::before {
    margin-bottom: 6px !important;
}

/* Forced final HP draw: no fake winner; visually points straight to extra rule selection */
.pf-final-draw-wrap {
    min-height: 340px;
    display: grid;
    place-items: center;
    padding: 28px;
    background: linear-gradient(180deg,#41385c 0 44%,#67577a 44% 48%,#efe1d1 48% 100%);
}
.pf-final-draw-panel {
    width: min(560px,92%);
    padding: 24px 22px;
    border: 4px solid #fff7df;
    background: #302a49;
    color: #fff7df;
    text-align: center;
    box-shadow: 8px 8px 0 #171421;
}
.pf-final-draw-kicker {
    margin: 0 0 12px;
    color: #f3bad0;
    font-family: "Press Start 2P", cursive;
    font-size: .62rem;
}
.pf-final-draw-panel h2 {
    margin: 0 0 12px;
    color: #fff1a8;
    font-family: "Press Start 2P", cursive;
    font-size: clamp(1.5rem,4vw,2.2rem);
}
.pf-final-draw-panel p {
    margin: 0;
    font-family: "Galmuri11", sans-serif;
    font-size: 1.03rem;
    line-height: 1.8;
}
`;
    document.head.appendChild(pfV4Style);

    function getHpStageClass(hp) {
        if (hp <= 15) return "hp-critical";
        if (hp <= 40) return "hp-danger";
        if (hp <= 70) return "hp-caution";
        return "hp-safe";
    }
    function getHpStageColor(hp) {
        if (hp <= 15) return "#cf6577";
        if (hp <= 40) return "#d88e79";
        if (hp <= 70) return "#d7bd71";
        return "#91bea0";
    }
    function updateHPDisplay(state) {
        [
            ["A", state.hpA],
            ["B", state.hpB]
        ].forEach(([side, hp]) => {
            const fill = document.getElementById(`pfHpFill${side}`);
            const label = document.getElementById(`pfHpLabel${side}`);
            if (fill) {
                fill.style.width = `${hp}%`;
                fill.classList.remove(
                    "danger",
                    "hp-safe",
                    "hp-caution",
                    "hp-danger",
                    "hp-critical"
                );
                fill.classList.add(getHpStageClass(hp));
                fill.style.setProperty("background-color", getHpStageColor(hp), "important");
            }
            if (label) {
                label.textContent = `HP ${hp}`;
            }
        });
    }
    /* =========================================================
    MODERN BATTLE LOG
    CARD = detailed final judgement
    LIST = matchup + pick + date only
    ========================================================= */
    function installBattleLogStyles() {
        document.getElementById("pickFightBattleLogStyles")?.remove();
        const style = document.createElement("style");
        style.id = "pickFightBattleLogStyles";
        style.textContent = `
.pf-log-tools {
width: min(920px,100%);
margin: 28px auto 22px;
display: grid;
gap: 13px;
}
.pf-log-search-wrap { position: relative; }
.pf-log-search {
width: 100%;
min-height: 52px;
padding: 12px 52px 12px 16px;
border: 3px solid #393242;
outline: none;
background: #fff8e8;
color: #393242;
box-shadow: 4px 4px 0 #393242;
font-family: "Galmuri11", sans-serif;
font-size: 1rem;
}
.pf-log-search-clear {
position: absolute;
right: 10px;
top: 50%;
transform: translateY(-50%);
width: 32px;
height: 32px;
padding: 0;
border: 2px solid #393242;
background: #f0cfda;
color: #8f3f60;
font-family: "Press Start 2P", cursive;
cursor: pointer;
}
.pf-log-search-clear:disabled { opacity: .3; }
.pf-log-view-toggle {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 9px;
}
.pf-log-view-btn {
min-height: 50px;
padding: 10px 14px;
border: 3px solid #393242;
background: #e1daea;
color: #453a51;
box-shadow: 3px 3px 0 #393242;
font-family: "Press Start 2P", cursive;
font-size: .56rem;
font-weight: 900;
line-height: 1.7;
cursor: pointer;
}
.pf-log-view-btn.active {
background: #efbfd2;
color: #71324e;
box-shadow: 3px 3px 0 #71324e;
transform: translateY(-2px);
}
.pf-log-result-info {
margin: 0;
color: #514758;
font-family: "Galmuri11", sans-serif;
font-size: .94rem;
font-weight: 800;
text-align: center;
}
.battle-log-list.pf-log-renderer {
width: min(920px,100%);
margin: 0 auto;
display: block !important;
grid-template-columns: none !important;
}
.pf-log-carousel {
width: min(1080px,100%);
margin: 0 auto;
display: grid;
grid-template-columns: 64px minmax(0,1fr) 64px;
gap: 17px;
align-items: center;
}
.pf-log-nav {
width: 60px;
height: 76px;
padding: 0;
border: 4px solid #393242;
background: #cfc3e5;
color: #4f4660;
box-shadow: 5px 5px 0 #393242;
font-family: "Press Start 2P", cursive;
font-size: .78rem;
cursor: pointer;
}
.pf-log-nav:disabled {
opacity: .24;
filter: grayscale(1);
cursor: not-allowed;
}
.pf-log-pagination {
margin-top: 18px;
display: flex;
justify-content: center;
gap: 9px;
color: #51475f;
font-family: "Press Start 2P", cursive;
font-size: .58rem;
font-weight: 800;
}
.pf-log-card {
width: 100%;
min-height: 320px;
padding: 27px 30px;
border: 4px solid #393242;
background: #fff7e5;
color: #393242;
box-shadow: 7px 7px 0 #393242;
font-family: "Galmuri11", sans-serif;
}
.pf-log-card-header {
display: flex;
justify-content: space-between;
align-items: flex-start;
gap: 20px;
padding-bottom: 14px;
border-bottom: 3px solid #393242;
}
.pf-log-versus {
display: flex;
align-items: center;
gap: 10px;
min-width: 0;
}
.pf-log-mini-character {
width: 42px;
height: 42px;
flex: 0 0 auto;
image-rendering: pixelated;
}
.pf-log-card-header strong {
color: #625481;
font-size: 1.28rem;
font-weight: 900;
line-height: 1.3;
}
.pf-log-card-header > span {
color: #706873;
font-weight: 700;
white-space: nowrap;
}
.pf-log-card-body { padding-top: 17px; }
.pf-log-meta {
display: grid;
gap: 7px;
margin-bottom: 19px;
}
.pf-log-line {
margin: 0;
color: #49404d;
font-size: 1.02rem;
line-height: 1.55;
}
.pf-log-line strong {
color: #ad4b70;
font-weight: 900;
}
.pf-log-sudden {
padding: 0;
background: transparent;
border: 0;
}
.pf-log-judgement {
margin-top: 16px;
padding-top: 13px;
border-top: 2px solid #8b7b92;
}
.pf-log-judgement-title {
margin: 0 0 7px;
color: #6a5881;
font-family: "Press Start 2P", cursive;
font-size: .52rem;
font-weight: 900;
line-height: 1.8;
}
.pf-log-judgement-title::before,
.pf-log-judgement-title::after {
content: "■ ■";
color: #9a839f;
font-size: .72em;
margin: 0 8px;
}
.pf-log-judgement-rounds {
border-top: 1px solid #ccc1c8;
}
.pf-log-judgement-round {
padding: 10px 2px;
border-bottom: 1px solid #ccc1c8;
}
.pf-log-judgement-round.sudden {
padding: 10px 2px;
background: transparent;
}
.pf-log-judgement-round strong {
display: block;
margin-bottom: 4px;
color: #625078;
font-weight: 900;
}
.pf-log-judgement-round p {
margin: 0;
color: #50464f;
font-size: .94rem;
line-height: 1.58;
}
.pf-log-conclusion {
position: relative;
margin-top: 16px;
padding: 15px 16px;
border: 3px solid #c25e82;
background: #fde5ee;
color: #704157;
box-shadow: 4px 4px 0 #8f4863;
font-size: .98rem;
font-weight: 700;
line-height: 1.6;
}
.pf-log-conclusion::before,
.pf-log-conclusion::after {
content: "";
position: absolute;
width: 7px;
height: 7px;
background: #8f4863;
}
.pf-log-conclusion::before { top: 5px; left: 5px; }
.pf-log-conclusion::after { right: 5px; bottom: 5px; }
.pf-log-conclusion strong { color: #a44669; }
.pf-log-list-view {
display: grid;
gap: 10px;
}
.pf-log-list-item {
width: 100%;
padding: 17px 20px;
display: grid;
grid-template-columns: 52px minmax(0,1fr) auto;
gap: 15px;
align-items: center;
border: 3px solid #393242;
background: #fff7e5;
color: #393242;
box-shadow: 4px 4px 0 #393242;
text-align: left;
cursor: pointer;
}
.pf-log-list-item:hover {
background: #fff0e5;
transform: translateY(-2px);
}
.pf-log-list-number {
color: #78669b;
font-family: "Press Start 2P", cursive;
font-size: .52rem;
font-weight: 900;
}
.pf-log-list-main strong {
display: block;
margin-bottom: 5px;
color: #594b78;
font-family: "Galmuri11", sans-serif;
font-size: 1.18rem;
font-weight: 900;
}
.pf-log-list-result {
display: inline-block;
padding: 4px 8px;
background: #f3cedc;
color: #964464;
font-family: "Galmuri11", sans-serif;
font-size: .9rem;
font-weight: 800;
}
.pf-log-list-date {
color: #665e69;
font-family: "Galmuri11", sans-serif;
font-size: .85rem;
font-weight: 700;
white-space: nowrap;
}
.pf-log-empty {
min-height: 230px;
padding: 28px;
display: grid;
place-items: center;
border: 4px solid #393242;
background: #fff7e5;
box-shadow: 7px 7px 0 #393242;
text-align: center;
}
.pf-log-empty-inner p {
margin: 0 0 9px;
color: #b14d73;
font-family: "Press Start 2P", cursive;
}
.pf-log-empty-inner strong {
display: block;
margin-bottom: 7px;
font-family: "Galmuri11", sans-serif;
font-size: 1.15rem;
}
@media (max-width: 700px) {
.pf-log-carousel {
grid-template-columns: 43px minmax(0,1fr) 43px;
gap: 7px;
}
.pf-log-nav {
width: 40px;
height: 58px;
border-width: 3px;
font-size: .5rem;
}
.pf-log-card { padding: 21px 17px; }
.pf-log-card-header {
flex-direction: column;
gap: 6px;
}
.pf-log-list-item {
grid-template-columns: 38px minmax(0,1fr);
padding: 15px;
}
.pf-log-list-date {
grid-column: 2;
white-space: normal;
}
}
`;
        document.head.appendChild(style);
    }
    function buildFinalConclusion(state, decision) {
        if (decision.winner === "DRAW") {
            return "모든 판정을 종합했지만 끝내 확실한 우위를 가리지 못했다. 오늘만큼은 PICK FIGHT도 두 손 들었다 ♡";
        }
        const winnerName = decision.winner === "A"
            ? state.playerA
            : state.playerB;
        if (state.deathMatchPlayed) {
            return `기본 라운드로도 모자라 SUDDEN DEATH까지 진행한 끝에 ${winnerName}${getKoreanSubjectParticle(winnerName)} 마지막까지 더 강한 설득력을 보여줬다. 오늘의 PICK은 ${winnerName}!`;
        }
        return `모든 라운드를 종합한 결과 ${winnerName}${getKoreanSubjectParticle(winnerName)} 끝까지 더 강한 설득력을 보여줬다. 오늘의 PICK은 ${winnerName}!`;
    }
    function addBattleLog(state, decision) {
        if (!battleLogList) return;
        const winner = decision.winner === "DRAW"
            ? "무승부"
            : decision.winner === "A"
                ? state.playerA
                : state.playerB;
        const now = new Date();
        const timestamp =
            `${now.getFullYear()}.`
            + `${String(now.getMonth() + 1).padStart(2, "0")}.`
            + `${String(now.getDate()).padStart(2, "0")} `
            + `${String(now.getHours()).padStart(2, "0")}:`
            + `${String(now.getMinutes()).padStart(2, "0")}`;
        const sudden = state.roundResults.find(
            round => round.roundLabel === "SUDDEN DEATH"
        );
        const judgmentRounds = state.roundResults.map(
            round => ({
                roundLabel: round.roundLabel,
                rule: round.rule,
                winner:
                    round.winner === "DRAW"
                        ? "무승부"
                        : round.winner === "A"
                            ? state.playerA
                            : state.playerB,
                text: buildRoundFinalText(state, round)
            })
        );
        battleLogs.unshift({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            playerA: state.playerA,
            playerB: state.playerB,
            spriteA: state.spriteA || CHARACTER_SPRITES[playerACharacterIndex],
            spriteB: state.spriteB || CHARACTER_SPRITES[playerBCharacterIndex],
            winner,
            baseRules: [...state.baseRules],
            suddenDeathRule: sudden?.rule || "",
            rounds: judgmentRounds,
            conclusion: buildFinalConclusion(state, decision),
            timestamp
        });
        battleLogSearchTerm = "";
        battleLogCursor = 0;
        const search = document.getElementById("pfBattleLogSearch");
        if (search) search.value = "";
        renderBattleLog();
    }
    function ensureBattleLogControls() {
        if (!battleLogList) return;
        battleLogList.classList.add("pf-log-renderer");
        let tools = document.getElementById("pfBattleLogTools");
        if (!tools) {
            tools = document.createElement("div");
            tools.id = "pfBattleLogTools";
            tools.className = "pf-log-tools";
            tools.innerHTML = `
<div class="pf-log-search-wrap">
<input
type="search"
id="pfBattleLogSearch"
class="pf-log-search"
placeholder="PLAYER / RULE / PICK 검색"
autocomplete="off"
>
<button
type="button"
id="pfBattleLogSearchClear"
class="pf-log-search-clear"
disabled
>×</button>
</div>
<div class="pf-log-view-toggle">
<button type="button" id="pfBattleLogCardView" class="pf-log-view-btn active">CARD VIEW</button>
<button type="button" id="pfBattleLogListView" class="pf-log-view-btn">LIST VIEW</button>
</div>
<p class="pf-log-result-info" id="pfBattleLogResultInfo"></p>
`;
            const existingCarousel = battleLogList.closest(".battle-log-carousel");
            if (existingCarousel) {
                existingCarousel.before(tools);
                const oldPrev = document.getElementById("battleLogPrev");
                const oldNext = document.getElementById("battleLogNext");
                const oldPagination = existingCarousel.querySelector(".battle-log-pagination");
                oldPrev?.remove();
                oldNext?.remove();
                oldPagination?.remove();
                existingCarousel.style.display = "block";
                const viewport = battleLogList.closest(".battle-log-viewport");
                if (viewport) viewport.style.overflow = "visible";
            } else {
                battleLogList.before(tools);
            }
        }
        const search = document.getElementById("pfBattleLogSearch");
        const clear = document.getElementById("pfBattleLogSearchClear");
        const card = document.getElementById("pfBattleLogCardView");
        const list = document.getElementById("pfBattleLogListView");
        if (search && search.dataset.bound !== "true") {
            search.dataset.bound = "true";
            search.addEventListener("input", () => {
                battleLogSearchTerm = normalizeText(search.value);
                battleLogCursor = 0;
                if (clear) clear.disabled = !battleLogSearchTerm;
                renderBattleLog();
            });
        }
        if (clear && clear.dataset.bound !== "true") {
            clear.dataset.bound = "true";
            clear.addEventListener("click", () => {
                battleLogSearchTerm = "";
                battleLogCursor = 0;
                if (search) {
                    search.value = "";
                    search.focus();
                }
                clear.disabled = true;
                renderBattleLog();
            });
        }
        if (card && card.dataset.bound !== "true") {
            card.dataset.bound = "true";
            card.addEventListener("click", () => {
                battleLogViewMode = "card";
                renderBattleLog();
            });
        }
        if (list && list.dataset.bound !== "true") {
            list.dataset.bound = "true";
            list.addEventListener("click", () => {
                battleLogViewMode = "list";
                renderBattleLog();
            });
        }
    }
    function getFilteredBattleLogs() {
        const q = battleLogSearchTerm.toLowerCase();
        if (!q) return battleLogs;
        return battleLogs.filter(log => {
            const text = [
                log.playerA,
                log.playerB,
                log.winner,
                ...(log.baseRules || []),
                log.suddenDeathRule,
                log.timestamp,
                log.conclusion,
                ...(log.rounds || []).map(round => `${round.rule} ${round.text}`)
            ].join(" ").toLowerCase();
            return text.includes(q);
        });
    }
    function syncBattleLogViewButtons() {
        const card = document.getElementById("pfBattleLogCardView");
        const list = document.getElementById("pfBattleLogListView");
        const cardActive = battleLogViewMode === "card";
        card?.classList.toggle("active", cardActive);
        list?.classList.toggle("active", !cardActive);
    }
    function updateBattleLogResultInfo(filtered) {
        const info = document.getElementById("pfBattleLogResultInfo");
        const clear = document.getElementById("pfBattleLogSearchClear");
        if (clear) clear.disabled = !battleLogSearchTerm;
        if (!info) return;
        if (!battleLogs.length) {
            info.textContent = "아직 저장된 배틀이 없습니다.";
            return;
        }
        info.textContent = battleLogSearchTerm
            ? `검색 결과 ${filtered.length}개 / 전체 ${battleLogs.length}개`
            : `전체 ${battleLogs.length}개의 배틀 기록`;
    }
    function battleLogCardHTML(log) {
        const rounds = (log.rounds || [])
            .map((round, index) => {
                const roundCode = round.roundLabel === "SUDDEN DEATH"
                    ? "SD"
                    : String(index + 1).padStart(2, "0");
                const normalizedWinner =
                    String(round.winner || "")
                        .trim()
                        .toUpperCase();

                const winnerName =
                    normalizedWinner === "A"
                        ? log.playerA
                        : normalizedWinner === "B"
                            ? log.playerB
                            : "DRAW";

                const resultLabel =
                    normalizedWinner === "DRAW"
                        ? "DRAW"
                        : `${winnerName} WIN`;
                return `
<div class="pf-log-judgement-round">
<div class="pf-log-round-top">
<span class="pf-log-round-no">${escapeHTML(roundCode)}</span>
<strong>${escapeHTML(round.rule)}</strong>
<span class="pf-log-round-win">▶ ${escapeHTML(resultLabel)}</span>
</div>
<p>${escapeHTML(round.text)}</p>
</div>
`;
            })
            .join("");
        return `
<article class="pf-log-card pf-log-game-card">
<div class="pf-log-card-header">
<div class="pf-log-versus">
<svg class="pf-log-mini-character" viewBox="0 0 16 16">
<use href="${log.spriteA || "#sprite-pink"}"></use>
</svg>
<strong>
<span>${escapeHTML(log.playerA)}</span>
<em>◆ VS ◆</em>
<span>${escapeHTML(log.playerB)}</span>
</strong>
<svg class="pf-log-mini-character" viewBox="0 0 16 16">
<use href="${log.spriteB || "#sprite-purple-cat"}"></use>
</svg>
</div>
<span>${escapeHTML(log.timestamp)}</span>
</div>
<div class="pf-log-card-body">
<div class="pf-log-meta pf-log-stat-lines">
<p class="pf-log-line"><strong>오늘의 PICK</strong><span>▶</span>${escapeHTML(log.winner)}</p>
<p class="pf-log-line"><strong>RULE</strong><span>▶</span>${escapeHTML(log.baseRules.join(" / "))}</p>
</div>
<div class="pf-log-judgement">
<p class="pf-log-judgement-title"><span></span>FINAL JUDGEMENT</p>
<div class="pf-log-judgement-rounds">${rounds}</div>
<div class="pf-log-conclusion">
<span class="pf-log-final-label">★ FINAL PICK ★</span>
<strong>${escapeHTML(log.winner)}</strong>
<p>${escapeHTML(log.conclusion)}</p>
</div>
</div>
</div>
</article>
`;
    }
    function renderBattleLogEmpty(isSearch = false) {
        battleLogList.innerHTML = `
<div class="pf-log-empty">
<div class="pf-log-empty-inner">
<p>${isSearch ? "NO RESULT" : "BATTLE READY"}</p>
<strong>${isSearch ? "검색 결과가 없습니다!" : "아직 전투 기록이 없습니다."}</strong>
<span>${isSearch ? "다른 PLAYER, RULE 또는 PICK으로 검색해보세요." : "첫 번째 대결을 시작해보세요."}</span>
</div>
</div>
`;
    }
    function renderBattleLogCardView(filtered) {
        if (!filtered.length) {
            renderBattleLogEmpty(Boolean(battleLogSearchTerm));
            return;
        }
        battleLogCursor = Math.min(
            Math.max(0, battleLogCursor),
            filtered.length - 1
        );
        const log = filtered[battleLogCursor];
        battleLogList.innerHTML = `
<div class="pf-log-carousel">
<button type="button" class="pf-log-nav" id="pfBattleLogPrev" ${battleLogCursor === 0 ? "disabled" : ""}>◀</button>
<div class="pf-log-card-slot">
${battleLogCardHTML(log)}
<div class="pf-log-pagination">
<span>${battleLogCursor + 1}</span>
<span>/</span>
<span>${filtered.length}</span>
</div>
</div>
<button type="button" class="pf-log-nav" id="pfBattleLogNext" ${battleLogCursor >= filtered.length - 1 ? "disabled" : ""}>▶</button>
</div>
`;
        document.getElementById("pfBattleLogPrev")?.addEventListener("click", () => {
            if (battleLogCursor > 0) {
                battleLogCursor--;
                renderBattleLog();
            }
        });
        document.getElementById("pfBattleLogNext")?.addEventListener("click", () => {
            if (battleLogCursor < filtered.length - 1) {
                battleLogCursor++;
                renderBattleLog();
            }
        });
    }
    function renderBattleLogListView(filtered) {
        if (!filtered.length) {
            renderBattleLogEmpty(Boolean(battleLogSearchTerm));
            return;
        }
        battleLogList.innerHTML = `
<div class="pf-log-list-view">
${filtered.map((log, index) => `
<button type="button" class="pf-log-list-item" data-log-index="${index}">
<span class="pf-log-list-number">${String(index + 1).padStart(2, "0")}</span>
<span class="pf-log-list-main">
<strong>${escapeHTML(log.playerA)} VS ${escapeHTML(log.playerB)}</strong>
<span class="pf-log-list-result">PICK : ${escapeHTML(log.winner)}</span>
</span>
<span class="pf-log-list-date">${escapeHTML(log.timestamp)}</span>
</button>
`).join("")}
</div>
`;
        battleLogList.querySelectorAll(".pf-log-list-item").forEach(button => {
            button.addEventListener("click", () => {
                battleLogCursor = Number(button.dataset.logIndex) || 0;
                battleLogViewMode = "card";
                renderBattleLog();
                battleLogList.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        });
    }
    function renderBattleLog() {
        if (!battleLogList) return;
        ensureBattleLogControls();
        const filtered = getFilteredBattleLogs();
        syncBattleLogViewButtons();
        updateBattleLogResultInfo(filtered);
        if (battleLogViewMode === "list") {
            renderBattleLogListView(filtered);
            return;
        }
        renderBattleLogCardView(filtered);
    }
    function initializeBattleLogUI() {
        if (!battleLogList) return;
        installBattleLogStyles();
        ensureBattleLogControls();
        renderBattleLog();
    }
    function resetBattleState({ scrollToArena = false } = {}) {
        activeBattle = null;
        selectedRules = [];
        deathMatchRule = "";
        deathMatchRuleMode = false;
        battleRunning = false;
        matchStarted = false;
        matchCompleted = false;
        introSkipRequested = false;
        playerAConfirmed = false;
        playerBConfirmed = false;
        playerACharacterIndex = 0;
        playerBCharacterIndex = 2;
        unlockAllInputs();
        if (playerAInput) playerAInput.value = "";
        if (playerBInput) playerBInput.value = "";
        if (situationInput) situationInput.value = "";
        if (customRuleInput) customRuleInput.value = "";
        removeDeathMatchControls();
        document.getElementById("pfDeathRuleGuide")?.remove();
        criteriaButtons.forEach(button => {
            button.disabled = false;
            button.classList.remove("selected", "pf-used-rule");
            button.setAttribute("aria-pressed", "false");
        });
        renderCharacterSelectors();
        renderPlayerStatus("A");
        renderPlayerStatus("B");
        updateSituationStatus();
        renderSelectedRules();
        clearMessage();
        updateFightButtonState();
        if (battleResult) {
            battleResult.innerHTML = `<p class="result-placeholder">READY... 두 선수를 기다리는 중!</p>`;
        }
        if (scrollToArena) {
            const target = document.getElementById("arena") || playerACard || playerAInput;
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }
    function startNewBattle() {
        resetBattleState({ scrollToArena: true });
    }
    function exitToBattleLog() {
        const target = document.getElementById("battle-log")
            || battleLogList?.closest("section")
            || battleLogList;
        resetBattleState({ scrollToArena: false });
        battleLogViewMode = "card";
        battleLogSearchTerm = "";
        battleLogCursor = 0;
        const search = document.getElementById("pfBattleLogSearch");
        if (search) search.value = "";
        renderBattleLog();
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function installV5FinalDesignStyles() {
        const old = document.getElementById("pickFightV5FinalDesignStyles");
        if (old) old.remove();
        const style = document.createElement("style");
        style.id = "pickFightV5FinalDesignStyles";
        style.textContent = `
/* =========================================================
   V5 FINAL DESIGN PASS
   Scope: BATTLE UI + BATTLE LOG CARD VIEW only
========================================================= */

/* ---------- BATTLE: stronger hierarchy, fewer visual boxes ---------- */
.pf-arena {
    overflow: hidden !important;
    background: linear-gradient(
        180deg,
        #817ca8 0 27%,
        #9189b3 27% 51%,
        #a59aba 51% 53%,
        #d7c3ca 53% 76%,
        #d2b8c2 76% 100%
    ) !important;
}
.pf-arena::before {
    opacity: .18 !important;
    background-image:
      linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px),
      linear-gradient(0deg, rgba(48,40,61,.06) 1px, transparent 1px) !important;
    background-size: 16px 16px !important;
}

.pf-round-header {
    min-height: 0 !important;
    padding: 7px 14px 8px !important;
    margin: 0 !important;
    background: rgba(255,248,232,.92) !important;
    border: 0 !important;
    border-bottom: 4px solid rgba(75,62,92,.2) !important;
    box-shadow: none !important;
}
.pf-round-chip {
    order: 3 !important;
    margin: 3px auto 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    font-size: .38rem !important;
    letter-spacing: .08em !important;
    color: #776a84 !important;
}
.pf-rule-focus { gap: 1px !important; }
.pf-rule-focus span {
    font-size: .56rem !important;
    letter-spacing: .02em !important;
}
.pf-rule-focus span::before,
.pf-rule-focus span::after {
    content: "" !important;
    display: inline-block !important;
    width: 14px !important;
    height: 4px !important;
    margin: 0 8px 2px !important;
    background:
      linear-gradient(90deg,#8a789a 0 4px,transparent 4px 6px,#8a789a 6px 10px,transparent 10px 12px,#8a789a 12px 14px) !important;
}
.pf-rule-focus strong {
    margin-top: 1px !important;
    font-size: clamp(1.65rem,4vw,2.55rem) !important;
    line-height: 1 !important;
}

/* HUD sits as two clean player rails */
.pf-hud {
    position: relative !important;
    z-index: 3 !important;
    grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
    gap: 70px !important;
    padding: 10px 22px 4px !important;
    background: transparent !important;
}
.pf-hud-card,
.pf-hud-card.right {
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
}
.pf-hud-top {
    align-items: baseline !important;
    gap: 10px !important;
    margin-bottom: 6px !important;
}
.pf-hud-top strong {
    font-size: 1.05rem !important;
    letter-spacing: .03em !important;
}
.pf-hp-label {
    font-size: .72rem !important;
    font-weight: 900 !important;
}
.pf-hp-bar {
    height: 12px !important;
    border: 2px solid #4a4057 !important;
    background-color: rgba(245,239,241,.42) !important;
    background-image: repeating-linear-gradient(90deg,transparent 0 13px,rgba(74,64,87,.62) 13px 14px) !important;
    box-shadow: none !important;
}
.pf-hp-fill {
    height: 100% !important;
    background-image: repeating-linear-gradient(90deg,rgba(255,255,255,.15) 0 13px,rgba(64,48,72,.22) 13px 14px) !important;
    image-rendering: pixelated !important;
}

/* Arena gets more breathing room and visible stepped floor */
.pf-fighters {
    min-height: 190px !important;
    padding: 13px 36px 20px !important;
    background:
      linear-gradient(180deg,transparent 0 68%,rgba(85,69,106,.09) 68% 70%,rgba(255,244,236,.10) 70% 100%) !important;
}
.pf-fighters::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: .25;
    background:
      radial-gradient(circle at 18% 28%,rgba(255,255,255,.45) 0 2px,transparent 3px),
      radial-gradient(circle at 76% 20%,rgba(255,255,255,.35) 0 2px,transparent 3px),
      radial-gradient(circle at 54% 48%,rgba(69,54,87,.30) 0 2px,transparent 3px);
}

/* Message becomes a thin game-caption rail */
.pf-round-summary {
    margin: 0 22px !important;
    min-height: 0 !important;
    padding: 7px 12px !important;
    border: 0 !important;
    border-top: 2px solid rgba(83,67,101,.36) !important;
    border-bottom: 2px solid rgba(83,67,101,.36) !important;
    background: rgba(255,250,238,.74) !important;
    box-shadow: none !important;
    font-size: .98rem !important;
    line-height: 1.35 !important;
}

/* SCORE: numbers float; no document band */
.pf-score-row,
.pf-score-panel {
    display: grid !important;
    grid-template-columns: 1fr auto 1fr !important;
    align-items: end !important;
    gap: 26px !important;
    margin: 0 24px !important;
    padding: 9px 12px 12px !important;
    border: 0 !important;
    border-bottom: 2px solid rgba(74,59,88,.50) !important;
    background: transparent !important;
    box-shadow: none !important;
}
.pf-score-side {
    display: grid !important;
    justify-items: center !important;
    gap: 2px !important;
}
.pf-score-side span {
    color: #53465f !important;
    font-size: .82rem !important;
    font-weight: 800 !important;
}
.pf-score-side strong {
    color: #30283d !important;
    font-size: clamp(2rem,5vw,3.05rem) !important;
    line-height: .9 !important;
    text-shadow: 3px 3px 0 rgba(255,247,229,.45) !important;
}
.pf-score-mid {
    position: relative !important;
    min-width: 88px !important;
    margin-bottom: 7px !important;
    padding: 5px 9px !important;
    border: 2px solid #a75475 !important;
    background: #f3d6e1 !important;
    color: #8e4967 !important;
    box-shadow: 3px 3px 0 rgba(82,64,91,.40) !important;
    font-size: .45rem !important;
}
.pf-score-mid::before,
.pf-score-mid::after {
    content: "" !important;
    position: absolute !important;
    top: 50% !important;
    width: 18px !important;
    height: 4px !important;
    transform: translateY(-50%) !important;
    background: linear-gradient(90deg,#9e6480 0 5px,transparent 5px 8px,#9e6480 8px 13px,transparent 13px 16px,#9e6480 16px 18px) !important;
}
.pf-score-mid::before { right: calc(100% + 8px) !important; left: auto !important; }
.pf-score-mid::after { left: calc(100% + 8px) !important; right: auto !important; }

/* JUDGE RESULT: one scoreboard with two columns, not two business cards */
.pf-judge-panel {
    margin: 0 24px !important;
    padding: 10px 0 2px !important;
    border: 0 !important;
    background: transparent !important;
}
.pf-judge-title {
    position: relative !important;
    width: max-content !important;
    margin: 0 auto 8px !important;
    padding: 0 22px 5px !important;
    border: 0 !important;
    color: #6e5b80 !important;
    font-size: .48rem !important;
}
.pf-judge-title::before,
.pf-judge-title::after {
    content: "" !important;
    position: absolute !important;
    top: 7px !important;
    width: 12px !important;
    height: 4px !important;
    background: #8b789b !important;
}
.pf-judge-title::before { left: 0 !important; }
.pf-judge-title::after { right: 0 !important; }
.pf-judge-grid {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 0 !important;
    border-top: 2px solid rgba(75,61,89,.30) !important;
    border-bottom: 2px solid rgba(75,61,89,.30) !important;
}
.pf-judge-grid::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 10px;
    bottom: 10px;
    width: 2px;
    background: repeating-linear-gradient(180deg,rgba(83,68,98,.34) 0 5px,transparent 5px 10px);
}
.pf-judge-card,
.pf-judge-card.winner,
.pf-judge-card.loser,
.pf-judge-card.draw {
    min-height: 135px !important;
    margin: 0 !important;
    padding: 12px 16px 14px !important;
    border: 0 !important;
    border-left: 0 !important;
    box-shadow: none !important;
    opacity: 1 !important;
}
.pf-judge-card.winner {
    background: linear-gradient(180deg,rgba(219,236,252,.76),rgba(219,236,252,.42)) !important;
    color: #315f90 !important;
}
.pf-judge-card.loser {
    background: linear-gradient(180deg,rgba(238,235,239,.72),rgba(238,235,239,.36)) !important;
    color: #6f6873 !important;
}
.pf-judge-card.draw {
    background: rgba(242,238,245,.52) !important;
    color: #62566d !important;
}
.pf-judge-card::before,
.pf-judge-card::after { display: none !important; }
.pf-judge-head {
    align-items: center !important;
    margin-bottom: 7px !important;
}
.pf-judge-head strong { font-size: 1.12rem !important; }
.pf-judge-badge {
    padding: 5px 7px !important;
    border: 2px solid currentColor !important;
    background: transparent !important;
    box-shadow: none !important;
    font-size: .42rem !important;
}
.pf-judge-flavor {
    margin: 0 0 5px !important;
    font-size: 1.03rem !important;
    font-weight: 900 !important;
}
.pf-judge-card > p:last-child {
    margin-bottom: 0 !important;
    font-size: .92rem !important;
    line-height: 1.55 !important;
}

/* ONE MORE ROUND: only the action buttons remain boxed */
.pf-round-choice-box {
    margin: 10px 24px 3px !important;
    padding: 12px 0 0 !important;
    border: 0 !important;
    border-top: 3px solid #806c8f !important;
    border-bottom: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
}
.pf-round-choice-box::before {
    width: max-content !important;
    margin: -22px auto 7px !important;
    padding: 0 12px !important;
    background: #d6c2ca !important;
    color: #8e4967 !important;
    font-size: .43rem !important;
}
.pf-round-choice-box h3 {
    margin: 0 0 4px !important;
    font-size: 1.08rem !important;
}
.pf-round-choice-box p {
    margin: 0 auto !important;
    max-width: 620px !important;
    font-size: .88rem !important;
    line-height: 1.5 !important;
}
.pf-round-choice-box .pf-action-row {
    margin-top: 10px !important;
    padding: 0 !important;
}

/* ---------- BATTLE LOG CARD: game record, not document ---------- */
.pf-log-carousel {
    align-items: center !important;
}
.pf-log-nav {
    width: 48px !important;
    height: 66px !important;
    border-width: 3px !important;
    background: rgba(207,195,229,.56) !important;
    box-shadow: 3px 3px 0 rgba(57,50,66,.60) !important;
    opacity: .78 !important;
}
.pf-log-nav:hover:not(:disabled) { opacity: 1 !important; transform: translateY(-2px); }

.pf-log-card.pf-log-game-card {
    padding: 22px 26px 24px !important;
    background:
      linear-gradient(180deg,rgba(255,247,229,.98),rgba(255,247,229,.98)),
      repeating-linear-gradient(90deg,transparent 0 15px,rgba(91,74,108,.025) 15px 16px) !important;
}
.pf-log-card-header {
    align-items: center !important;
    padding-bottom: 12px !important;
    border-bottom: 3px solid #4a4055 !important;
}
.pf-log-versus { gap: 9px !important; }
.pf-log-versus strong {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    color: #5e507b !important;
    font-size: 1.18rem !important;
}
.pf-log-versus strong em {
    color: #c15e84 !important;
    font-family: "Press Start 2P", cursive !important;
    font-size: .42rem !important;
    font-style: normal !important;
    white-space: nowrap !important;
}
.pf-log-mini-character {
    width: 38px !important;
    height: 38px !important;
}
.pf-log-card-header > span { font-size: .86rem !important; }
.pf-log-card-body { padding-top: 13px !important; }

.pf-log-stat-lines {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 4px !important;
    margin: 0 0 15px !important;
    padding: 8px 10px !important;
    border-left: 5px solid #d36d93 !important;
    background: rgba(247,222,231,.38) !important;
}
.pf-log-stat-lines .pf-log-line {
    display: grid !important;
    grid-template-columns: 112px 18px minmax(0,1fr) !important;
    align-items: center !important;
    margin: 0 !important;
    font-size: .96rem !important;
}
.pf-log-stat-lines .pf-log-line strong { color: #a94b6d !important; }
.pf-log-stat-lines .pf-log-line > span { color: #8c6f82 !important; font-weight: 900 !important; }

.pf-log-judgement {
    margin-top: 0 !important;
    padding-top: 0 !important;
    border-top: 0 !important;
}
.pf-log-judgement-title {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    gap: 9px !important;
    margin: 0 0 3px !important;
    padding: 6px 0 8px !important;
    color: #66557e !important;
    font-size: .52rem !important;
    border-bottom: 2px solid #cfc3cc !important;
}
.pf-log-judgement-title::before,
.pf-log-judgement-title::after { content: none !important; }
.pf-log-judgement-title > span {
    display: inline-block !important;
    width: 8px !important;
    height: 8px !important;
    background: #8f789b !important;
    box-shadow: 10px 0 0 #b49dac !important;
    margin-right: 8px !important;
}
.pf-log-judgement-rounds { border: 0 !important; }
.pf-log-judgement-round {
    padding: 11px 0 10px !important;
    border: 0 !important;
    border-bottom: 1px solid #d2c7cd !important;
    background: transparent !important;
}
.pf-log-round-top {
    display: grid !important;
    grid-template-columns: 34px minmax(90px,.75fr) minmax(120px,1fr) !important;
    gap: 10px !important;
    align-items: center !important;
    margin-bottom: 4px !important;
}
.pf-log-round-no {
    color: #c05b82 !important;
    font-family: "Press Start 2P", cursive !important;
    font-size: .48rem !important;
}
.pf-log-round-top strong {
    margin: 0 !important;
    color: #65527c !important;
    font-size: .98rem !important;
}
.pf-log-round-win {
    justify-self: end !important;
    color: #8b4b68 !important;
    font-family: "Galmuri11", sans-serif !important;
    font-size: .9rem !important;
    font-weight: 900 !important;
}
.pf-log-judgement-round p {
    margin: 0 0 0 44px !important;
    color: #50464f !important;
    font-size: .92rem !important;
    line-height: 1.52 !important;
}

/* FINAL PICK is the only strong inner box */
.pf-log-conclusion {
    position: relative !important;
    margin-top: 16px !important;
    padding: 15px 18px 16px !important;
    text-align: center !important;
    border: 3px solid #c45b82 !important;
    background: #fde2ec !important;
    color: #704157 !important;
    box-shadow: 5px 5px 0 #8e4863 !important;
}
.pf-log-conclusion::before,
.pf-log-conclusion::after {
    width: 8px !important;
    height: 8px !important;
    background: #8e4863 !important;
}
.pf-log-final-label {
    display: block !important;
    margin-bottom: 6px !important;
    color: #a8476b !important;
    font-family: "Press Start 2P", cursive !important;
    font-size: .48rem !important;
}
.pf-log-conclusion > strong {
    display: block !important;
    margin-bottom: 5px !important;
    color: #9e3f64 !important;
    font-family: "Galmuri11", sans-serif !important;
    font-size: 1.55rem !important;
    font-weight: 900 !important;
}
.pf-log-conclusion p {
    margin: 0 !important;
    font-size: .95rem !important;
    line-height: 1.5 !important;
}

@media (max-width: 760px) {
    .pf-hud { gap: 18px !important; padding-inline: 12px !important; }
    .pf-fighters { min-height: 170px !important; padding-inline: 12px !important; }
    .pf-score-row { gap: 10px !important; padding-inline: 0 !important; }
    .pf-score-mid { min-width: 72px !important; }
    .pf-judge-grid { grid-template-columns: 1fr !important; }
    .pf-judge-grid::after { display: none !important; }
    .pf-judge-card { min-height: 0 !important; }
    .pf-log-card-header { align-items: flex-start !important; }
    .pf-log-versus strong { flex-wrap: wrap !important; gap: 5px !important; }
    .pf-log-round-top { grid-template-columns: 30px 1fr !important; }
    .pf-log-round-win { grid-column: 2; justify-self: start !important; }
    .pf-log-judgement-round p { margin-left: 40px !important; }
}
`;
        document.head.appendChild(style);
    }



    function installV8FinalDesignStyles() {
        document.getElementById("pickFightV8FinalDesignStyles")?.remove();
        const style = document.createElement("style");
        style.id = "pickFightV8FinalDesignStyles";
        style.textContent = `
/* =========================================================
   V8 FINAL DESIGN POLISH
   agreed scope only
========================================================= */

/* ROUND HEADER: criterion only */
.pf-round-header {
  padding: 14px 18px 16px !important;
  margin-bottom: 0 !important;
  background: #f7f0e2 !important;
  border-bottom: 0 !important;
}
.pf-rule-focus {
  gap: 8px !important;
}
.pf-rule-focus span {
  color: #6b5d7c !important;
  font-size: .64rem !important;
  line-height: 1.3 !important;
  letter-spacing: .03em !important;
}
.pf-rule-focus span::before,
.pf-rule-focus span::after {
  content: "" !important;
  width: 10px !important;
  height: 4px !important;
  margin: 0 8px 2px !important;
  background: #8d7ca0 !important;
}
.pf-rule-focus strong {
  margin-top: 0 !important;
  color: #3a3047 !important;
  font-size: clamp(2rem, 4.4vw, 3rem) !important;
  line-height: 1 !important;
}
.pf-round-chip {
  position: absolute !important;
  left: 50% !important;
  top: 118px !important;
  transform: translateX(-50%) !important;
  z-index: 8 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #f2eefb !important;
  font-family: "Press Start 2P", cursive !important;
  font-size: .62rem !important;
  line-height: 1.3 !important;
  letter-spacing: .08em !important;
  text-shadow: 2px 2px 0 rgba(51,42,67,.45) !important;
}
.pf-round-chip::before,
.pf-round-chip::after {
  content: "" !important;
  display: inline-block !important;
  width: 10px !important;
  height: 4px !important;
  margin: 0 8px 2px !important;
  background: #d7cfea !important;
}

/* BATTLE BACKGROUND: purple only, subtle levels */
.pf-arena {
  position: relative !important;
  background: linear-gradient(180deg,#9a91bb 0 38%,#9188b2 38% 68%,#8a81a9 68% 100%) !important;
}
.pf-hud {
  gap: 64px !important;
  padding: 30px 28px 8px !important;
}
.pf-hud-top strong,
.pf-hp-label {
  color: #f5f1fb !important;
  text-shadow: 2px 2px 0 rgba(55,45,70,.38) !important;
}
.pf-hud-top strong { font-size: 1.08rem !important; }
.pf-hp-label { font-size: .72rem !important; }
.pf-fighters {
  min-height: 196px !important;
  padding: 14px 36px 22px !important;
  background: linear-gradient(180deg,rgba(255,255,255,.035) 0 48%,rgba(64,53,86,.055) 48% 100%) !important;
}
.pf-fighters::before {
  opacity: .10 !important;
  background:
    radial-gradient(circle at 18% 28%,rgba(255,255,255,.35) 0 2px,transparent 3px),
    radial-gradient(circle at 78% 22%,rgba(255,255,255,.28) 0 2px,transparent 3px),
    radial-gradient(circle at 55% 50%,rgba(58,47,78,.18) 0 2px,transparent 3px) !important;
}
.pf-character-shell { position: relative !important; top: 3px !important; }
.pf-character-shadow { margin-top: 7px !important; background: rgba(52,43,70,.18) !important; }

/* SYSTEM MESSAGE */
.pf-round-summary {
  margin: 0 24px !important;
  padding: 9px 14px !important;
  color: #4d4061 !important;
  background: rgba(249,246,252,.86) !important;
  border-top: 0 !important;
  border-bottom: 0 !important;
  font-size: 1rem !important;
}

/* SCORE centered */
.pf-score-row,
.pf-score-panel {
  grid-template-columns: minmax(0,1fr) 96px minmax(0,1fr) !important;
  gap: 20px !important;
  max-width: calc(100% - 56px) !important;
  margin: 6px auto 0 !important;
  padding: 12px 0 16px !important;
  border-bottom: 2px solid rgba(245,241,251,.22) !important;
}
.pf-score-side span {
  color: #eee9f7 !important;
  font-size: .88rem !important;
}
.pf-score-side strong {
  color: #fffaf1 !important;
  text-shadow: 4px 4px 0 rgba(52,43,70,.50) !important;
}
.pf-score-mid {
  justify-self: center !important;
  align-self: center !important;
  min-width: 88px !important;
  margin: 0 !important;
}

/* JUDGE */
.pf-judge-panel { margin-top: 14px !important; padding-top: 14px !important; }
.pf-judge-title {
  margin-bottom: 14px !important;
  color: #f2eef8 !important;
  font-size: .54rem !important;
  text-shadow: 2px 2px 0 rgba(53,44,69,.36) !important;
}
.pf-judge-title::before,
.pf-judge-title::after { background: #d9d0e7 !important; }
.pf-judge-card,
.pf-judge-card.winner,
.pf-judge-card.loser,
.pf-judge-card.draw {
  min-height: 132px !important;
  padding: 15px 18px !important;
}
.pf-judge-head strong { font-size: 1.14rem !important; }
.pf-judge-flavor { font-size: 1.06rem !important; line-height: 1.45 !important; }
.pf-judge-card > p:last-child { font-size: .96rem !important; line-height: 1.58 !important; }

/* ONE MORE ROUND spacing + readability */
.pf-round-choice-box {
  margin: 22px 24px 4px !important;
  padding: 22px 0 0 !important;
  border-top: 2px solid rgba(241,236,248,.42) !important;
}
.pf-round-choice-box::before {
  margin: -31px auto 12px !important;
  padding: 0 12px !important;
  background: #8a81a9 !important;
  color: #f6f1fb !important;
  font-size: .52rem !important;
}
.pf-round-choice-box h3 {
  color: #fff4f8 !important;
  font-size: 1.22rem !important;
  line-height: 1.4 !important;
}
.pf-round-choice-box p {
  color: #f0ebf6 !important;
  font-size: .98rem !important;
  line-height: 1.65 !important;
}
.pf-round-choice-box .pf-action-row { margin-top: 14px !important; }

/* MATCH RESULT: remove the pink field behind characters */
.pf-final-stage {
  background: linear-gradient(180deg,#9990b9 0 52%,#9188b1 52% 100%) !important;
}
.pf-final-grid {
  background: transparent !important;
}
.pf-final-fighter,
.pf-final-fighter.winner,
.pf-final-fighter.defeated {
  background-color: transparent !important;
}
.pf-final-fighter.defeated::before {
  background-color: rgba(56,47,74,.18) !important;
}

/* MATCH RESULT content: ivory only; pink is accent, not fill */
.pf-final-summary {
  background: #fbf4e5 !important;
}
.pf-final-judgement {
  background: transparent !important;
}
.pf-final-pick {
  background: #fffaf0 !important;
  border-color: #cf5f87 !important;
  color: #6f5264 !important;
  box-shadow: 4px 4px 0 #a95473 !important;
}
.pf-final-pick span,
.pf-final-pick strong { color: #aa486b !important; }

@media (max-width:760px) {
  .pf-round-chip { top: 108px !important; font-size: .52rem !important; }
  .pf-hud { padding-top: 28px !important; gap: 20px !important; }
  .pf-score-row, .pf-score-panel { grid-template-columns: 1fr 76px 1fr !important; }
}
`;
        document.head.appendChild(style);
    }


    /* =========================================================
    V9 FINAL MICRO POLISH
    Agreed scope only:
    - more space between ROUND label and HP rails
    - SCORE locked to exact visual center
    - draw uses the normal decision strip with one forced-death button
    ========================================================= */
    function installV9FinalMicroPolishStyles() {
        document.getElementById("pickFightV9FinalMicroPolishStyles")?.remove();
        const style = document.createElement("style");
        style.id = "pickFightV9FinalMicroPolishStyles";
        style.textContent = `
/* ROUND label is a separate line between rule header and HP, never overlapping */
.pf-round-chip {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  display: block !important;
  width: max-content !important;
  margin: 16px auto 12px !important;
  padding: 0 !important;
  color: #f7f3fd !important;
  font-size: .68rem !important;
  line-height: 1.35 !important;
  letter-spacing: .08em !important;
  text-align: center !important;
  text-shadow: 2px 2px 0 rgba(51,42,67,.48) !important;
}
.pf-round-chip::before,
.pf-round-chip::after {
  width: 10px !important;
  height: 4px !important;
  margin: 0 9px 2px !important;
  background: #e2daee !important;
}
.pf-hud {
  padding-top: 0 !important;
  margin-top: 0 !important;
}

/* SCORE exact center: side scores use two equal halves; badge is absolute at 50% */
.pf-score-row,
.pf-score-panel {
  position: relative !important;
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 110px !important;
  align-items: center !important;
  max-width: calc(100% - 56px) !important;
  margin: 8px auto 0 !important;
  padding: 12px 0 18px !important;
}
.pf-score-row > .pf-score-side:first-child,
.pf-score-panel > .pf-score-side:first-child {
  grid-column: 1 !important;
}
.pf-score-row > .pf-score-side:last-child,
.pf-score-panel > .pf-score-side:last-child {
  grid-column: 2 !important;
}
.pf-score-mid {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -42%) !important;
  z-index: 4 !important;
  min-width: 88px !important;
  margin: 0 !important;
  text-align: center !important;
}

/* FINAL-ROUND decision spacing */
.pf-round-choice-box {
  margin-top: 30px !important;
  padding-top: 25px !important;
}
.pf-round-choice-box h3 {
  font-size: 1.26rem !important;
  line-height: 1.45 !important;
}
.pf-round-choice-box p {
  font-size: 1.02rem !important;
  line-height: 1.7 !important;
}

/* Forced HP draw: same place as normal choice, but one clear action only */
.pf-round-choice-box.pf-round-choice-draw {
  border-top-color: rgba(255,238,183,.72) !important;
}
.pf-round-choice-box.pf-round-choice-draw::before {
  content: "◆ HP DRAW ◆" !important;
  background: #8a81a9 !important;
  color: #fff2b7 !important;
}
.pf-round-choice-box.pf-round-choice-draw h3 {
  color: #fff7cf !important;
}
.pf-round-choice-box.pf-round-choice-draw p {
  color: #f5f0fb !important;
}
.pf-action-row-single {
  display: flex !important;
  justify-content: center !important;
  grid-template-columns: none !important;
}
.pf-action-row-single .pf-action-btn {
  width: min(420px, 78%) !important;
  min-width: 280px !important;
  background: #cfe3fb !important;
  color: #315f90 !important;
}

@media (max-width:760px) {
  .pf-round-chip {
    margin: 12px auto 10px !important;
    font-size: .58rem !important;
  }
  .pf-score-row,
  .pf-score-panel {
    gap: 76px !important;
    max-width: calc(100% - 22px) !important;
  }
  .pf-score-mid { min-width: 72px !important; }
  .pf-action-row-single .pf-action-btn {
    width: 100% !important;
    min-width: 0 !important;
  }
}
`;
        document.head.appendChild(style);
    }

    /* =========================================================
    INIT
    ========================================================= */
    installStyles();
    installFinalPixelStyles();
    initializeBattleLogUI();
    installV5FinalDesignStyles();
    installV8FinalDesignStyles();
    installV9FinalMicroPolishStyles();
    renderCharacterSelectors();
    bindEvents();
    renderPlayerStatus(
        "A"
    );
    renderPlayerStatus(
        "B"
    );
    updateSituationStatus();
    renderSelectedRules();
    updateFightButtonState();
});