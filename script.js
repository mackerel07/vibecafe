// Supabase 프로젝트를 연결하는 공개 URL과 publishable key입니다.
// 이 키는 브라우저에서 사용해도 되며, 실제 접근 범위는 RLS 정책이 제한합니다.
const SUPABASE_URL = "https://fxpzxokqkpzmilemtxgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_H_rLEa-o-vT_z8cG89EUKg_XJexlmjs";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 옵션 값(영문)을 화면에 보여줄 한글 이름으로 변환하기 위한 사전(객체)
const beverageNamesMap = {
    americano: "아메리카노",
    cafelatte: "카페라떼",
    cafemocha: "카페모카",
    vanillalatte: "바닐라라떼",
    greentealatte: "녹차라떼"
};

const optionNamesMap = {
    shot: "샷 추가",
    cream: "크림 추가",
    syrup: "시럽 추가",
    decaf: "디카페인"
};

// -----------------------------------------------------------------
// 추가된 상태 변수 (주문 내역 관리)
// -----------------------------------------------------------------
let orders = []; // 주문들을 차곡차곡 저장할 빈 배열
let orderIdCounter = 1; // 1번 주문부터 시작

// -----------------------------------------------------------------
// 탭 전환 기능
// -----------------------------------------------------------------
const tabOrder = document.getElementById('tabOrder');
const tabHistory = document.getElementById('tabHistory');
const viewOrder = document.getElementById('viewOrder');
const viewHistory = document.getElementById('viewHistory');

tabOrder.addEventListener('click', function() {
    // 탭 디자인 변경
    tabOrder.classList.add('active');
    tabHistory.classList.remove('active');
    
    // 보여줄 화면 변경 (주문 화면 보이고, 내역 화면 숨김)
    viewOrder.classList.remove('hidden');
    viewHistory.classList.add('hidden');
});

tabHistory.addEventListener('click', function() {
    // 탭 디자인 변경
    tabHistory.classList.add('active');
    tabOrder.classList.remove('active');
    
    // 보여줄 화면 변경 (내역 화면 보이고, 주문 화면 숨김)
    viewHistory.classList.remove('hidden');
    viewOrder.classList.add('hidden');
});

/**
 * 실시간 예상 금액을 계산하는 함수 (재사용 가능)
 */
function calculateTotal() {
    const beverageSelect = document.getElementById('beverage');
    const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];

    if (selectedOption.value === "") {
        document.getElementById('totalPriceDisplay').innerText = "예상 금액: 0원";
        return 0; 
    }

    let beveragePrice = parseInt(selectedOption.getAttribute('data-price'));
    const sizeRadio = document.querySelector('input[name="size"]:checked');
    let sizePrice = parseInt(sizeRadio.getAttribute('data-price'));

    const checkedOptions = document.querySelectorAll('input[name="options"]:checked');
    let optionsPrice = 0;
    
    checkedOptions.forEach(function(checkbox) {
        optionsPrice += parseInt(checkbox.getAttribute('data-price'));
    });

    const quantityInput = document.getElementById('quantity');
    let quantity = parseInt(quantityInput.value);
    
    if (isNaN(quantity) || quantity < 1) {
        quantity = 1;
    }

    const total = (beveragePrice + sizePrice + optionsPrice) * quantity;
    document.getElementById('totalPriceDisplay').innerText = "예상 금액: " + total.toLocaleString() + "원";

    return total;
}

// 이벤트 리스너 등록
document.getElementById('beverage').addEventListener('change', calculateTotal);
document.getElementById('quantity').addEventListener('input', calculateTotal);

const sizeRadios = document.querySelectorAll('input[name="size"]');
sizeRadios.forEach(function(radio) {
    radio.addEventListener('change', calculateTotal);
});

const optionCheckboxes = document.querySelectorAll('input[name="options"]');
optionCheckboxes.forEach(function(checkbox) {
    checkbox.addEventListener('change', calculateTotal);
});

// -----------------------------------------------------------------
// 폼 제출(주문하기) 버튼 클릭 시의 동작
// -----------------------------------------------------------------
document.getElementById('orderForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const submitButton = document.getElementById('submitOrderBtn');
    const nameInput = document.getElementById('customerName').value.trim();
    const phoneInput = document.getElementById('customerPhone').value.trim();
    const beverageSelect = document.getElementById('beverage');
    const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];

    if (nameInput === "") {
        alert("이름을 입력해주세요");
        return; 
    }

    if (phoneInput === "") {
        alert("전화번호를 입력해주세요");
        return;
    }

    if (selectedOption.value === "") {
        alert("음료를 선택해주세요");
        return; 
    }

    const totalAmount = calculateTotal();
    const beverageName = beverageNamesMap[selectedOption.value];
    const sizeValue = document.querySelector('input[name="size"]:checked').value;
    const checkedOptions = document.querySelectorAll('input[name="options"]:checked');
    let optionNamesArray = [];
    
    checkedOptions.forEach(function(checkbox) {
        optionNamesArray.push(optionNamesMap[checkbox.value]);
    });

    let optionText = "";
    if (optionNamesArray.length > 0) {
        optionText = " (" + optionNamesArray.join(", ") + ")";
    }

    const quantity = parseInt(document.getElementById('quantity').value);
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
        alert("수량은 1잔부터 10잔까지 선택해주세요");
        return;
    }

    const drinkPrice = parseInt(selectedOption.getAttribute('data-price'));
    const requestsText = document.getElementById('requests').value.trim();

    // 저장하는 동안 버튼을 잠가 같은 주문이 두 번 들어가는 것을 막습니다.
    submitButton.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('cafe_menu03')
            .insert({
                customer_name: nameInput,
                phone: phoneInput,
                drink: beverageName,
                drink_price: drinkPrice,
                size: sizeValue,
                options: optionNamesArray,
                quantity: quantity,
                request: requestsText || null,
                total_price: totalAmount
            });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error("Supabase 주문 저장 오류:", error);
        alert("주문 저장에 실패했어요");
        return;
    } finally {
        submitButton.disabled = false;
    }

    // Supabase 저장에 성공하면 기존 주문 확인 메시지를 표시합니다.
    const finalMessage = nameInput + "님, " + beverageName + " " + sizeValue + "사이즈" + optionText + " " + quantity + "잔, 총 " + totalAmount.toLocaleString() + "원 주문이 접수되었습니다!";
    const confirmBox = document.getElementById('confirmationMessage');
    confirmBox.innerText = finalMessage;
    confirmBox.style.display = "block";

    // --- 주문 내역(배열)에 데이터 저장하기 ---
    // 주문한 시간 가져오기 (예: 오후 1:30)
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });

    // 하나의 주문 정보를 객체로 묶습니다.
    const newOrder = {
        id: orderIdCounter,
        name: nameInput,
        beverage: beverageName,
        size: sizeValue,
        optionText: optionText, // " (샷 추가)" 
        quantity: quantity,
        total: totalAmount,
        requests: requestsText,
        time: timeString
    };

    // 준비된 주문 객체를 배열에 넣고, 다음 주문을 위해 번호를 1 올립니다.
    orders.push(newOrder);
    orderIdCounter++;

    // 배열이 바뀌었으니 주문 내역 화면을 새로 그립니다.
    renderOrders();
});

// -----------------------------------------------------------------
// 다시 작성(리셋) 버튼 클릭 시의 동작
// -----------------------------------------------------------------
document.getElementById('orderForm').addEventListener('reset', function() {
    setTimeout(function() {
        calculateTotal();
        document.getElementById('confirmationMessage').style.display = "none";
    }, 0);
});

// -----------------------------------------------------------------
// 주문 내역 화면 안의 목록을 그리는 단일 함수
// -----------------------------------------------------------------
function renderOrders() {
    const listContainer = document.getElementById('orderList');
    const badge = document.getElementById('orderBadge');
    const summaryText = document.getElementById('historySummary');

    // 1. 기존에 그려진 목록을 싹 지우기 (새로 덮어쓰기 위해)
    listContainer.innerHTML = "";

    // 2. 탭 제목 옆의 둥근 주문 건수 뱃지 숫자 갱신
    if (orders.length > 0) {
        badge.textContent = orders.length; // 보안을 위해 textContent 사용
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // 3. 만약 접수된 주문이 하나도 없다면 빈 화면 안내를 보여줌
    if (orders.length === 0) {
        const emptyP = document.createElement('p');
        emptyP.className = 'empty-msg';
        emptyP.textContent = "아직 주문 내역이 없어요 ☕";
        listContainer.appendChild(emptyP);
        
        summaryText.textContent = "총 주문 금액: 0원 (0건)";
        return; // 더 이상 그릴 게 없으니 여기서 함수 종료
    }

    // 4. 총 주문 금액 계산용 변수
    let grandTotal = 0;

    // 5. 최신 주문(나중에 들어온 주문)이 맨 위에 오게 하려고 배열을 뒤에서부터 돕니다.
    for (let i = orders.length - 1; i >= 0; i--) {
        const order = orders[i];
        grandTotal += order.total; // 가격을 누적해서 더함

        // 개별 주문을 감싸는 카드 모양 상자(div) 만들기
        const card = document.createElement('div');
        card.className = 'order-card';

        // 1줄: 주문번호와 이름, 그리고 결제 금액
        const row1 = document.createElement('div');
        row1.className = 'order-card-row1';
        row1.textContent = "#" + order.id + " " + order.name + "님 · " + order.total.toLocaleString() + "원";
        card.appendChild(row1);

        // 2줄: 음료 종류, 사이즈, 옵션, 잔 수
        const row2 = document.createElement('div');
        row2.className = 'order-card-row2';
        row2.textContent = order.beverage + " " + order.size + "사이즈" + order.optionText + " " + order.quantity + "잔";
        card.appendChild(row2);

        // 3줄: 요청사항과 주문 시간 (요청사항이 있을 때만 글자가 보임)
        const row3 = document.createElement('div');
        row3.className = 'order-card-row3';
        if (order.requests !== "") {
            row3.textContent = "요청사항: " + order.requests + " · " + order.time;
        } else {
            row3.textContent = order.time;
        }
        card.appendChild(row3);

        // 카드의 오른쪽 위에 들어갈 취소 버튼
        const cancelBtn = document.createElement('button');
        cancelBtn.type = "button"; // 기본 폼 제출 동작을 막기 위해 지정
        cancelBtn.className = 'btn-cancel-order';
        cancelBtn.textContent = "취소";
        
        // 취소 버튼을 눌렀을 때의 동작
        cancelBtn.addEventListener('click', function() {
            // 실수로 누르는 걸 방지하기 위해 한 번 더 물어봄
            if (confirm("주문을 취소하시겠습니까?")) {
                // 배열에서 방금 누른 그 주문(order.id)만 제외하고 새로운 배열을 만듭니다. (삭제 효과)
                orders = orders.filter(function(item) {
                    return item.id !== order.id;
                });
                
                // 데이터(배열)가 지워졌으니 화면도 다시 그립니다.
                renderOrders(); 
            }
        });
        card.appendChild(cancelBtn);

        // 정성껏 조립한 카드를 화면의 목록 공간에 밀어 넣습니다.
        listContainer.appendChild(card);
    }

    // 6. 목록 아래의 최종 요약 텍스트 업데이트
    summaryText.textContent = "총 주문 금액: " + grandTotal.toLocaleString() + "원 (" + orders.length + "건)";
}

// 사용자가 처음 화면을 열었을 때, 빈 목록 안내 메시지를 보여주기 위해 한 번 실행해 둡니다.
renderOrders();

// -----------------------------------------------------------------
// 내역 모두 지우기 버튼 동작
// -----------------------------------------------------------------
document.getElementById('clearHistoryBtn').addEventListener('click', function() {
    if (orders.length === 0) {
        alert("지울 내역이 없습니다.");
        return;
    }
    
    // 다시 한 번 확인창을 띄웁니다.
    if (confirm("정말 모든 주문 내역을 지우시겠습니까?")) {
        orders = []; // 배열을 텅 비게 만듭니다.
        renderOrders(); // 배열이 비었으니 목록 그리는 함수를 다시 부르면 빈 화면으로 바뀝니다.
    }
});
