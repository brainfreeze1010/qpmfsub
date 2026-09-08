const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
]

function twoDigits(n) {
  if (n < 20) return ones[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return tens[t] + (o ? '-' + ones[o] : '')
}

function threeDigits(n) {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const remainder = n % 100
  let result = ''
  if (h > 0) {
    result += ones[h] + ' Hundred'
    if (remainder > 0) result += ' '
  }
  if (remainder > 0) {
    result += twoDigits(remainder)
  }
  return result
}

/**
 * Converts a numeric amount to Indian English words.
 * E.g., 523450 → "Rupees Five Lakh Twenty-Three Thousand Four Hundred Fifty Only"
 */
export function amountToWords(amount) {
  if (!amount && amount !== 0) return ''

  const num = parseFloat(amount)
  if (isNaN(num)) return ''
  if (num === 0) return 'Rupees Zero Only'

  const isNegative = num < 0
  let n = Math.abs(Math.round(num))

  const crore = Math.floor(n / 10000000)
  n = n % 10000000
  const lakh = Math.floor(n / 100000)
  n = n % 100000
  const thousand = Math.floor(n / 1000)
  n = n % 1000
  const hundred = Math.floor(n / 100)
  const rem = n % 100

  const parts = []

  if (crore > 0) parts.push(threeDigits(crore) + ' Crore')
  if (lakh > 0) parts.push(twoDigits(lakh) + ' Lakh')
  if (thousand > 0) parts.push(twoDigits(thousand) + ' Thousand')
  if (hundred > 0) parts.push(ones[hundred] + ' Hundred')
  if (rem > 0) parts.push(twoDigits(rem))

  const words = parts.join(' ')
  const prefix = isNegative ? 'Minus ' : ''
  return `Rupees ${prefix}${words} Only`
}

export default amountToWords
