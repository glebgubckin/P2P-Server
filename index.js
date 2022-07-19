const axios = require('axios')
const express = require('express')
const cors = require('cors')

const app = express()

const minusOne = price => {
  const stringNumber = String(price).split('.').length === 1 
                       ? String(price).split('.').join('') + '00'
                       : String(price).split('.').join('')
  const digitsAfterDot = String(price).split('.')[1]?.length || 2
  if (stringNumber[0] === '0') {
    return ((price * 1000000) - 1) / 1000000
  }
  return (Number(stringNumber - 1) / 10 ** (digitsAfterDot))
}

app.use(cors())

const getP2P = async (amount) => {
  const tickers = ['USDT', 'BTC', 'BUSD', 'BNB', 'ETH', 'RUB', 'SHIB']
  const payMethods = ['Tinkoff', 'RosBank', 'YandexMoney', 'QIWI']

  const P2PData = []
  for (let i = 0; i < tickers.length; i++) {
    const baseData = []
    for (let j = 0; j < payMethods.length; j++) {
      let data = await axios.post('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
        "asset": tickers[i],
        "fiat": "RUB",
        "merchantCheck": false,
        "page": 1,
        "payTypes": [payMethods[j]],
        "publisherType": null,
        "rows": 1,
        "tradeType": "BUY",
        "transAmount":  `${amount}`
      })
      .then(res => {
        baseData.push(
          {
            method: payMethods[j], 
            price: Number(res.data.data[0].adv.price),
            minPrice: minusOne(res.data.data[0].adv.price)
          }
        )
      })
    }
    P2PData.push({ticker: tickers[i], data: baseData})
  }
  return (P2PData)
}

const getMarket = async () => {
  const result = await axios.get('https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","BUSDUSDT","BNBUSDT","ETHUSDT","USDTRUB","SHIBUSDT","BTCBUSD","BNBBTC","BTCRUB","BNBBUSD","ETHBUSD","BUSDRUB","SHIBBUSD","BNBETH","BNBRUB","ETHRUB"]')
  const data = {}
  result.data.forEach(el => data[el.symbol] = Number(el.price))
  return data
}

let currentP2P
let currentP2P1000
let marketPrice

const getMarketPrice = new Promise(async (res, rej) => {
  const data = await getMarket()
  res(data)
})
  .then(data => marketPrice = data)

const getP2PData = new Promise(async (res, rej) => {
  const data = await getP2P(0)
  res(data)
})
  .then(data => currentP2P = data)

const getP2PData1000 = new Promise(async (res, rej) => {
  const data = await getP2P(1000)
  res(data)
})
  .then(data => currentP2P1000 = data)

Promise.all([getMarketPrice, getP2PData, getP2PData1000])
  .then(() => console.log('Data has been loaded'))

setInterval(() => {
  const getP2PData = new Promise(async (res, rej) => {
    const data = await getP2P(0)
    res(data)
  })
    .then(data => currentP2P = data)
  
  const getP2PData1000 = new Promise(async (res, rej) => {
    const data = await getP2P(1000)
    res(data)
  })
    .then(data => currentP2P1000 = data)
  const getMarketPrice = new Promise(async (res, rej) => {
    const data = await getMarket()
    res(data)
  })
    .then(data => marketPrice = data)
  Promise.all([getMarketPrice, getP2PData, getP2PData1000])
    .then(() => console.log('Data has been updated'))
}, 180000)

app.get('/', async (req, res) => {
  res.send(currentP2P)
})

app.get('/minThousand', async (req, res) => {
  res.send(currentP2P1000)
})

app.get('/market', (req, res) => {
  res.send(marketPrice)
})

app.listen(3500, () => console.log('Server started on port 3500'))