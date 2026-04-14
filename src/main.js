/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    // 1. Считаем коэффициент скидки (например, если скидка 5%, коэффициент будет 0.95)
    const discount = 1 - (purchase.discount / 100);

    // 2. Считаем итоговую выручку по формуле: цена * количество * скидка
    const revenue = purchase.sale_price * purchase.quantity * discount;

    // 3. Обязательно возвращаем результат, чтобы его получил основной цикл
    return revenue;
}


/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    // const profit = seller.profit
    const { profit } = seller; // Достаем прибыль продавца

    if (index === 0) {
        // 15% — для первого места
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        // 10% — для второго и третьего места
        return profit * 0.10;
    } else if (index === total - 1) {
        // 0% — для последнего места (сравниваем индекс с длиной массива - 1)
        return 0;
    } else {
        // 5% — для всех остальных
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

    // @TODO: Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.customers) || data.customers.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        // Если хотя бы одно условие выше выполнилось — прерываем работу программы
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    if (typeof options !== "object" || options === null) {
        throw new Error('Опции должны быть объектом');
    }

    // Достаем функции из объекта options
    // const calculateRevenue = options.calculateRevenue;
    // const calculateBonus = options.calculateBonus;
    const { calculateRevenue, calculateBonus } = options;

    // Проверяем типы вытащенных переменных
    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error('Переданные опции не являются функциями');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {} // Здесь будем копить товары: { "SKU_001": 5, "SKU_002": 2 }
    }));
    // console.log(sellerStats);

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((result, item) => ({
        ...result,
        [item.id]: item
    }), {});

    const productIndex = data.products.reduce((result, item) => ({
        ...result,
        [item.sku]: item
    }), {});
    // console.log(sellerIndex);
    // console.log(productIndex);

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек

        // 1. Находим продавца в нашем быстром справочнике и смотрим чеки
        const seller = sellerIndex[record.seller_id]; // Продавец

        // 2. Обновляем общие показатели продавца из данных чека

        // Увеличить количество продаж
        seller.sales_count += 1;

        // Увеличить общую сумму выручки всех продаж
        seller.revenue += record.total_amount; // Плюсуем сумму всего чека к выручке


        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {

            // Находим информацию о товаре в справочнике товаров по SKU
            const product = productIndex[item.sku]; // Товар // [item.sku] из data.purchase_records в items

            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека (цена закупки * количество)
            const cost = product.purchase_price * item.quantity;

            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            // Считаем выручку позиции через колбэк
            const revenue = calculateRevenue(item, product);

            // Посчитать прибыль: выручка минус себестоимость
            const profit = revenue - cost;

            // Увеличить общую накопленную прибыль (profit) у продавца
            seller.profit += profit; // Прибавляем прибыль от этого товара в общую копилку продавца

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            // По артикулу товара увеличить его проданное количество у продавца
            seller.products_sold[item.sku] += item.quantity; // Увеличиваем количество проданных штук этого SKU у этого продавца
        });

    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit); // Сортируем продавцов по прибыли (от большего к меньшему)

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        // 1. Считаем бонус через наш колбэк
        // Передаем текущий индекс, общее кол-во продавцов и объект продавца
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        // 2. Формируем топ-10 товаров (цепочка методов)
        seller.top_products = Object.entries(seller.products_sold) // [[sku, q], [sku, q]] Берем объект и «разрезаем» его на пары массивов
            .map(([sku, quantity]) => ({ sku, quantity }))         // [{sku, quantity}, ...] Делаем красивые мини-объекты
            .sort((a, b) => b.quantity - a.quantity)               // Сортируем товары по популярности (по убыванию)
            .slice(0, 10);                                         // Берем элементы с 0-го по 9-й (отрезаем лишнее)

    });
    // console.log(sellerStats);

    // @TODO: Подготовка итоговой коллекции с нужными полями
}
