import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  fetchInitialData,
  persistProduct,
  persistTransaction,
  removeProduct,
} from './fakeApi'

const flowSteps = [
  {
    id: 'product',
    title: '1. Master Produk',
    goal: 'Kelola data produk dengan CRUD dan validasi.',
    screens: ['Form produk', 'Upload gambar produk', 'Data grid + pencarian'],
    keyActions: ['Auto kode PRD-000X', 'Hitung harga jual otomatis', 'Save/Edit/Hapus'],
  },
  {
    id: 'transaction',
    title: '2. Transaksi Penjualan',
    goal: 'Simulasikan transaksi cash dan kredit.',
    screens: ['Form transaksi', 'Jenis pembayaran', 'Ringkasan cicilan'],
    keyActions: ['Auto kode TRX-000X', 'Validasi DP/tenor/gaji', 'Hitung angsuran'],
  },
  {
    id: 'monitoring',
    title: '3. Monitoring & Laporan',
    goal: 'Lihat hasil transaksi lewat filter tanggal dan statistik.',
    screens: ['Filter tanggal', 'Data grid transaksi', 'Summary total data'],
    keyActions: ['Cari per nama produk', 'Filter rentang tanggal', 'Cek keuntungan'],
  },
]

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function computeSellPrice(cost, margin) {
  return toNumber(cost) + (toNumber(cost) * toNumber(margin)) / 100
}

function getNextCode(prefix, rows) {
  if (rows.length === 0) {
    return `${prefix}-0001`
  }

  const maxValue = rows.reduce((max, row) => {
    const numberPart = Number(row.code.split('-')[1])
    return Number.isFinite(numberPart) && numberPart > max ? numberPart : max
  }, 0)

  return `${prefix}-${String(maxValue + 1).padStart(4, '0')}`
}

function formatMoney(value) {
  return currency.format(toNumber(value))
}

function App() {
  const [activeStep, setActiveStep] = useState(0)
  const [products, setProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [selectedProductCode, setSelectedProductCode] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [monitorKeyword, setMonitorKeyword] = useState('')
  const [monitorStartDate, setMonitorStartDate] = useState('')
  const [monitorEndDate, setMonitorEndDate] = useState('')
  const [productErrors, setProductErrors] = useState({})
  const [transactionErrors, setTransactionErrors] = useState({})
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Ultrabook',
    stock: '0',
    cost: '0',
    margin: '15',
  })
  const [transactionForm, setTransactionForm] = useState({
    date: '2026-04-24',
    productCode: '',
    paymentType: 'Cash',
    salary: '6000000',
    downPayment: '0',
    tenor: '12',
    interest: '8',
  })

  useEffect(() => {
    async function loadData() {
      const initialData = await fetchInitialData()
      setProducts(initialData.products)
      setTransactions(initialData.transactions)
      setTransactionForm((prev) => ({
        ...prev,
        productCode: initialData.products[0]?.code ?? '',
      }))
      setIsLoading(false)
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!selectedProductCode) {
      return
    }
    const selected = products.find((product) => product.code === selectedProductCode)
    if (!selected) {
      return
    }
    setProductForm({
      name: selected.name,
      category: selected.category,
      stock: String(selected.stock),
      cost: String(selected.cost),
      margin: String(selected.margin),
    })
    setProductErrors({})
  }, [selectedProductCode, products])

  const step = flowSteps[activeStep]
  const nextProductCode = useMemo(() => getNextCode('PRD', products), [products])
  const nextTransactionCode = useMemo(() => getNextCode('TRX', transactions), [transactions])
  const sellPrice = useMemo(
    () => computeSellPrice(productForm.cost, productForm.margin),
    [productForm.cost, productForm.margin],
  )
  const activeTransactionProduct = useMemo(
    () => products.find((product) => product.code === transactionForm.productCode),
    [products, transactionForm.productCode],
  )
  const transactionPreview = useMemo(() => {
    if (!activeTransactionProduct) {
      return { total: 0, installment: 0 }
    }
    const basePrice = computeSellPrice(activeTransactionProduct.cost, activeTransactionProduct.margin)
    if (transactionForm.paymentType === 'Cash') {
      return { total: basePrice, installment: 0 }
    }

    const interest = toNumber(transactionForm.interest)
    const tenor = toNumber(transactionForm.tenor)
    const downPayment = toNumber(transactionForm.downPayment)
    const grossTotal = basePrice + (basePrice * interest) / 100
    const remaining = Math.max(grossTotal - downPayment, 0)
    return {
      total: grossTotal,
      installment: tenor > 0 ? remaining / tenor : 0,
    }
  }, [
    activeTransactionProduct,
    transactionForm.paymentType,
    transactionForm.interest,
    transactionForm.tenor,
    transactionForm.downPayment,
  ])

  const filteredProducts = useMemo(() => {
    const keyword = productSearch.trim().toLowerCase()
    if (!keyword) {
      return products
    }
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) || product.code.toLowerCase().includes(keyword),
    )
  }, [products, productSearch])

  const monitoredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchKeyword = monitorKeyword
        ? item.product.toLowerCase().includes(monitorKeyword.toLowerCase())
        : true
      const matchStart = monitorStartDate ? item.date >= monitorStartDate : true
      const matchEnd = monitorEndDate ? item.date <= monitorEndDate : true
      return matchKeyword && matchStart && matchEnd
    })
  }, [transactions, monitorKeyword, monitorStartDate, monitorEndDate])

  const monitoringSummary = useMemo(() => {
    return monitoredTransactions.reduce(
      (acc, item) => {
        const product = products.find((row) => row.name === item.product)
        const profit = product ? item.total - product.cost : 0
        return {
          count: acc.count + 1,
          revenue: acc.revenue + item.total,
          profit: acc.profit + profit,
        }
      },
      { count: 0, revenue: 0, profit: 0 },
    )
  }, [monitoredTransactions, products])

  function validateProduct() {
    const errors = {}
    if (!productForm.name.trim()) {
      errors.name = 'Nama produk wajib diisi.'
    }
    if (!productForm.category.trim()) {
      errors.category = 'Kategori wajib dipilih.'
    }
    if (toNumber(productForm.stock) < 0) {
      errors.stock = 'Stok tidak boleh negatif.'
    }
    if (toNumber(productForm.cost) <= 0) {
      errors.cost = 'Harga modal harus lebih dari 0.'
    }
    if (toNumber(productForm.margin) < 0) {
      errors.margin = 'Margin tidak boleh negatif.'
    }
    return errors
  }

  function validateTransaction() {
    const errors = {}
    if (!transactionForm.date) {
      errors.date = 'Tanggal transaksi wajib diisi.'
    }
    if (!transactionForm.productCode) {
      errors.productCode = 'Produk wajib dipilih.'
    }
    if (transactionForm.paymentType === 'Kredit') {
      if (toNumber(transactionForm.salary) <= 0) {
        errors.salary = 'Gaji harus lebih dari 0.'
      }
      if (toNumber(transactionForm.downPayment) < 0) {
        errors.downPayment = 'DP tidak boleh negatif.'
      }
      if (toNumber(transactionForm.tenor) <= 0) {
        errors.tenor = 'Tenor harus lebih dari 0.'
      }
      if (toNumber(transactionForm.interest) < 0) {
        errors.interest = 'Bunga tidak boleh negatif.'
      }
      if (transactionPreview.installment > toNumber(transactionForm.salary)) {
        errors.installment = 'Angsuran melebihi gaji yang diinput.'
      }
    }
    return errors
  }

  function resetProductForm() {
    setSelectedProductCode('')
    setProductForm({
      name: '',
      category: 'Ultrabook',
      stock: '0',
      cost: '0',
      margin: '15',
    })
    setProductErrors({})
  }

  async function handleCreateProduct() {
    const errors = validateProduct()
    setProductErrors(errors)
    if (Object.keys(errors).length > 0) {
      setNotice('Validasi gagal: cek field produk.')
      return
    }
    const payload = {
      code: nextProductCode,
      name: productForm.name.trim(),
      category: productForm.category,
      stock: toNumber(productForm.stock),
      cost: toNumber(productForm.cost),
      margin: toNumber(productForm.margin),
    }
    setIsSaving(true)
    const saved = await persistProduct(payload)
    setProducts((prev) => [...prev, saved])
    setNotice(`Produk ${saved.code} berhasil disimpan.`)
    setIsSaving(false)
    resetProductForm()
  }

  async function handleEditProduct() {
    if (!selectedProductCode) {
      setNotice('Pilih data grid dulu sebelum edit.')
      return
    }
    const errors = validateProduct()
    setProductErrors(errors)
    if (Object.keys(errors).length > 0) {
      setNotice('Validasi gagal: perubahan belum disimpan.')
      return
    }
    const payload = {
      code: selectedProductCode,
      name: productForm.name.trim(),
      category: productForm.category,
      stock: toNumber(productForm.stock),
      cost: toNumber(productForm.cost),
      margin: toNumber(productForm.margin),
    }
    setIsSaving(true)
    const updated = await persistProduct(payload)
    setProducts((prev) => prev.map((item) => (item.code === updated.code ? updated : item)))
    setNotice(`Produk ${updated.code} berhasil diperbarui.`)
    setIsSaving(false)
  }

  async function handleDeleteProduct() {
    if (!selectedProductCode) {
      setNotice('Pilih data yang akan dihapus terlebih dahulu.')
      return
    }
    const confirmed = window.confirm(`Hapus produk ${selectedProductCode}?`)
    if (!confirmed) {
      return
    }
    setIsSaving(true)
    await removeProduct(selectedProductCode)
    setProducts((prev) => prev.filter((item) => item.code !== selectedProductCode))
    setNotice(`Produk ${selectedProductCode} dihapus.`)
    setIsSaving(false)
    resetProductForm()
  }

  async function handleCreateTransaction() {
    const errors = validateTransaction()
    setTransactionErrors(errors)
    if (Object.keys(errors).length > 0) {
      setNotice('Validasi transaksi gagal, cek data kredit/cash.')
      return
    }
    const selectedProduct = products.find((product) => product.code === transactionForm.productCode)
    if (!selectedProduct) {
      setNotice('Produk transaksi tidak ditemukan.')
      return
    }
    const payload = {
      code: nextTransactionCode,
      date: transactionForm.date,
      product: selectedProduct.name,
      type: transactionForm.paymentType,
      total: Math.round(transactionPreview.total),
    }
    setIsSaving(true)
    const saved = await persistTransaction(payload)
    setTransactions((prev) => [...prev, saved])
    setIsSaving(false)
    setNotice(`Transaksi ${saved.code} berhasil dibuat.`)
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <h1>TechStore UX Flow</h1>
        <p className="subtitle">Visualisasi alur studi kasus lomba (dummy data).</p>
        <div className="step-list">
          {flowSteps.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={`step-item ${index === activeStep ? 'active' : ''}`}
              onClick={() => setActiveStep(index)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </aside>

      <section className="content">
        {notice ? <p className="notice">{notice}</p> : null}

        <header className="panel">
          <span className="pill">Tujuan Step</span>
          <h2>{step.title}</h2>
          <p>{step.goal}</p>
          <div className="two-col">
            <div>
              <h3>Screen utama</h3>
              <ul>
                {step.screens.map((screen) => (
                  <li key={screen}>{screen}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Aksi pengguna</h3>
              <ul>
                {step.keyActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        {step.id === 'product' ? (
          <article className="panel">
          <h3>Master Produk (CRUD + Validasi)</h3>
          <p className="inline-help">Kode otomatis berikutnya: <strong>{nextProductCode}</strong></p>
          <div className="cards">
            <section className="card">
              <div className="field-grid">
                <label>
                  Nama Produk
                  <input
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  {productErrors.name ? <span className="error">{productErrors.name}</span> : null}
                </label>
                <label>
                  Kategori
                  <select
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                  >
                    <option>Ultrabook</option>
                    <option>Gaming</option>
                    <option>2-in-1</option>
                    <option>Business</option>
                  </select>
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, stock: event.target.value }))
                    }
                  />
                  {productErrors.stock ? <span className="error">{productErrors.stock}</span> : null}
                </label>
                <label>
                  Harga Modal
                  <input
                    type="number"
                    value={productForm.cost}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, cost: event.target.value }))
                    }
                  />
                  {productErrors.cost ? <span className="error">{productErrors.cost}</span> : null}
                </label>
                <label>
                  Margin %
                  <input
                    type="number"
                    value={productForm.margin}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, margin: event.target.value }))
                    }
                  />
                  {productErrors.margin ? <span className="error">{productErrors.margin}</span> : null}
                </label>
                <label>
                  Harga Jual (auto)
                  <input value={formatMoney(sellPrice)} readOnly />
                </label>
              </div>
              <div className="state-row">
                <span className={`tag ${!selectedProductCode ? 'enabled' : ''}`}>Save</span>
                <span className={`tag ${selectedProductCode ? 'enabled' : ''}`}>Edit</span>
                <span className={`tag ${selectedProductCode ? 'enabled' : ''}`}>Hapus</span>
              </div>
              <div className="toolbar">
                <button type="button" onClick={handleCreateProduct} disabled={isSaving || !!selectedProductCode}>
                  Save
                </button>
                <button type="button" onClick={handleEditProduct} disabled={isSaving || !selectedProductCode}>
                  Edit
                </button>
                <button type="button" onClick={handleDeleteProduct} disabled={isSaving || !selectedProductCode}>
                  Hapus
                </button>
                <button type="button" onClick={resetProductForm} disabled={isSaving}>
                  Reset
                </button>
              </div>
            </section>

            <section className="card">
              <label>
                Pencarian Produk
                <input
                  placeholder="Cari berdasarkan kode / nama"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                />
              </label>
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Kategori</th>
                    <th>Harga Jual</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.code}
                      className={selectedProductCode === product.code ? 'selected-row' : ''}
                      onClick={() => setSelectedProductCode(product.code)}
                    >
                      <td>{product.code}</td>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{formatMoney(computeSellPrice(product.cost, product.margin))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          </article>
        ) : null}

        {step.id === 'transaction' ? (
          <article className="panel">
          <h3>Transaksi Cash/Kredit</h3>
          <p className="inline-help">Kode otomatis berikutnya: <strong>{nextTransactionCode}</strong></p>
          <div className="cards">
            <section className="card">
              <div className="field-grid">
                <label>
                  Tanggal
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, date: event.target.value }))
                    }
                  />
                  {transactionErrors.date ? <span className="error">{transactionErrors.date}</span> : null}
                </label>
                <label>
                  Produk
                  <select
                    value={transactionForm.productCode}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, productCode: event.target.value }))
                    }
                  >
                    {products.map((product) => (
                      <option key={product.code} value={product.code}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jenis Pembayaran
                  <select
                    value={transactionForm.paymentType}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, paymentType: event.target.value }))
                    }
                  >
                    <option>Cash</option>
                    <option>Kredit</option>
                  </select>
                </label>
                <label>
                  Gaji / bulan
                  <input
                    type="number"
                    value={transactionForm.salary}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, salary: event.target.value }))
                    }
                    disabled={transactionForm.paymentType === 'Cash'}
                  />
                  {transactionErrors.salary ? <span className="error">{transactionErrors.salary}</span> : null}
                </label>
                <label>
                  DP
                  <input
                    type="number"
                    value={transactionForm.downPayment}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, downPayment: event.target.value }))
                    }
                    disabled={transactionForm.paymentType === 'Cash'}
                  />
                  {transactionErrors.downPayment ? (
                    <span className="error">{transactionErrors.downPayment}</span>
                  ) : null}
                </label>
                <label>
                  Tenor (bulan)
                  <input
                    type="number"
                    value={transactionForm.tenor}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, tenor: event.target.value }))
                    }
                    disabled={transactionForm.paymentType === 'Cash'}
                  />
                  {transactionErrors.tenor ? <span className="error">{transactionErrors.tenor}</span> : null}
                </label>
                <label>
                  Bunga %
                  <input
                    type="number"
                    value={transactionForm.interest}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, interest: event.target.value }))
                    }
                    disabled={transactionForm.paymentType === 'Cash'}
                  />
                  {transactionErrors.interest ? <span className="error">{transactionErrors.interest}</span> : null}
                </label>
              </div>
              <p className="validation-note">
                Total: <strong>{formatMoney(transactionPreview.total)}</strong> | Angsuran: <strong>{formatMoney(transactionPreview.installment)}</strong> / bulan | Gaji: <strong>{formatMoney(transactionForm.salary)}</strong>.
              </p>
              {transactionErrors.installment ? (
                <p className="error block-error">{transactionErrors.installment}</p>
              ) : null}
              <div className="toolbar">
                <button type="button" onClick={handleCreateTransaction} disabled={isSaving || isLoading}>
                  Simpan Transaksi
                </button>
              </div>
            </section>

            <section className="card">
              <h4>Data Transaksi</h4>
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Tanggal</th>
                    <th>Produk</th>
                    <th>Tipe</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row) => (
                    <tr key={row.code}>
                      <td>{row.code}</td>
                      <td>{row.date}</td>
                      <td>{row.product}</td>
                      <td>{row.type}</td>
                      <td>{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          </article>
        ) : null}

        {step.id === 'monitoring' ? (
          <article className="panel">
          <h3>Monitoring, Filter Tanggal, dan Cek Keuntungan</h3>
          <div className="cards">
            <section className="card">
              <div className="field-grid">
                <label>
                  Cari nama produk
                  <input
                    value={monitorKeyword}
                    onChange={(event) => setMonitorKeyword(event.target.value)}
                  />
                </label>
                <label>
                  Tanggal mulai
                  <input
                    type="date"
                    value={monitorStartDate}
                    onChange={(event) => setMonitorStartDate(event.target.value)}
                  />
                </label>
                <label>
                  Tanggal akhir
                  <input
                    type="date"
                    value={monitorEndDate}
                    onChange={(event) => setMonitorEndDate(event.target.value)}
                  />
                </label>
              </div>
              <div className="state-row">
                <span className="tag enabled">Total data: {monitoringSummary.count}</span>
                <span className="tag">Pendapatan: {formatMoney(monitoringSummary.revenue)}</span>
                <span className="tag">Estimasi untung: {formatMoney(monitoringSummary.profit)}</span>
              </div>
            </section>
            <section className="card">
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Tanggal</th>
                    <th>Produk</th>
                    <th>Tipe</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoredTransactions.map((row) => (
                    <tr key={row.code}>
                      <td>{row.code}</td>
                      <td>{row.date}</td>
                      <td>{row.product}</td>
                      <td>{row.type}</td>
                      <td>{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          </article>
        ) : null}

        <footer className="step-controls">
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
            disabled={activeStep === 0}
          >
            Step Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.min(prev + 1, flowSteps.length - 1))}
            disabled={activeStep === flowSteps.length - 1}
          >
            Step Berikutnya
          </button>
        </footer>
      </section>
    </main>
  )
}

export default App
