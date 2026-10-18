/* ============================================================
   아빠의 추천템
   ------------------------------------------------------------
   상품을 추가할 때는 아래 배열에 한 덩어리만 복사해 붙이면 된다.

   cat   : 탭 이름. 두 가지 이상이 되면 자동으로 탭이 생긴다
   name  : 카드에 보일 짧은 이름
   note  : 한 줄 추천 이유 (직접 써 보고 느낀 점)
   img   : 상품 사진 주소 (쿠팡 상품 페이지의 대표 사진)
   url   : 쿠팡 파트너스 링크 (link.coupang.com/a/...)
   badge : 선택. '영상 공개 예정', '공구 중' 같은 딱지
   video : 선택. 소개한 영상 주소가 있으면 '영상 보기' 버튼이 생긴다
   ============================================================ */
const PRODUCTS = [
  {
    cat: '주방·식사',
    name: '시리얼 디스펜서',
    note: '아침마다 시리얼·오트밀을 아이가 직접 받아 먹어요.',
    img: 'https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/vendor_inventory/3795/5c10ea46aa5e334bc54627b572c3e6a581519861a4cc4084630d2dbdd004.jpeg',
    url: 'https://link.coupang.com/a/hjfJCi5HLo',
  },
  {
    cat: '놀이·생활',
    name: '카라즈 논슬립 패드',
    note: '거실 바닥에 깔아 두니 아이가 뛰어도 밀리지 않고 층간소음 걱정이 줄었어요.',
    img: 'https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/vendor_inventory/image_audit/stage/manual/9ccb8584-c833-4a29-ba9b-b659b3c35f9e_1779863730936.jpeg',
    url: 'https://link.coupang.com/a/hXCIm9z5zg',
  },
  /* 파트너스 링크(url)·사진(img)을 받으면 주석을 풀고 TODO 를 채운다
  {
    cat: '아이방',
    name: '레이디가구 스칸딕 데일리 원목침대 SS',
    note: '아이 침대로 쓰고 있는 핀란드산 소나무 원목침대예요. 함께 쓰는 제품은 연희데코 것인데 쿠팡에는 없어서 이름만 적어 둘게요.',
    img: 'TODO',
    url: 'TODO',
  },
  */
];
