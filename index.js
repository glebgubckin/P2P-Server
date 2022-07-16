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
    const priceWithouZero = Number(price.split('').filter(n => n !== '.' && n !== '0').join(''))
    return Number(priceWithouZero - 1) / 10 ** digitsAfterDot
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

let currentP2P
let currentP2P1000

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
}, 180000)

app.get('/', async (req, res) => {
  res.send(currentP2P)
})

app.get('/minThousand', async (req, res) => {
  res.send(currentP2P1000)
})

app.get('/market', (req, res) => {
  axios.get('https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","BUSDUSDT","BNBUSDT","ETHUSDT","USDTRUB","SHIBUSDT","BTCBUSD","BNBBTC","BTCRUB","BNBBUSD","ETHBUSD","BUSDRUB","SHIBBUSD","BNBETH","BNBRUB","ETHRUB"]')
    .then(result => {
      const usdt = result.data.slice(0, 6)
      const btc = result.data.slice(6, 9)
      const busd = result.data.slice(9, 13)
      const bnb = result.data.slice(13, 15)
      const eth = result.data.slice(result.data.length - 1)
      res.send([
        { ticker: 'USDT', data: usdt },
        { ticker: 'BTC', data: btc },
        { ticker: 'BUSD', data: busd },
        { ticker: 'BNB', data: bnb },
        { ticker: 'ETH', data: eth },
      ])
    })
})

app.listen(3500, () => console.log('Server started on port 3500'))