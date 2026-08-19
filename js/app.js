document.addEventListener("DOMContentLoaded", () => {
    /* =========================================================
       PICK FIGHT
       COMPLETE MOCK BATTLE FLOW

       IMPORTANT
       - 현재 AI 판정은 MOCK 데이터
       - 실제 AI API 연결 전 UI / UX 완성 단계
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

        return activeBattle.baseRules
            .some(
                item =>
                    item.toLowerCase()
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
                ${
                    deathMatchRule
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


    function createMockRoundResult(
        state,
        rule,
        roundLabel,
        seedKey
    ) {
        const seedA =
            hashString(
                `${state.playerA}|${rule}|${state.situation}|${roundLabel}|${seedKey}|A`
            );

        const seedB =
            hashString(
                `${state.playerB}|${rule}|${state.situation}|${roundLabel}|${seedKey}|B`
            );

        let scoreA =
            58 + (seedA % 38);

        let scoreB =
            58 + (seedB % 38);

        /*
           드물게 실제 DRAW 허용
        */
        if (scoreA === scoreB) {
            if (
                (seedA + seedB) % 5 !== 0
            ) {
                if (seedA % 2 === 0) {
                    scoreA += 2;
                } else {
                    scoreB += 2;
                }
            }
        }

        const winner =
            scoreA > scoreB
                ? "A"
                :
                scoreB > scoreA
                    ? "B"
                    : "DRAW";

        const gap =
            Math.abs(
                scoreA - scoreB
            );

        const copy =
            getJudgeCopy(rule);

        return {
            roundLabel,
            rule,
            scoreA,
            scoreB,
            winner,
            gap,

            damageInfo:
                getDamageInfo(gap),

            summary:
                copy.summary,

            headlineA:
                winner === "A"
                    ? copy.winTitle
                    :
                    winner === "B"
                        ? copy.loseTitle
                        : copy.drawTitle,

            headlineB:
                winner === "B"
                    ? copy.winTitle
                    :
                    winner === "A"
                        ? copy.loseTitle
                        : copy.drawTitle,

            reasonA:
                winner === "A"
                    ? copy.winReason
                    :
                    winner === "B"
                        ? copy.loseReason
                        : copy.drawReason,

            reasonB:
                winner === "B"
                    ? copy.winReason
                    :
                    winner === "A"
                        ? copy.loseReason
                        : copy.drawReason,

            finalLine:
                copy.finalLine
        };
    }


    /* =========================================================
       SPRITE HELPERS
       기존 SVG 그대로 사용
       얼굴 요소 새로 추가 안 함
       ========================================================= */

    function spriteRef(side) {
        return side === "A"
            ? "#sprite-pink"
            : "#sprite-purple-cat";
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

                <div class="pf-scene-topbar">

                    <div
                        class="pf-scene-status"
                        id="pfSceneStatus"
                    >
                        AI JUDGE PREPARING...
                    </div>

                    ${
                        showSkip
                            ? `
                                <button
                                    type="button"
                                    class="pf-entry-skip"
                                    id="pfEntrySkipButton"
                                >
                                    ENTRY SKIP ▶
                                </button>
                            `
                            : ""
                    }

                </div>

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

        stage.innerHTML = `
            <div class="pf-vs-screen">

                <div>

                    <div class="pf-vs-character a">

                        <svg
                            class="pf-character-sprite"
                            viewBox="0 0 16 16"
                        >
                            <use href="#sprite-pink"></use>
                        </svg>

                    </div>

                    <div class="pf-vs-name">
                        ${escapeHTML(state.playerA)}
                    </div>

                </div>


                <div class="pf-vs-mark">
                    VS
                </div>


                <div>

                    <div class="pf-vs-character b">

                        <svg
                            class="pf-character-sprite"
                            viewBox="0 0 16 16"
                        >
                            <use href="#sprite-purple-cat"></use>
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

        stage.innerHTML = `
            <div
                class="pf-arena"
                id="pfArena"
            >

                <div class="pf-round-header">

                    <div class="pf-round-chip">
                        ${escapeHTML(roundLabel)}
                    </div>

                    <div class="pf-rule-focus">

                        <span>
                            ★ 이번 판정 기준 ★
                        </span>

                        <strong>
                            ${escapeHTML(rule)}
                        </strong>

                    </div>

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
                                    ${state.hpA <= 30 ? "danger" : ""}
                                "
                                id="pfHpFillA"
                                style="width:${state.hpA}%"
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
                                    ${state.hpB <= 30 ? "danger" : ""}
                                "
                                id="pfHpFillB"
                                style="width:${state.hpB}%"
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
        const fillA =
            document.getElementById(
                "pfHpFillA"
            );

        const fillB =
            document.getElementById(
                "pfHpFillB"
            );

        const labelA =
            document.getElementById(
                "pfHpLabelA"
            );

        const labelB =
            document.getElementById(
                "pfHpLabelB"
            );

        if (fillA) {
            fillA.style.width =
                `${state.hpA}%`;

            fillA.classList.toggle(
                "danger",
                state.hpA <= 30
            );
        }

        if (fillB) {
            fillB.style.width =
                `${state.hpB}%`;

            fillB.classList.toggle(
                "danger",
                state.hpB <= 30
            );
        }

        if (labelA) {
            labelA.textContent =
                `HP ${state.hpA}`;
        }

        if (labelB) {
            labelB.textContent =
                `HP ${state.hpB}`;
        }
    }


    function refreshInjuries(state) {
        ["A", "B"].forEach(side => {
            const shell =
                document.getElementById(
                    `pfShell${side}`
                );

            if (!shell) return;

            shell.className =
                `pf-character-shell injury-${
                    injuryLevelForSide(
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
            return "무승부";
        }

        return result.winner === side
            ? "판정 승"
            : "판정 패";
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
        seedKey
    ) {
        renderRoundArena(
            state,
            label,
            rule
        );

        await sleep(250);

        showEffect(
            "ANALYZING...",
            "AI 심판이 이번 RULE을 분석하는 중!"
        );

        await sleep(900);

        clearEffect();

        const result =
            createMockRoundResult(
                state,
                rule,
                label,
                seedKey
            );

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

        const scoreDiff =
            Math.abs(
                state.totalScoreA
                -
                state.totalScoreB
            );

        const close =
            hpDiff <= 12
            ||
            scoreDiff <= 15;

        const box =
            document.createElement("div");

        box.className =
            "pf-round-choice-box";

        box.innerHTML = `
            <h3>
                ${
                    close
                        ?
                        "⚠ 이대로 끝내기엔 좀 찝찝한데...?"
                        :
                        "결판은 났다! 그래도 한 판 더?"
                }
            </h3>

            <p>
                ${
                    close
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

    function enterDeathMatchRuleMode() {
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
            "마지막 결판용 새 RULE 하나를 골라주세요! 이미 사용한 RULE은 잠겨 있어요 ♡",
            "success"
        );
    }


    /* =========================================================
       FINAL WINNER
       ========================================================= */

    function decideWinner(state) {
        /*
           KO
        */
        if (
            state.hpA <= 0
            &&
            state.hpB > 0
        ) {
            return {
                winner:
                    "B",

                method:
                    "K.O."
            };
        }

        if (
            state.hpB <= 0
            &&
            state.hpA > 0
        ) {
            return {
                winner:
                    "A",

                method:
                    "K.O."
            };
        }


        /*
           HP 우선
        */
        if (
            state.hpA !== state.hpB
        ) {
            return {
                winner:
                    state.hpA > state.hpB
                        ? "A"
                        : "B",

                method:
                    "DECISION"
            };
        }


        /*
           HP 같다면 누적 AI SCORE
        */
        if (
            state.totalScoreA
            !==
            state.totalScoreB
        ) {
            return {
                winner:
                    state.totalScoreA
                    >
                    state.totalScoreB
                        ? "A"
                        : "B",

                method:
                    "AI DECISION"
            };
        }


        return {
            winner:
                "DRAW",

            method:
                "DRAW"
        };
    }


    /* =========================================================
       FINAL COPY
       ========================================================= */

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

        return (
            `${winnerName}가 한 끗 앞서 `
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
                    ${
                        defeated
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

                ${
                    winner
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


        /* DRAW */
        if (
            decision.winner === "DRAW"
        ) {
            stage.innerHTML = `
                <div class="pf-final-wrap">

                    <div class="pf-final-summary">

                        <h2>
                            MATCH RESULT
                        </h2>

                        <div class="pf-final-judgement">

                            <h3>
                                최종 판결문
                            </h3>

                            <div class="pf-final-round-list">

                                ${
                                    state.roundResults
                                        .map(round => `
                                            <div
                                                class="
                                                    pf-final-round-item
                                                    ${
                                                        round.roundLabel
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
                                    완전 무승부!
                                </strong>

                                <em>
                                    데스매치까지 붙였는데도 둘 다 버텼다!<br>
                                    오늘만큼은 PICK FIGHT도 두 손 들었다 ♡
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

                            ${
                                state.roundResults
                                    .map(round => `
                                        <div
                                            class="
                                                pf-final-round-item
                                                ${
                                                    round.roundLabel
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
                                ${
                                    state.deathMatchPlayed
                                        ?
                                        `기본전으로도 모자라 마지막 결판까지 붙여봤다!<br>
                                         결국 끝까지 살아남은 오늘의 선택은 ${escapeHTML(winnerName)}.`
                                        :
                                        `${escapeHTML(winnerName)}가 끝까지 더 강한 설득력을 보여줬다!`
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
            ).padStart(2,"0")}.`
            +
            `${String(
                now.getDate()
            ).padStart(2,"0")} `
            +
            `${String(
                now.getHours()
            ).padStart(2,"0")}:`
            +
            `${String(
                now.getMinutes()
            ).padStart(2,"0")}`;

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

                ${
                    suddenRound
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


        /*
           한 번만 가능
        */
        if (state.deathMatchPlayed) {
            showMessage(
                "SUDDEN DEATH는 한 번만 진행할 수 있어요!",
                "error"
            );

            return;
        }


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
           추가 연장 없음.
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
       INIT
       ========================================================= */

    installStyles();

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