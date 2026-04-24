const initialProducts = [
  { code: 'PRD-0001', name: 'AsterBook 14', category: 'Ultrabook', stock: 12, cost: 8500000, margin: 18 },
  { code: 'PRD-0002', name: 'Volt G15', category: 'Gaming', stock: 8, cost: 11200000, margin: 22 },
  { code: 'PRD-0003', name: 'NovaPad X', category: '2-in-1', stock: 5, cost: 9800000, margin: 20 },
]

const initialTransactions = [
  { code: 'TRX-0001', date: '2026-04-21', product: 'AsterBook 14', type: 'Cash', total: 10030000 },
  { code: 'TRX-0002', date: '2026-04-22', product: 'Volt G15', type: 'Kredit', total: 13664000 },
  { code: 'TRX-0003', date: '2026-04-23', product: 'NovaPad X', type: 'Kredit', total: 11760000 },
]

function delay(ms = 250) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function fetchInitialData() {
  await delay(350)
  return {
    products: initialProducts,
    transactions: initialTransactions,
  }
}

export async function persistProduct(payload) {
  await delay()
  return payload
}

export async function removeProduct() {
  await delay()
}

export async function persistTransaction(payload) {
  await delay()
  return payload
}
