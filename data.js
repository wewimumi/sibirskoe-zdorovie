const productsData = [
  {
    "id": "1",
    "name": "Витаминный комплекс «Сила Сибири»",
    "category": "vitamins",
    "image": "img/1vitamin-complex.png",
    "volume": "60 капсул",
    "price": 890,
    "isNew": true,
    "promoLabel": "Акция -15%",
    "stock": "В наличии",
    "description": "Комплекс витаминов и минералов для поддержки иммунитета и энергии в течение дня.",
    "isPopular": true
  },
  {
    "id": "2",
    "name": "Фиточай «Тайга детокс»",
    "category": "tea",
    "image": "img/2fitochay-tayga-detoks.png",
    "volume": "100 г",
    "price": 540,
    "isNew": false,
    "promoLabel": "Акция -10% на второй",
    "stock": "Остаток ограничен",
    "description": "Сбор из сибирских трав для мягкого очищения организма и нормализации обмена веществ.",
    "isPopular": true
  },
  {
    "id": "3",
    "name": "Крем для лица «Сибирская гармония»",
    "category": "cosmetics",
    "image": "img/3krem-sibirskaya-garmoniya.png",
    "volume": "50 мл",
    "price": 1150,
    "isNew": true,
    "stock": "В наличии",
    "description": "Увлажняющий крем с экстрактами трав и масел, поддерживает тонус и сияние кожи.",
    "isPopular": false
  },
  {
    "id": "4",
    "name": "Сбор трав «Укрепление иммунитета»",
    "category": "tea",
    "image": "img/4sbor-trav-ukreplenie-immuniteta.png",
    "volume": "75 г",
    "price": 620,
    "isNew": false,
    "promoLabel": "Акция -10% на второй",
    "stock": "В наличии",
    "description": "Эхинацея, шиповник и другие растения для поддержания естественной защиты организма.",
    "isPopular": true
  },
  {
    "id": "5",
    "name": "Омега‑3 «Северное море»",
    "category": "vitamins",
    "image": "img/5omega-3-severnoe-more.png",
    "volume": "90 капсул",
    "price": 980,
    "isNew": false,
    "stock": "В наличии",
    "description": "Источник полиненасыщенных жирных кислот для здоровья сердца и сосудов.",
    "isPopular": false
  },
  {
    "id": "6",
    "name": "Бальзам для тела «Тайга relax»",
    "category": "cosmetics",
    "image": "img/6balzam-dlya-tela-tayga-relax.png",
    "volume": "150 мл",
    "price": 760,
    "isNew": false,
    "stock": "Остаток ограничен",
    "description": "Разогревающий бальзам с эфирными маслами для расслабления мышц после нагрузки.",
    "isPopular": false
  },
  {
    "id": "7",
    "name": "Скраб для тела «Кедровый»",
    "category": "cosmetics",
    "image": "img/7skrab-kedrovyy.png",
    "volume": "200 мл",
    "price": 650,
    "isNew": true,
    "stock": "В наличии",
    "description": "Натуральный скраб с измельченными орехами для гладкости кожи.",
    "isPopular": false
  },
  {
    "id": "8",
    "name": "Витамин D3 «Солнце Сибири»",
    "category": "vitamins",
    "image": "img/8vitamin-d3-solnce-sibiri.png",
    "volume": "30 капсул",
    "price": 720,
    "isNew": false,
    "stock": "В наличии",
    "description": "Поддержка иммунитета и настроения в осенне-зимний период.",
    "isPopular": false
  },
  {
    "id": "9",
    "name": "Чай «Вечерний уют»",
    "category": "tea",
    "image": "img/9chai-uyut.png",
    "volume": "50 г",
    "price": 480,
    "isNew": false,
    "stock": "В наличии",
    "description": "Успокаивающий сбор с мятой и мелиссой для крепкого сна.",
    "isPopular": false
  },
  {
    "id": "10",
    "name": "Маска для лица «Глубокое увлажнение»",
    "category": "cosmetics",
    "image": "img/10maska-glubokoe-uvlazhnenie.png",
    "volume": "75 мл",
    "price": 890,
    "isNew": true,
    "stock": "Нет в наличии",
    "description": "Интенсивный уход для сухой и чувствительной кожи.",
    "isPopular": false
  },
  {
    "id": "11",
    "name": "Комплекс «Активный день»",
    "category": "vitamins",
    "image": "img/11kompleks-aktivnyy-den.png",
    "volume": "60 таблеток",
    "price": 1050,
    "isNew": false,
    "promoLabel": "Хит продаж",
    "stock": "В наличии",
    "description": "Энергия и концентрация внимания для современных ритмов жизни.",
    "isPopular": false
  },
  {
    "id": "12",
    "name": "Бальзам для губ «Защита 365»",
    "category": "cosmetics",
    "image": "img/12balzam-dlya-gub-zashchita-365.png",
    "volume": "4.5 г",
    "price": 250,
    "isNew": false,
    "stock": "В наличии",
    "description": "Питание и защита от ветра и мороза в любое время года.",
    "isPopular": false
  }
];

(function mergeLocalProducts() {
    try {
        const localProducts = localStorage.getItem('local_products');
        if (localProducts) {
            const local = JSON.parse(localProducts);
            const existingIds = new Set(productsData.map(p => String(p.id)));
            
            local.forEach(lp => {
                if (!existingIds.has(String(lp.id))) {
                    productsData.push(lp);
                    existingIds.add(String(lp.id));
                }
            });
            
            console.log(`В data.js добавлено ${local.filter(lp => !existingIds.has(String(lp.id))).length} локальных товаров`);
        }
    } catch(e) {
        console.error('Ошибка при объединении локальных товаров:', e);
    }
})();