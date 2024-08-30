const express = require('express');
const axios = require('axios');
const moment = require('moment-timezone');

const app = express();
app.set('view engine', 'ejs');

// Função para buscar dados de múltiplas APIs
async function fetchOrdersFromMultipleApis() {
    const tokens = [
        '1c7a5f40cff04a96b99ec9acbd7a8ca6',
        '488296234f0b44c48f7a95829e6f153a',
        'fd7ac145d93248fc851d3a0120bfb042',
        'adf5c02e7a834102ba6fc42d9595279b'
    ];

    let allOrders = [];
    const headers = {
        'Content-Type': 'application/json;charset=UTF-8'
    };

    for (const token of tokens) {
        headers['Authorization'] = token;
        const startDate = moment().tz('UTC').startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS') + "-03:00";
        const endDate = moment().tz('UTC').startOf('day').add(3, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS') + "-03:00";

        console.log(`Solicitando dados da API com startDate=${startDate} e endDate=${endDate}`);

        const url = `https://app.foodydelivery.com/rest/1.2/orders/?startDate=${startDate}&endDate=${endDate}`;

        try {
            const response = await axios.get(url, { headers });
            const data = response.data;
            console.log(`Resposta da API:`, data);

            if (data.orders && data.orders.length > 0) {
                allOrders = allOrders.concat(data.orders);
            } else {
                console.warn("Nenhum dado foi retornado pela API.");
            }

        } catch (error) {
            console.error(`Erro ao acessar a API:`, error.response ? error.response.status : error.message);
        }
    }

    return allOrders;
}

app.get('/', async (req, res) => {
    const orders = await fetchOrdersFromMultipleApis();

    const kanbanData = {
        'Cozinha': orders.filter(order => !order.readyDate),
        'Pronto': orders.filter(order => order.readyDate && !order.collectedDate),
        'A caminho': orders.filter(order => order.collectedDate && !order.closedDate),
        'Entregue': orders.filter(order => order.closedDate),
        'Cancelado': orders.filter(order => order.status === 'cancelled')
    };

    res.render('kanban', { kanbanData });
});

app.get('/order/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    const orders = await fetchOrdersFromMultipleApis();
    const order = orders.find(order => order.id === orderId);

    res.render('order_details', { order });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
