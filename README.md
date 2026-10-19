# Art Market Ledger 📝 (아트마켓 현장 장부)

마켓 현장에서 **폰으로** 판매 기록 · 잔돈 · 재고를 관리하는 앱입니다.
앱 화면은 전부 **영어**, 이 설명서는 한국어입니다.

```
artmarket-program00/
├── artmarket-standalone.html  ← 폰에 넣을 때는 이 파일 하나만! (전부 합쳐진 버전)
├── index.html                 ← 작업용 (css·js 분리 버전)
├── style.css
├── app.js
├── build-single.py            ← 위 3개를 standalone 한 파일로 합치는 스크립트
└── README.md
```

> **서버·백엔드 없음.** 기록은 전부 그 폰(브라우저) 안에만 저장되고 밖으로 나가지 않습니다.
> 로그인도, 다른 사람과의 공유도 없습니다. 대신 **내보내기(PDF·CSV·JSON)** 로 언제든 꺼낼 수 있습니다.

---

## 1. 장부를 어떻게 정리하는가 (설계 원칙)

### ① 재고 장부와 금전 장부를 분리합니다
| 기록 | 단위 | 쓰는 곳 |
|---|---|---|
| **재고** | 디자인별 "몇 장" | 어떤 엽서가 잘 나가는지, 몇 장 남았는지 |
| **금액** | 거래별 "얼마" | 매출, 받은 돈, 잔돈, 금고 대사 |

엽서처럼 **묶음 할인**이 있는 상품은 "1장 = 3€"로 매출을 적으면 실제 받은 돈과 어긋납니다. 그래서 한 거래에서
- **수량**은 디자인별로 (macaron ×2, horse ×1 → 재고 차감)
- **금액**은 거래 전체로 (3장 = 세트 5€ + 낱개 3€ = **8€**)

로 기록하고, 디자인별 매출은 수량 비율로 나눠 담습니다 (5.33€ / 2.67€ → 합계 8€로 딱 맞음).

### ② 할인은 "빼고 적지" 말고 "할인 금액"으로 남깁니다
`List price 9€ · Bundle discount −1€ · To collect 8€` — 이렇게 남겨야 할인으로 얼마를 썼는지 보입니다.

### ③ 파운드(카드)는 환산하지 말고 **파운드 그대로** 기록합니다
- 카드 = £ 금액 그대로, **잔돈 칸 없음**
- 현금 = € 금액 + 받은 돈 + 잔돈
- **두 통화를 하나로 합치지 않습니다** (환율 환산 없음)
- **PDF 리포트도 통화별로 완전히 분리**되어 나옵니다

### ④ 현금은 "지금 갖고 있어야 할 돈"으로 대사합니다
`받은 현금 − 거슬러 준 잔돈` = 장부가 말하는, 오늘 들어온 현금.
마켓이 끝나고 (처음에 넣어둔 잔돈을 뺀) 실제 현금을 세어 이 숫자와 맞춰보면 됩니다.

---

## 2. 폰에서 쓰는 방법

### 방법 A — 파일 하나를 폰에 넣기 (제일 간단)
`artmarket-standalone.html` **한 파일만** 에어드롭 / 메일 / 파일앱으로 폰에 옮기고 탭해서 엽니다.
CSS·JS가 안에 다 들어 있어서 파일 하나로 동작합니다.

> ⚠️ **주의:** 아이폰 사파리는 파일로 직접 연 페이지(`file://`)의 저장 기능을 막는 경우가 있습니다.
> 앱 위에 **노란 경고줄**이 뜨면 기록이 저장되지 않는 상태이니, 아래 방법 B로 바꾸세요. 안드로이드 크롬은 대체로 잘 됩니다.

### 방법 B — 주소로 열기 (현장 추천, 그래도 백엔드 아님)
1. [app.netlify.com/drop](https://app.netlify.com/drop) 에 `artmarket-standalone.html`을 드래그 (가입 없이 10초, 무료)
2. 생긴 주소를 폰으로 열고 → **공유 → 홈 화면에 추가**
3. 홈 화면 아이콘으로 열면 주소창 없는 앱처럼 쓰입니다

서버는 **HTML 파일을 건네주기만** 할 뿐, 판매 기록은 여전히 폰 안에만 저장됩니다.
한 번 연 뒤에는 인터넷이 끊겨도 대부분 그대로 열립니다.

### 방법 C — 맥을 서버로 (같은 와이파이)
```bash
cd ~/Documents/artmarket-program/artmarket-program00 && python3 -m http.server 8000
```
폰에서 `http://맥의-IP:8000/artmarket-standalone.html` 접속.

> 📌 **기록은 그 폰·브라우저 안에만 저장됩니다.** 기기끼리 동기화되지 않으니 현장에서는 **한 기기로만** 기록하세요.

---

## 3. 화면별 사용법 (하단 탭 4개)

### 🧾 Sell (판매)
0. 파란 헤더 오른쪽 위 **🧪 Test** 스위치가 꺼져 있는지 확인 (연습할 땐 켜기)
1. **💶 Cash €** / **💳 Card £** 선택 (색이 바뀝니다)
2. 상품을 탭할 때마다 1개씩 담김 — 엽서는 디자인별로 탭
3. 아래 장바구니에 `List price → Bundle discount → To collect` 자동 계산
4. 현금이면 **Cash received** 입력 (`Exact`, `€5`, `€10`, `€20`, `€50` 버튼) → **Change to give**가 크게 표시
5. **✅ Record** → 장부 저장 + 재고 차감

장바구니는 아이폰 기본 시트처럼 **손잡이(회색 막대)를 끌어서** 높이를 3단계로 조절할 수 있습니다 —
살짝 보기(합계만) / 중간 / 전체. 손잡이를 톡 치면 전체↔살짝 보기로 바뀝니다.

상품은 **카테고리별로 색이 다릅니다** — 🔵 Postcards · 🟢 Collab · 🟠 Nayeon · 🟣 JH · 🩷 Friends.
바쁠 때 색으로 바로 찾으세요. 재고 화면과 장부 정산표에도 같은 색이 들어갑니다.

목록에 없는 판매는 **✏️ Custom amount**로 추가합니다 (재고 차감 없음).

### 📦 Stock (재고)
- **보기 전용 화면입니다** (실수로 숫자가 바뀌지 않게)
- 남은 수량 / 처음 수량, 막대 그래프, 오늘 몇 개 팔렸는지
- 3개 이하는 주황, 품절은 빨강
- 숫자를 고치려면 **Settings → Products · Stock**에서
- 맨 아래 **Reset all stock to starting quantity** = 다음 마켓 준비용 (두 번 탭)

### 📊 Ledger (장부)
- 날짜별(또는 All time) 요약: 현금 매출 €, 카드 매출 £, 받은 현금, 거슬러 준 잔돈, **Cash you should be holding**, 할인, 건수/수량
- **Settlement by category** — Postcards / Collab / Nayeon / JH / Friends 별 수량·€·£ (제작자끼리 나눌 때 이 표만 보면 됩니다)
- **Sales by product**, **Transactions**

**내보내기 — 통화별로 따로**

| 버튼 | 결과 |
|---|---|
| 💶 EUR (€) PDF | 유로 현금 거래만 담긴 리포트 (받은 돈·잔돈·금고 현금 포함) |
| 💳 GBP (£) PDF | 파운드 카드 거래만 담긴 리포트 (잔돈 없음) |
| EUR / GBP / All CSV | 엑셀·구글시트용 (한 줄 = 상품 1종) |
| JSON backup | 전체 데이터 백업·복원용 |

PDF 저장법: 버튼 → 인쇄 화면 → **Save as PDF** (아이폰: 공유 → 파일에 저장).

### ⚙️ Settings (설정)
- **Postcard price** — 1장/2장 € · £ (여기만 고치면 전체 적용)
- 상품 이름 · € · £ · 재고 · **카테고리** 수정, 상품 추가/삭제
- JSON 백업·복원, 기록 삭제

---

## 4. 🧪 테스트 모드 · 잘못 누른 기록 지우기

### 연습할 때
**파란 헤더 오른쪽 위의 🧪 Test 스위치**를 켜면 됩니다 (어느 탭에서나 보입니다).
- 켜져 있으면 **상단바 전체가 파란색 → 주황색**으로 바뀌고, 주황 배너가 뜨고, Record 버튼이 **🧪 Record (test)** 로 바뀝니다
- 상단의 Cash today · Card today · Sales/items 숫자도 **테스트용 숫자로 갈아탑니다** (🧪 표시). 테스트로 기록하면 이 숫자가 움직이지만,
  **진짜 매출 숫자는 그대로 보관**돼 있다가 테스트 모드를 끄면 원래 값으로 돌아옵니다
- 이 상태에서 기록해도 **매출·재고가 전혀 바뀌지 않습니다**
- 연습 기록은 Ledger 탭 아래 **🧪 Test records**에 따로 쌓이고, **Delete all test records**로 한 번에 지웁니다
- 마켓 시작 전에 **꼭 끄세요** (스위치를 다시 누르거나 배너의 `Turn off`)

### 잘못 기록한 걸 지울 때
모든 삭제 버튼은 **두 번 눌러야** 실행됩니다 (팝업이 막히는 폰에서도 되도록). 한 번 누르면 빨갛게 바뀌고, 4초 안에 다시 누르면 실행됩니다.

| 버튼 | 위치 | 하는 일 |
|---|---|---|
| **Delete** | Ledger → Transactions의 각 줄 | 그 거래 1건 삭제 + 재고 복구 |
| **🗑 Delete all records for this date** | Ledger → Transactions 아래 | 선택한 날짜 전체 삭제 + 재고 복구 |
| **🧹 Delete all sales + reset stock** | Settings → Data | 판매 기록 전부 삭제 + 재고 처음대로 (상품·가격은 유지) |
| **Factory reset** | Settings → Data | 상품·가격·카테고리까지 처음 상태로 |

---

## 5. 등록된 상품 · 카테고리

| 카테고리 | 상품 | 재고 | € | £ |
|---|---|---|---|---|
| 🔵 **Postcards** (1장 3€·2장 5€ / 1장 £2.5·2장 £4) | postcard macaron / crape / horse / dog / the scren / staircase | 각 15 (총 90) | 3 | 2.5 |
| 🟢 **Collab** | Small Peace Zine | 60 | 10 | 8.5 |
| 🟠 **Nayeon** | Dog Sticker 🐶 | 8 | 5 | 4.5 |
| | Homil Asshole 🐈‍⬛ | 30 | 8 | 7 |
| | Homil Poop 🐈‍⬛💩 | 30 | 8 | 7 |
| | Fish Linocut 🐠 | 9 | 8 | 7 |
| | Tiger Linocut 🐯 | 20 | 10 | 8.5 |
| | 📖 Becca zine 👽 | 55 | 6 | 5 |
| | 📖 Fish zine 🐟 | 38 | 4 | 3.5 |
| | 📖 GK zine ❄️ | 30 | 8 | 7 |
| | 1 / 2 / 3 Bologna Print A4 | 각 4 | 10 | 9 |
| | Dog postcard 🐶 | 5 | 3 | 2.5 |
| 🟣 **JH** | 📖 JH Cutout | 2 | 58 | 50 |
| | 📖 Nao Big zine | 2 | 18 | 15 |
| | 📖 Nao small zine | 2 | 10 | 9 |
| | Juicy | 1 | 10 | 9 |
| | Valentine card (1개 3€·2개 5€ / £2.5·£4) | 16 | 3 | 2.5 |
| | Year of snake | 1 | 5 | 4 |
| 🩷 **Friends** | 📖 Hazel zine | 5 | 5 | 4 |
| | 📖 Lowercase | 7 | 20 | 19 |
| | Han book | 3 | 20 | 19 |

합계 **28종 / 426개**. 가격·재고가 모두 채워져 있습니다.

- **Dog postcard**는 Nayeon 카테고리에 €3 / 재고 5로 따로 있습니다. 엽서 6종(`postcard dog` 포함)과는 별개예요.
- 📖 **Nao Big / Nao small zine**은 JH 카테고리로 옮겼습니다.
- **가격은 27종 모두 € · £ 둘 다 채워져 있습니다.**
- 가격이나 재고를 바꾸려면 **Settings → Products · Stock**에서 숫자만 고치면 됩니다.

---

## 6. 마켓 전 체크리스트

1. ⚙️ Settings → 가격·재고가 실제와 맞는지 한 번 확인
2. ⚙️ Settings → **Products · Stock**에서 실제 가져온 수량과 맞는지 확인
3. 📦 Stock 탭에서 전체 현황 한 번 훑기
5. 🧪 헤더 오른쪽 위 **Test 스위치가 꺼져 있는지 확인**
6. 연습했다면 **🧹 Delete all sales + reset stock** 한 번

## 7. 마켓 끝나고

1. 📊 Ledger에서 **Cash you should be holding**과 실제 현금 비교
2. **💶 EUR PDF**, **💳 GBP PDF** 두 장 저장
3. **EUR CSV / GBP CSV** 내보내기 → 엑셀·구글시트
4. **JSON backup** 한 번 (폰을 바꾸거나 브라우저 데이터를 지워도 복원 가능)

---

## 8. 여러 날 연속 마켓 (예: 10/23~25 3일)

**아무것도 따로 안 해도 숫자는 계속 누적됩니다.**

- 판매 기록은 날짜를 달고 쌓이기만 하고, 자동으로 지워지지 않습니다
- **재고는 다음 날로 그대로 이어집니다** (23일에 90장 → 70장이면 24일도 70장에서 시작)
- 날짜는 자정에 자동으로 넘어갑니다

| 보고 싶은 것 | 방법 |
|---|---|
| 그날 번 돈 (금고 대사용) | 상단 숫자 기본값 `Cash today` |
| **3일 누적** | 상단 숫자를 **한 번 탭** → `Cash all 3 days`로 바뀜 (다시 탭하면 원래대로) |
| 하루치 자세히 | Ledger → Date에서 날짜 선택 |
| 3일 전체 정산 | Ledger → Date → **All days (total)** |
| 3일 전체 PDF | All days 선택 후 💶/💳 PDF — 제목에 `2026-10-23 ~ 2026-10-25`가 찍힙니다 |

### 3일 동안 하지 말아야 할 것
- 📦 Stock의 **Reset all stock to starting quantity** — 재고가 첫날 수량으로 되돌아갑니다 (마켓 끝난 뒤에만)
- Settings의 **🧹 Delete all sales** / **Factory reset** — 3일치가 통째로 날아갑니다

### 매일 밤 추천
1. 📊 Ledger → 그날 날짜로 **Cash you should be holding** 확인 → 실제 현금과 대조
2. **JSON backup** 한 번 (폰 저장소는 브라우저가 관리하는 공간이라, 하루치씩 파일로 빼두면 안전합니다)

마지막 날에만 **All days**로 PDF 2장(€ · £)과 CSV를 뽑으면 3일 전체 정산이 끝납니다.

## 9. 파일을 고친 뒤에는

`index.html` · `style.css` · `app.js`를 고쳤다면, 폰에 넣을 단일 파일을 다시 만들어야 합니다.

```bash
cd ~/Documents/artmarket-program/artmarket-program00 && python3 build-single.py
```

## 10. 가격 규칙 · 카테고리 바꾸기

세트 할인은 "2장 묶음"만이 아니라 자유롭게 확장할 수 있습니다. `app.js`의 `defaultState()` 안 Postcards 카테고리에 규칙을 추가하면 가장 싼 조합이 자동 계산됩니다.

```js
bundles: [
  { qty: 2, EUR: toC(5),  GBP: toC(4) },    // 2장 5€ / £4
  { qty: 5, EUR: toC(12), GBP: toC(9.5) }   // 5장 12€ 추가 → 7장 = 5장세트 + 2장세트
]
```

**상품 하나에만** 묶음가를 걸 수도 있습니다 (Valentine card처럼). 상품 객체에 `bundles: [{ qty: 2, EUR: toC(5), GBP: toC(4) }]`를 넣으면 되고,
그 상품의 묶음 가격은 **Settings의 그 상품 칸에서** 바로 수정할 수 있습니다. 엽서끼리·발렌타인끼리 따로 계산되니 섞어 담아도 안전합니다.

카테고리를 추가하려면 같은 파일의 `categories` 배열에 `{ id: 'xxx', name: 'Display name' }`을 넣으면 되고,
상품의 카테고리는 **설정 화면에서 드롭다운으로** 바로 옮길 수 있습니다.
(이미 쓰던 데이터가 있으면 Settings → Factory reset 후 적용됩니다.)
